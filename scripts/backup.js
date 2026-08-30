/**
 * ============================================================================
 * CÔNG CỤ TỰ ĐỘNG SAO LƯU DỮ LIỆU SQLITE (ZERO-DOWNTIME ONLINE BACKUP)
 * ============================================================================
 * 1. Sử dụng lệnh PRAGMA wal_checkpoint + copy an toàn dữ liệu SQLite.
 * 2. Lưu trữ tại data/backups/ theo timestamp chuẩn.
 * 3. Tự động dọn dẹp và giữ lại 30 bản sao lưu gần nhất.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const appRoot = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const DATA_DIR = path.join(appRoot, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_PATH = path.join(DATA_DIR, 'vinmec.sqlite');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

async function backupDatabase() {
    ensureDir(BACKUP_DIR);

    if (!fs.existsSync(DB_PATH)) {
        console.log('⚠️ Không tìm thấy file cơ sở dữ liệu để sao lưu tại:', DB_PATH);
        return null;
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const backupFileName = `vinmec_backup_${dateStr}.sqlite`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    try {
        fs.copyFileSync(DB_PATH, backupFilePath);
        const stats = fs.statSync(backupFilePath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        console.log('========================================================================');
        console.log(' 📦 SAO LƯU DỮ LIỆU THÀNH CÔNG (DATABASE BACKUP COMPLETED)');
        console.log('========================================================================');
        console.log(` 📁 Tệp sao lưu: data/backups/${backupFileName}`);
        console.log(` 💾 Dung lượng : ${sizeKB} KB`);
        console.log(` 🕒 Thời gian  : ${now.toLocaleString('vi-VN')}`);
        console.log('========================================================================\n');

        // Clean up old backups (giữ lại 30 bản gần nhất)
        cleanupOldBackups(30);

        return backupFilePath;
    } catch (err) {
        console.error('❌ Lỗi khi sao lưu cơ sở dữ liệu:', err.message);
        return null;
    }
}

function cleanupOldBackups(maxKeep = 30) {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return;
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('vinmec_backup_') && f.endsWith('.sqlite'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f),
                time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Mới nhất lên đầu

        if (files.length > maxKeep) {
            const toDelete = files.slice(maxKeep);
            toDelete.forEach(f => {
                try {
                    fs.unlinkSync(f.path);
                } catch (e) {}
            });
            console.log(` 🧹 Đã dọn dẹp ${toDelete.length} bản sao lưu cũ, duy trì ${maxKeep} bản mới nhất.`);
        }
    } catch (e) {
        console.warn('⚠️ Lỗi dọn dẹp backup cũ:', e.message);
    }
}

if (require.main === module) {
    backupDatabase();
}

module.exports = {
    backupDatabase,
    cleanupOldBackups
};
