const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const MASTER_DATA = require('./masterData');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'vinmec.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Lỗi kết nối SQLite Database:', err.message);
    } else {
        console.log('✅ Đã kết nối thành công SQLite Database tại:', DB_PATH);
    }
});

// Run SQL with Promises
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Database Initialization & Migrations
async function initDatabase() {
    // 1. Enable WAL mode for high durability & concurrent performance
    await run("PRAGMA journal_mode = WAL;");

    // 2. Create Users Table
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'department', -- 'admin' hoặc 'department'
            facility TEXT NOT NULL DEFAULT 'Bệnh viện', -- 'Bệnh viện', 'PK OCP1', 'PK OCP2', 'ALL'
            department TEXT NOT NULL DEFAULT 'ALL', -- Tên chuyên khoa hoặc 'ALL' cho Admin
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    // 3. Create Daily Reports Table
    await run(`
        CREATE TABLE IF NOT EXISTS daily_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_date TEXT NOT NULL,
            facility TEXT NOT NULL,
            department TEXT NOT NULL,
            submitted_by INTEGER,
            data_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(report_date, facility, department),
            FOREIGN KEY(submitted_by) REFERENCES users(id)
        )
    `);

    // 4. Create Facilities Table
    await run(`
        CREATE TABLE IF NOT EXISTS facilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )
    `);

    // Seed default facilities if empty
    const facilityCount = await get("SELECT COUNT(*) as count FROM facilities");
    if (facilityCount.count === 0) {
        const now = new Date().toISOString();
        const defaultFacilities = [
            { name: 'Bệnh viện', desc: 'Bệnh viện Đa Khoa Quốc Tế Vinmec Ocean Park 2' },
            { name: 'PK OCP1', desc: 'Phòng khám Vinmec Ocean Park 1' },
            { name: 'PK OCP2', desc: 'Phòng khám Vinmec Ocean Park 2' }
        ];
        for (const f of defaultFacilities) {
            await run("INSERT INTO facilities (name, description, created_at) VALUES (?, ?, ?)", [f.name, f.desc, now]);
        }
        console.log('🏥 Đã khởi tạo 3 cơ sở mặc định: Bệnh viện, PK OCP1, PK OCP2');
    }

    // 5. Seed Super Admin (1 Admin duy nhất ban đầu)
    const existingAdmin = await get("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    if (!existingAdmin) {
        const salt = bcrypt.genSaltSync(10);
        const adminHash = bcrypt.hashSync('Vinmec@2026', salt);
        const now = new Date().toISOString();
        
        await run(`
            INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['admin', adminHash, 'Quản Trị Viên Hệ Thống (Admin)', 'admin', 'ALL', 'ALL', 1, now, now]);
        
        console.log('👑 Đã tạo tài khoản SUPER ADMIN mặc định: username=admin | password=Vinmec@2026');
    }

    // 5. Seed Department accounts for convenience if users count is only admin
    const userCountRow = await get("SELECT COUNT(*) as count FROM users");
    if (userCountRow.count <= 1) {
        const salt = bcrypt.genSaltSync(10);
        const now = new Date().toISOString();
        
        const defaultDepts = [
            { username: 'khoa_capcuu', name: 'Khoa Cấp Cứu', dept: 'Cấp cứu', facility: 'Bệnh viện' },
            { username: 'khoa_khambenh', name: 'Khoa Khám Bệnh', dept: 'Khám bệnh', facility: 'Bệnh viện' },
            { username: 'khoa_ngoai', name: 'Khoa Ngoại Tổng Hợp', dept: 'Ngoại tổng hợp', facility: 'Bệnh viện' },
            { username: 'khoa_san', name: 'Khoa Phụ Sản', dept: 'Phụ sản', facility: 'Bệnh viện' },
            { username: 'khoa_noi', name: 'Khoa Nội Tổng Hợp', dept: 'Nội tổng hợp', facility: 'Bệnh viện' },
            { username: 'khoa_nhisongsinh', name: 'Khoa Nhi Sơ Sinh', dept: 'Nhi sơ sinh', facility: 'Bệnh viện' },
            { username: 'khoa_cdha', name: 'Khoa Chẩn Đoán Hình Ảnh', dept: 'Chẩn đoán hình ảnh', facility: 'Bệnh viện' },
            { username: 'khoa_xetnghiem', name: 'Khoa Xét Nghiệm', dept: 'Xét nghiệm', facility: 'Bệnh viện' },
            { username: 'khoa_dqct', name: 'Khoa Điện Quang Can Thiệp', dept: 'Điện quang can thiệp', facility: 'Bệnh viện' }
        ];

        for (const d of defaultDepts) {
            const passHash = bcrypt.hashSync('123456', salt);
            await run(`
                INSERT OR IGNORE INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [d.username, passHash, d.name, 'department', d.facility, d.dept, 1, now, now]);
        }
        console.log('🏥 Đã tạo sẵn tài khoản mẫu cho các khoa (Mật khẩu mặc định: 123456)');
    }

    // 6. Seed sample reports for today if none exist
    const todayStr = new Date().toISOString().split('T')[0];
    const reportCount = await get("SELECT COUNT(*) as count FROM daily_reports WHERE report_date = ?", [todayStr]);
    if (reportCount.count === 0) {
        const now = new Date().toISOString();
        const sampleReports = [
            {
                facility: 'Bệnh viện',
                department: 'Cấp cứu',
                data: {
                    kham_benh: { "Khám cấp cứu": 32, "Khám chuyên khoa": 0 },
                    dieu_tri: { "Ngoại trú": 18, "Nội trú": 12, "Daycare": 2 },
                    dich_vu: { "Khám bệnh": 32, "Thủ thuật": 7, "Chăm sóc toàn diện": 4 },
                    tinh_trang: { "Vào viện": 12, "Ra viện theo chỉ định": 14, "Ra viện không theo chỉ định": 1, "Chuyển viện": 2, "Nặng xin về": 0, "Tử vong": 0 }
                }
            },
            {
                facility: 'Bệnh viện',
                department: 'Ngoại tổng hợp',
                data: {
                    kham_benh: { "Khám chuyên khoa": 45, "Khám tổng quát": 6 },
                    dieu_tri: { "Ngoại trú": 24, "Nội trú": 20, "Daycare": 8 },
                    dich_vu: { "Khám bệnh": 51, "Thủ thuật": 16, "Phẫu thuật": 9, "Chăm sóc toàn diện": 20 },
                    tinh_trang: { "Vào viện": 9, "Ra viện theo chỉ định": 7, "Chuyển viện": 0, "Nặng xin về": 0, "Tử vong": 0 }
                }
            },
            {
                facility: 'Bệnh viện',
                department: 'Phụ sản',
                data: {
                    kham_benh: { "Khám chuyên khoa": 38, "Khám tổng quát": 4 },
                    dieu_tri: { "Ngoại trú": 18, "Nội trú": 16, "Daycare": 4 },
                    dich_vu: { "Khám bệnh": 42, "Thủ thuật": 8, "Phẫu thuật": 5, "Chăm sóc sau sinh": 14, "Hỗ trợ sinh đẻ": 6, "Chăm sóc toàn diện": 16 },
                    tinh_trang: { "Vào viện": 6, "Ra viện theo chỉ định": 5, "Chuyển viện": 0, "Nặng xin về": 0, "Tử vong": 0 }
                }
            },
            {
                facility: 'Bệnh viện',
                department: 'Xét nghiệm',
                data: {
                    xet_nghiem: { "Sinh hóa": 165, "Huyết học": 125, "Vi sinh": 42, "Tế bào học": 15, "Mô bệnh học": 9, "Hóa mô miễn dịch": 5, "Di truyền": 3 }
                }
            },
            {
                facility: 'Bệnh viện',
                department: 'Chẩn đoán hình ảnh',
                data: {
                    cdha: { "Siêu âm": 92, "Siêu âm ABUS": 14, "XQ Tổng quát": 70, "XQ Panorama": 10, "XQ Mammo": 8, "MSCT": 20, "CBCT": 5, "MRI": 18, "DEXA": 6, "Teleradiology": 0 }
                }
            },
            {
                facility: 'Bệnh viện',
                department: 'Điện quang can thiệp',
                data: {
                    dqct: { "Can thiệp SA": 7, "Can thiệp CT": 4, "Can thiệp XA": 3 }
                }
            }
        ];

        for (const sr of sampleReports) {
            await run(`
                INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [todayStr, sr.facility, sr.department, 1, JSON.stringify(sr.data), now, now]);
        }
        console.log(`📊 Đã khởi tạo dữ liệu mẫu ngày hôm nay (${todayStr}) cho 6 khoa.`);
    }
}

module.exports = {
    db,
    run,
    get,
    all,
    initDatabase
};
