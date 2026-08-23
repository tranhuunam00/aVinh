const express = require('express');
const path = require('path');
const cors = require('cors');
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve Static Frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Database & Start Server
async function startServer() {
    try {
        console.log('⏳ Đang khởi tạo cơ sở dữ liệu SQLite...');
        await initDatabase();

        app.listen(PORT, '0.0.0.0', () => {
            console.log('========================================================================');
            console.log(' 🏥 HỆ THỐNG BÁO CÁO GIAO BAN NGÀY - BỆNH VIỆN ĐKQT VINMEC OCP2');
            console.log(` 🚀 Server Node.js đang chạy tại: http://localhost:${PORT}`);
            console.log(` 🌐 Mạng nội bộ (LAN): http://<IP_MÁY_BẠN>:${PORT}`);
            console.log(' 👑 Tài khoản SUPER ADMIN: username=admin | password=Vinmec@2026');
            console.log('========================================================================');
        });
    } catch (err) {
        console.error('❌ Lỗi khởi động server:', err);
        process.exit(1);
    }
}

startServer();
