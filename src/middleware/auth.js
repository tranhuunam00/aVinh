const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'VINMEC_OCP2_SECRET_KEY_@2026';

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            facility: user.facility,
            department: user.department
        },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

function requireAuth(req, res, next) {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.vinmec_token) {
        token = req.cookies.vinmec_token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Từ chối truy cập. Chỉ có Super Admin mới có quyền thực hiện thao tác này.' });
    }
    next();
}

module.exports = {
    generateToken,
    requireAuth,
    requireAdmin,
    JWT_SECRET
};
