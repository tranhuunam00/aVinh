const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { get, run } = require('../config/database');
const { generateToken, requireAuth } = require('../middleware/auth');

// Brute-force Login Protection (Tối đa 5 lần thử trong 15 phút / IP)
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.AUTH_LOGIN_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.AUTH_LOGIN_MAX_ATTEMPTS) || 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ 15 phút trước khi thử lại.' }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
        }

        const user = await get("SELECT * FROM users WHERE username = ?", [username.trim()]);
        if (!user) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        if (user.is_active !== 1) {
            return res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để mở khóa.' });
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
        }

        const token = generateToken(user);

        // Set HttpOnly secure cookie (Chống XSS đánh cắp Token, hạn 12h)
        res.cookie('vinmec_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 1000 // 12 tiếng
        });

        return res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                facility: user.facility,
                department: user.department
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập. Vui lòng thử lại sau.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('vinmec_token');
    return res.json({ success: true, message: 'Đã đăng xuất an toàn khỏi hệ thống.' });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await get("SELECT id, username, full_name, role, facility, department, is_active, created_at FROM users WHERE id = ?", [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }
        return res.json({ user });
    } catch (err) {
        console.error('Get me error:', err);
        return res.status(500).json({ error: 'Lỗi khi tải thông tin người dùng.' });
    }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
        }

        if (new_password.length < 8) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 8 ký tự để đảm bảo an toàn' });
        }

        const user = await get("SELECT * FROM users WHERE id = ?", [req.user.id]);
        const isMatch = bcrypt.compareSync(current_password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
        }

        const salt = bcrypt.genSaltSync(10);
        const newHash = bcrypt.hashSync(new_password, salt);
        const now = new Date().toISOString();

        await run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [newHash, now, req.user.id]);

        return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        console.error('Change password error:', err);
        return res.status(500).json({ error: 'Lỗi khi thay đổi mật khẩu.' });
    }
});

module.exports = router;
