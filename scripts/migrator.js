/**
 * ============================================================================
 * CHƯƠNG TRÌNH QUẢN LÝ MIGRATION CƠ SỞ DỮ LIỆU TỰ ĐỘNG (DATABASE MIGRATOR)
 * ============================================================================
 * Đặc điểm an toàn:
 * 1. Lưu vết các migration đã chạy vào bảng `_migrations`.
 * 2. Chỉ chạy các file migration CHƯA TỪNG CHẠY (pending).
 * 3. Migration nào đã chạy rồi sẽ TUYỆT ĐỐI KHÔNG CHẠY LẠI -> KHÔNG BỊ XÓA DỮ LIỆU!
 * 4. Tự động backup database trước mỗi lần chạy migration mới.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const appRoot = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const DATA_DIR = path.join(appRoot, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'vinmec.sqlite');
const MIGRATIONS_DIR = (process.pkg && fs.existsSync(path.join(path.dirname(process.execPath), 'migrations')))
    ? path.join(path.dirname(process.execPath), 'migrations')
    : path.join(__dirname, '..', 'migrations');

const db = new sqlite3.Database(DB_PATH);

// Registry of built-in migrations for self-contained single .exe binary
const BUILTIN_MIGRATIONS = [
    { name: '001_initial_schema', module: require('../migrations/001_initial_schema') },
    { name: '002_clean_demo_and_standardize_accounts', module: require('../migrations/002_clean_demo_and_standardize_accounts') },
    { name: '003_reset_department_passwords_to_123456', module: require('../migrations/003_reset_department_passwords_to_123456') }
];

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

async function ensureMigrationTable() {
    await run("PRAGMA journal_mode = WAL;");
    await run(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            batch INTEGER NOT NULL,
            executed_at TEXT NOT NULL
        )
    `);
}

function getAllMigrations() {
    const map = new Map();
    BUILTIN_MIGRATIONS.forEach(m => map.set(m.name, m.module));

    if (fs.existsSync(MIGRATIONS_DIR)) {
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.js')).sort();
        for (const file of files) {
            const name = file.replace('.js', '');
            if (!map.has(name)) {
                try {
                    map.set(name, require(path.join(MIGRATIONS_DIR, file)));
                } catch (e) {}
            }
        }
    }
    return Array.from(map.entries()).map(([name, module]) => ({ name, module }));
}

async function showStatus() {
    await ensureMigrationTable();
    const migrations = getAllMigrations();
    const executedRows = await all("SELECT name, batch, executed_at FROM _migrations ORDER BY id ASC");
    const executedMap = new Map();
    executedRows.forEach(r => executedMap.set(r.name, r));

    console.log('\n========================================================================================');
    console.log(' 📋 TRẠNG THÁI CÁC BẢN MIGRATION TRONG CƠ SỞ DỮ LIỆU');
    console.log('========================================================================================');
    console.log(' Tên migration                                    | Trạng thái  | Batch | Thời gian chạy');
    console.log('--------------------------------------------------+-------------+-------+-------------------------');

    for (const m of migrations) {
        const migName = m.name;
        const execInfo = executedMap.get(migName);
        if (execInfo) {
            const timeStr = new Date(execInfo.executed_at).toLocaleString('vi-VN');
            console.log(` ✅ ${migName.padEnd(46)} | ĐÃ CHẠY    |   ${execInfo.batch}   | ${timeStr}`);
        } else {
            console.log(` ⏳ ${migName.padEnd(46)} | CHƯA CHẠY  |   -   | -`);
        }
    }
    console.log('========================================================================================\n');
}

async function runPendingMigrations() {
    await ensureMigrationTable();
    const migrations = getAllMigrations();
    const executedRows = await all("SELECT name FROM _migrations");
    const executedSet = new Set(executedRows.map(r => r.name));

    const pending = migrations.filter(m => !executedSet.has(m.name));

    if (pending.length === 0) {
        console.log('\n========================================================================================');
        console.log(' ✨ CƠ SỞ DỮ LIỆU ĐÃ Ở PHIÊN BẢN MỚI NHẤT!');
        console.log('    Tất cả các bản migration trước đó đã được áp dụng.');
        console.log('    -> Dữ liệu báo cáo tự nhập hiện tại của bạn được GIỮ NGUYÊN 100% (Không bị xóa).');
        console.log('========================================================================================\n');
        return;
    }

    // 1. Auto Backup
    if (fs.existsSync(DB_PATH)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(DATA_DIR, `vinmec_backup_${timestamp}.sqlite`);
        try {
            fs.copyFileSync(DB_PATH, backupPath);
            console.log(`\n📦 [Auto-Backup] Đã tạo bản sao lưu an toàn tại:\n    -> ${backupPath}`);
        } catch (e) {
            console.warn(`⚠️ Không thể tạo bản sao lưu: ${e.message}`);
        }
    }

    // Determine batch number
    const maxBatchRow = await get("SELECT MAX(batch) as max_batch FROM _migrations");
    const nextBatch = (maxBatchRow && maxBatchRow.max_batch ? maxBatchRow.max_batch : 0) + 1;

    console.log('\n========================================================================================');
    console.log(` 🚀 ĐANG ÁP DỤNG ${pending.length} BẢN MIGRATION MỚI (Batch #${nextBatch})`);
    console.log('========================================================================================');

    for (const m of pending) {
        const migName = m.name;
        const migration = m.module;

        console.log(`\n▶️  Đang chạy: ${migName}...`);
        const startTime = Date.now();

        await migration.up({ run, get, all });

        const now = new Date().toISOString();
        await run("INSERT INTO _migrations (name, batch, executed_at) VALUES (?, ?, ?)", [migName, nextBatch, now]);

        console.log(`   ✅ Hoàn tất [${migName}] trong ${Date.now() - startTime}ms`);
    }

    console.log('\n========================================================================================');
    console.log(' 🎉 TẤT CẢ MIGRATION ĐÃ ĐƯỢC ÁP DỤNG THÀNH CÔNG!');
    console.log('========================================================================================\n');
}

async function main() {
    const isStatus = process.argv.includes('--status') || process.argv.includes('-s');
    try {
        if (isStatus) {
            await showStatus();
        } else {
            await runPendingMigrations();
        }
    } catch (err) {
        console.error('\n❌ LỖI TRONG QUÁ TRÌNH THỰC THI MIGRATION:', err);
        process.exit(1);
    } finally {
        db.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    main,
    runPendingMigrations,
    showStatus
};
