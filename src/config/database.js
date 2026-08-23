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

    // Ensure 3 standard facilities always exist
    const now = new Date().toISOString();
    const defaultFacilities = [
        { name: 'BV VMOCP2', desc: 'Bệnh Viện Đa Khoa Quốc Tế Vinmec Ocean Park 2' },
        { name: 'PK OCP1', desc: 'Phòng khám Đa Khoa Quốc Tế Vinmec Ocean Park 1' },
        { name: 'PK OCP2', desc: 'Phòng khám Đa Khoa Quốc Tế Vinmec Ocean Park 2' }
    ];
    for (const f of defaultFacilities) {
        await run("INSERT OR IGNORE INTO facilities (name, description, created_at) VALUES (?, ?, ?)", [f.name, f.desc, now]);
    }

    // 5. Seed Super Admin (1 Admin duy nhất ban đầu)
    const existingAdmin = await get("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
    if (!existingAdmin) {
        const salt = bcrypt.genSaltSync(10);
        const adminHash = bcrypt.hashSync('Vinmec@2026', salt);
        
        await run(`
            INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, ['admin', adminHash, 'Quản Trị Viên Hệ Thống (Admin)', 'admin', 'ALL', 'ALL', 1, now, now]);
        
        console.log('👑 Đã tạo tài khoản SUPER ADMIN mặc định: username=admin | password=Vinmec@2026');
    }

    // 6. Cập nhật & Khởi tạo chuẩn 17 Tài Khoản Khoa (baocao_tenkhoa) nếu chưa có
    const officialDeptAccounts = [
        { username: 'baocao_capcuu', name: 'Khoa Cấp Cứu', dept: 'Cấp cứu', facility: 'ALL' },
        { username: 'baocao_khambenh', name: 'Khoa Khám Bệnh', dept: 'Khám bệnh', facility: 'ALL' },
        { username: 'baocao_ranghammat', name: 'Khoa Răng Hàm Mặt', dept: 'Răng hàm mặt', facility: 'ALL' },
        { username: 'baocao_taimuihong', name: 'Khoa Tai Mũi Họng', dept: 'Tai mũi họng', facility: 'ALL' },
        { username: 'baocao_nhankhoa', name: 'Khoa Nhãn Khoa', dept: 'Nhãn khoa', facility: 'ALL' },
        { username: 'baocao_dalieu', name: 'Khoa Da Liễu', dept: 'Da liễu', facility: 'ALL' },
        { username: 'baocao_vaccine', name: 'Khoa Vaccine', dept: 'Vaccine', facility: 'ALL' },
        { username: 'baocao_noi', name: 'Khoa Nội Tổng Hợp', dept: 'Nội tổng hợp', facility: 'ALL' },
        { username: 'baocao_ngoai', name: 'Khoa Ngoại Tổng Hợp', dept: 'Ngoại tổng hợp', facility: 'ALL' },
        { username: 'baocao_ctch', name: 'Khoa Chấn Thương Chỉnh Hình', dept: 'Chấn thương chỉnh hình', facility: 'ALL' },
        { username: 'baocao_tkcs', name: 'Khoa Thần Kinh Cột Sống', dept: 'Thần kinh cột sống', facility: 'ALL' },
        { username: 'baocao_phcn', name: 'Khoa Phục Hồi Chức Năng', dept: 'Phục hồi chức năng', facility: 'ALL' },
        { username: 'baocao_san', name: 'Khoa Phụ Sản', dept: 'Phụ sản', facility: 'ALL' },
        { username: 'baocao_nhi', name: 'Khoa Nhi Sơ Sinh', dept: 'Nhi sơ sinh', facility: 'ALL' },
        { username: 'baocao_xetnghiem', name: 'Khoa Xét Nghiệm', dept: 'Xét nghiệm', facility: 'ALL' },
        { username: 'baocao_cdha', name: 'Khoa Chẩn Đoán Hình Ảnh', dept: 'Chẩn đoán hình ảnh', facility: 'ALL' },
        { username: 'baocao_dqct', name: 'Khoa Điện Quang Can Thiệp', dept: 'Điện quang can thiệp', facility: 'ALL' }
    ];

    const salt = bcrypt.genSaltSync(10);
    const defaultDeptPassHash = bcrypt.hashSync('Vinmec@2026', salt);

    for (const d of officialDeptAccounts) {
        const existingUser = await get("SELECT id FROM users WHERE username = ?", [d.username]);
        if (!existingUser) {
            await run(`
                INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 'department', ?, ?, 1, ?, ?)
            `, [d.username, defaultDeptPassHash, d.name, d.facility, d.dept, now, now]);
        }
    }
}

module.exports = {
    db,
    run,
    get,
    all,
    initDatabase
};
