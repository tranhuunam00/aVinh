const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// All routes in this file strictly require Super Admin
router.use(requireAuth, requireAdmin);

// GET /api/users - List all users
router.get('/', async (req, res) => {
    try {
        const users = await all(`
            SELECT id, username, full_name, role, facility, department, is_active, created_at, updated_at
            FROM users
            ORDER BY role ASC, department ASC, username ASC
        `);
        return res.json({ users });
    } catch (err) {
        console.error('Fetch users error:', err);
        return res.status(500).json({ error: 'Lỗi khi tải danh sách người dùng.' });
    }
});

// POST /api/users - Create new department user (Admin only)
router.post('/', async (req, res) => {
    try {
        const { username, password, full_name, facility, department, role } = req.body;

        if (!username || !password || !full_name) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên đăng nhập, mật khẩu và họ tên' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Mật khẩu phải có tối thiểu 8 ký tự để đảm bảo bảo mật' });
        }

        const existing = await get("SELECT id FROM users WHERE username = ?", [username.trim()]);
        if (existing) {
            return res.status(400).json({ error: `Tên đăng nhập "${username}" đã tồn tại trên hệ thống` });
        }

        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync(password, salt);
        const now = new Date().toISOString();

        const userRole = role === 'admin' ? 'admin' : 'department';
        const userFacility = facility || 'Bệnh viện';
        const userDept = department || 'Khám bệnh';

        const result = await run(`
            INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [username.trim(), passHash, full_name.trim(), userRole, userFacility, userDept, now, now]);

        return res.status(201).json({
            success: true,
            message: `Đã tạo thành công tài khoản "${username}" cho ${userDept} (${userFacility})`,
            userId: result.id
        });
    } catch (err) {
        console.error('Create user error:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ khi tạo tài khoản.' });
    }
});

// PUT /api/users/:id - Update user details & role & optional new password
router.put('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { full_name, facility, department, role, is_active, new_password } = req.body;

        const targetUser = await get("SELECT * FROM users WHERE id = ?", [userId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }

        const now = new Date().toISOString();
        let passHash = targetUser.password_hash;
        if (new_password && new_password.trim().length >= 8) {
            const salt = bcrypt.genSaltSync(10);
            passHash = bcrypt.hashSync(new_password.trim(), salt);
        } else if (new_password && new_password.trim().length > 0 && new_password.trim().length < 8) {
            return res.status(400).json({ error: 'Mật khẩu mới nếu đổi phải có tối thiểu 8 ký tự!' });
        }

        // Do not demote default admin
        let userRole = targetUser.role;
        if (role && targetUser.username !== 'admin') {
            userRole = role;
        }

        await run(`
            UPDATE users
            SET full_name = ?, facility = ?, department = ?, role = ?, password_hash = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `, [
            full_name !== undefined ? full_name.trim() : targetUser.full_name,
            facility !== undefined ? facility : targetUser.facility,
            department !== undefined ? department : targetUser.department,
            userRole,
            passHash,
            is_active !== undefined ? is_active : targetUser.is_active,
            now,
            userId
        ]);

        return res.json({ success: true, message: `Đã cập nhật thông tin tài khoản "${targetUser.username}" thành công!` });
    } catch (err) {
        console.error('Update user error:', err);
        return res.status(500).json({ error: 'Lỗi khi cập nhật người dùng.' });
    }
});

// POST /api/users/:id/reset-password - Admin resets department user password
router.post('/:id/reset-password', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { new_password } = req.body;

        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 8 ký tự' });
        }

        const targetUser = await get("SELECT * FROM users WHERE id = ?", [userId]);
        if (!targetUser) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }

        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync(new_password, salt);
        const now = new Date().toISOString();

        await run("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [passHash, now, userId]);

        return res.json({
            success: true,
            message: `Đã đặt lại mật khẩu cho tài khoản "${targetUser.username}" thành công!`
        });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Lỗi khi đặt lại mật khẩu.' });
    }
});

// DELETE /api/users/:id - Delete user (cannot delete main admin)
router.delete('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const targetUser = await get("SELECT * FROM users WHERE id = ?", [userId]);

        if (!targetUser) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }

        if (targetUser.username === 'admin') {
            return res.status(400).json({ error: 'Không thể xóa tài khoản Super Admin mặc định của hệ thống!' });
        }

        await run("DELETE FROM users WHERE id = ?", [userId]);
        return res.json({ success: true, message: `Đã xóa tài khoản "${targetUser.username}"` });
    } catch (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ error: 'Lỗi khi xóa tài khoản người dùng.' });
    }
});

module.exports = router;
