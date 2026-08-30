require('dotenv').config();
const fs = require('fs');
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('./src/config/database');

const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const reportRoutes = require('./src/routes/report.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const exportRoutes = require('./src/routes/export.routes');
const facilityRoutes = require('./src/routes/facility.routes');

const app = express();
const PORT = process.env.PORT || 4001;

// Trust first proxy when running behind reverse proxy / load balancer (Nginx)
app.set('trust proxy', 1);

// 1. Security Headers via Helmet (OWASP recommended)
app.use(helmet({
    contentSecurityPolicy: false, // Tương thích SPA tĩnh
    crossOriginEmbedderPolicy: false
}));

// 2. CORS Configuration
app.use(cors());

// 3. Request Body Limit (Chống tấn công tràn bộ nhớ DoS / Payload Buffer Overflow)
const bodyLimit = process.env.BODY_LIMIT || '1mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(cookieParser());

// 4. Global API Rate Limiting (Chống Spam & DDoS theo IP)
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
    max: parseInt(process.env.API_RATE_LIMIT_MAX) || 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Hệ thống phát hiện quá nhiều yêu cầu từ IP của bạn. Vui lòng chờ 1 phút trước khi thử lại.' }
});
app.use('/api/', apiLimiter);

// Serve Static Frontend (Support both bundled pkg snapshot and external public folder)
const staticPath = (process.pkg && fs.existsSync(path.join(path.dirname(process.execPath), 'public')))
    ? path.join(path.dirname(process.execPath), 'public')
    : path.join(__dirname, 'public');

app.use(express.static(staticPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

// Initialize Database & Start Server
const { backupDatabase } = require('./scripts/backup');

async function startServer() {
    try {
        console.log('⏳ Đang khởi tạo cơ sở dữ liệu SQLite & áp dụng bảo mật...');
        await initDatabase();

        // Tự động tạo bản sao lưu snapshot khi khởi động máy chủ
        setTimeout(() => {
            backupDatabase().catch(() => {});
        }, 5000);

        // Lập lịch tự động sao lưu định kỳ mỗi 24 giờ (1 ngày)
        setInterval(() => {
            backupDatabase().catch(() => {});
        }, 24 * 60 * 60 * 1000);

        app.listen(PORT, '0.0.0.0', () => {
            console.log('========================================================================');
            console.log(' 🏥 HỆ THỐNG BÁO CÁO GIAO BAN NGÀY - BỆNH VIỆN ĐKQT VINMEC OCP2');
            console.log(` 🚀 Server Node.js đang chạy tại: http://localhost:${PORT}`);
            console.log(` 🌐 Mạng nội bộ (LAN): http://<IP_MÁY_BẠN>:${PORT}`);
            console.log(' 🛡️ Chế độ bảo mật: Helmet Headers, Rate Limiting & Bcrypt Active');
            console.log(' 📦 Cơ chế Backup: Tự động sao lưu hàng ngày lưu tại data/backups/');
            console.log('========================================================================');
        });
    } catch (err) {
        console.error('❌ Lỗi khởi động server:', err);
        process.exit(1);
    }
}

startServer();

