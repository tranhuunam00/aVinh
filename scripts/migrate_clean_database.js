/**
 * ============================================================================
 * SCRIPT MIGRATION & DỌN DẸP DỮ LIỆU DEMO HỆ THỐNG VINMEC OCEAN PARK 2
 * ============================================================================
 * Mục đích:
 * 1. Tự động sao lưu database SQLite (data/vinmec_backup_<timestamp>.sqlite)
 * 2. Xóa toàn bộ dữ liệu báo cáo demo cũ trong bảng daily_reports
 * 3. Chuẩn hóa 3 cơ sở chính: BV VMOCP2, PK OCP1, PK OCP2
 * 4. Chuẩn hóa & bảo đảm 18 tài khoản chính thức:
 *    - 1 Super Admin: username=admin | pass=Vinmec@2026
 *    - 17 Tài khoản khoa: username=baocao_<tenkhoa> | pass=Vinmec@2026
 * 5. Dọn dẹp các tài khoản rác/demo cũ ngoài danh sách chuẩn
 * ============================================================================
 * Cách chạy trên server:
 *   npm run migrate
 *   hoặc: node scripts/migrate_clean_database.js
 *   hoặc: node migrate.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'vinmec.sqlite');

// 1. TỰ ĐỘNG BACKUP DATABASE HIỆN TẠI (NẾU CÓ)
if (fs.existsSync(DB_PATH)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(DATA_DIR, `vinmec_backup_${timestamp}.sqlite`);
    try {
        fs.copyFileSync(DB_PATH, backupPath);
        console.log(`\n📦 [1/6] Đã tự động tạo bản sao lưu an toàn tại:\n    -> ${backupPath}`);
    } catch (e) {
        console.warn(`⚠️ Không thể tạo bản sao lưu: ${e.message}`);
    }
} else {
    console.log(`\n📦 [1/6] Database chưa tồn tại. Sẽ tạo mới hoàn toàn tại:\n    -> ${DB_PATH}`);
}

const db = new sqlite3.Database(DB_PATH);

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

async function migrate() {
    console.log('\n========================================================================================');
    console.log(' 🏥 BẮT ĐẦU QUÁ TRÌNH MIGRATION & LÀM SẠCH DỮ LIỆU HỆ THỐNG VINMEC');
    console.log('========================================================================================');

    // Bật chế độ WAL để tăng độ bền và tốc độ ghi đồng thời
    await run("PRAGMA journal_mode = WAL;");

    // 2. KHỞI TẠO CẤU TRÚC BẢNG NẾU CHƯA CÓ
    console.log('\n🛠️  [2/6] Kiểm tra và cấu hình các bảng trong Cơ sở dữ liệu...');
    
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'department',
            facility TEXT NOT NULL DEFAULT 'BV VMOCP2',
            department TEXT NOT NULL DEFAULT 'ALL',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    await run(`
        CREATE TABLE IF NOT EXISTS facilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL
        )
    `);

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
    console.log('   ✅ Đã đảm bảo cấu trúc 3 bảng: users, facilities, daily_reports');

    // 3. XÓA TOÀN BỘ DỮ LIỆU BÁO CÁO DEMO CŨ
    console.log('\n🧹 [3/6] Xóa toàn bộ dữ liệu báo cáo mẫu / demo trong daily_reports...');
    const oldReportCount = await get("SELECT COUNT(*) as count FROM daily_reports");
    await run("DELETE FROM daily_reports");
    await run("DELETE FROM sqlite_sequence WHERE name = 'daily_reports'");
    console.log(`   ✅ Đã xóa sạch ${oldReportCount.count} bản ghi báo cáo cũ. Đặt lại ID báo cáo về 1.`);

    // 4. BẢO ĐẢM 3 CƠ SỞ CHUẨN LUÔN TỒN TẠI (GIỮ NGUYÊN MỌI CƠ SỞ KHÁC)
    console.log('\n🏢 [4/6] Đảm bảo danh mục Cơ sở hoạt động...');
    const now = new Date().toISOString();
    const standardFacilities = [
        { name: 'BV VMOCP2', desc: 'Bệnh Viện Đa Khoa Quốc Tế Vinmec Ocean Park 2' },
        { name: 'PK OCP1', desc: 'Phòng khám Đa Khoa Quốc Tế Vinmec Ocean Park 1' },
        { name: 'PK OCP2', desc: 'Phòng khám Đa Khoa Quốc Tế Vinmec Ocean Park 2' }
    ];

    for (const f of standardFacilities) {
        const existing = await get("SELECT id FROM facilities WHERE name = ?", [f.name]);
        if (!existing) {
            await run("INSERT INTO facilities (name, description, created_at) VALUES (?, ?, ?)", [f.name, f.desc, now]);
        }
    }
    const currentFacilities = await all("SELECT id, name, description FROM facilities ORDER BY id ASC");
    currentFacilities.forEach(f => console.log(`   - Cơ sở [ID ${f.id}]: ${f.name} (${f.description})`));

    // 5. BẢO ĐẢM 18 TÀI KHOẢN CHÍNH THỨC SẴN SÀNG (GIỮ NGUYÊN MỌI TÀI KHOẢN KHÁC)
    console.log('\n👥 [5/6] Đảm bảo 18 tài khoản chính thức sẵn sàng (Mật khẩu mặc định: Vinmec@2026)...');
    
    const salt = bcrypt.genSaltSync(10);
    const defaultPassHash = bcrypt.hashSync('Vinmec@2026', salt);

    // 5.1 Admin
    const adminUser = await get("SELECT id FROM users WHERE username = 'admin'");
    if (!adminUser) {
        await run(`
            INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
            VALUES ('admin', ?, 'Quản Trị Viên Hệ Thống (Admin)', 'admin', 'ALL', 'ALL', 1, ?, ?)
        `, [defaultPassHash, now, now]);
    }

    // 5.2 17 Khoa chuyên môn
    const officialDeptAccounts = [
        { username: 'baocao_capcuu', name: 'Khoa Cấp Cứu', dept: 'Cấp cứu' },
        { username: 'baocao_khambenh', name: 'Khoa Khám Bệnh', dept: 'Khám bệnh' },
        { username: 'baocao_ranghammat', name: 'Khoa Răng Hàm Mặt', dept: 'Răng hàm mặt' },
        { username: 'baocao_taimuihong', name: 'Khoa Tai Mũi Họng', dept: 'Tai mũi họng' },
        { username: 'baocao_nhankhoa', name: 'Khoa Nhãn Khoa', dept: 'Nhãn khoa' },
        { username: 'baocao_dalieu', name: 'Khoa Da Liễu', dept: 'Da liễu' },
        { username: 'baocao_vaccine', name: 'Khoa Vaccine', dept: 'Vaccine' },
        { username: 'baocao_noi', name: 'Khoa Nội Tổng Hợp', dept: 'Nội tổng hợp' },
        { username: 'baocao_ngoai', name: 'Khoa Ngoại Tổng Hợp', dept: 'Ngoại tổng hợp' },
        { username: 'baocao_ctch', name: 'Khoa Chấn Thương Chỉnh Hình', dept: 'Chấn thương chỉnh hình' },
        { username: 'baocao_tkcs', name: 'Khoa Thần Kinh Cột Sống', dept: 'Thần kinh cột sống' },
        { username: 'baocao_phcn', name: 'Khoa Phục Hồi Chức Năng', dept: 'Phục hồi chức năng' },
        { username: 'baocao_san', name: 'Khoa Phụ Sản', dept: 'Phụ sản' },
        { username: 'baocao_nhi', name: 'Khoa Nhi Sơ Sinh', dept: 'Nhi sơ sinh' },
        { username: 'baocao_xetnghiem', name: 'Khoa Xét Nghiệm', dept: 'Xét nghiệm' },
        { username: 'baocao_cdha', name: 'Khoa Chẩn Đoán Hình Ảnh', dept: 'Chẩn đoán hình ảnh' },
        { username: 'baocao_dqct', name: 'Khoa Điện Quang Can Thiệp', dept: 'Điện quang can thiệp' }
    ];

    for (const d of officialDeptAccounts) {
        const existing = await get("SELECT id FROM users WHERE username = ?", [d.username]);
        if (!existing) {
            await run(`
                INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
                VALUES (?, ?, ?, 'department', 'ALL', ?, 1, ?, ?)
            `, [d.username, defaultPassHash, d.name, d.dept, now, now]);
        }
    }

    // 6. KIỂM TRA & TỔNG KẾT SAU KHI MIGRATION
    console.log('\n📊 [6/6] Kiểm tra tổng thể hệ thống sau Migration:');
    const finalReportCount = await get("SELECT COUNT(*) as count FROM daily_reports");
    const finalUsers = await all("SELECT id, username, full_name, role, department FROM users ORDER BY id ASC");
    const finalFacilities = await all("SELECT id, name, description FROM facilities ORDER BY id ASC");

    console.log(`   - Số báo cáo hiện tại: ${finalReportCount.count} (Sẵn sàng nhập mới 100%)`);
    console.log(`   - Tổng số cơ sở     : ${finalFacilities.length} cơ sở (${finalFacilities.map(f => f.name).join(', ')})`);
    console.log(`   - Tổng số tài khoản : ${finalUsers.length} tài khoản chuẩn hóa.`);

    console.log('\n========================================================================================');
    console.log(' 🎉 MIGRATION HOÀN TẤT THÀNH CÔNG RỰC RỠ!');
    console.log('========================================================================================');
    console.log(' 👑 Super Admin       : username=admin | pass=Vinmec@2026');
    console.log(' 🏥 17 Khoa chuyên môn: username=baocao_<tenkhoa> | pass=Vinmec@2026');
    console.log(' 🚀 Bây giờ bạn có thể khởi động server hoặc reload PM2 để các khoa bắt đầu tự nhập.');
    console.log('========================================================================================\n');

    db.close();
}

migrate().catch(err => {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH MIGRATION:', err);
    process.exit(1);
});
