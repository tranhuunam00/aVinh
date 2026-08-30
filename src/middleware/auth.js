const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'f98a23c8e4129b015389d34208aef51bc4798e3514a9c68702ef63b418a096c1';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('⚠️ [CẢNH BÁO BẢO MẬT] Chưa thiết lập JWT_SECRET trong file .env trên môi trường Production!');
}

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
        { expiresIn: JWT_EXPIRES_IN }
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
