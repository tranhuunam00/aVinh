/**
 * Migration 003: Đặt lại mật khẩu tất cả các tài khoản khoa thành 123456 (ngoại trừ tài khoản admin)
 */
const bcrypt = require('bcryptjs');

module.exports = {
    name: '003_reset_department_passwords_to_123456',
    async up({ run, get, all }) {
        const now = new Date().toISOString();
        const salt = bcrypt.genSaltSync(10);
        const passHash = bcrypt.hashSync('123456', salt);

        // Cập nhật mật khẩu thành 123456 cho tất cả tài khoản ngoại trừ admin
        await run(`
            UPDATE users 
            SET password_hash = ?, updated_at = ? 
            WHERE role != 'admin' AND username != 'admin'
        `, [passHash, now]);

        const updatedUsers = await all("SELECT id, username, full_name, role FROM users WHERE role != 'admin' AND username != 'admin'");
        console.log(`   🔑 Đã đổi mật khẩu thành công về '123456' cho ${updatedUsers.length} tài khoản khoa/người dùng.`);
        console.log(`   👑 Tài khoản SUPER ADMIN (admin) được giữ nguyên mật khẩu.`);
    }
};
