/**
 * Migration 002: Xóa dữ liệu báo cáo demo gốc trong daily_reports
 * BẢO LƯU TOÀN BỘ TÀI KHOẢN VÀ CƠ SỞ (Không xóa tài khoản hay cơ sở người dùng đã tạo)
 */
const bcrypt = require('bcryptjs');

module.exports = {
    name: '002_clean_demo_and_standardize_accounts',
    async up({ run, get, all }) {
        const now = new Date().toISOString();

        // 1. CHỈ XÓA DỮ LIỆU BÁO CÁO CŨ (daily_reports)
        const oldReportCount = await get("SELECT COUNT(*) as count FROM daily_reports");
        await run("DELETE FROM daily_reports");
        await run("DELETE FROM sqlite_sequence WHERE name = 'daily_reports'");
        console.log(`   🧹 Đã dọn dẹp sạch ${oldReportCount.count} bản ghi báo cáo demo cũ.`);

        // 2. BẢO ĐẢM 3 CƠ SỞ CHUẨN LUÔN TỒN TẠI (GIỮ NGUYÊN MỌI CƠ SỞ KHÁC ĐÃ TẠO)
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
        console.log(`   🏢 Giữ nguyên toàn bộ cơ sở đã tạo, đảm bảo 3 cơ sở chuẩn sẵn sàng.`);

        // 3. BẢO ĐẢM TÀI KHOẢN SUPER ADMIN VÀ 17 KHOA LUÔN SẴN SÀNG (Mật khẩu mặc định: Vinmec@2026)
        // (GIỮ NGUYÊN MỌI TÀI KHOẢN KHÁC DO ADMIN TẠO)
        const salt = bcrypt.genSaltSync(10);
        const defaultPassHash = bcrypt.hashSync('Vinmec@2026', salt);

        // 3.1 Super Admin
        const adminUser = await get("SELECT id FROM users WHERE username = 'admin'");
        if (!adminUser) {
            await run(`
                INSERT INTO users (username, password_hash, full_name, role, facility, department, is_active, created_at, updated_at)
                VALUES ('admin', ?, 'Quản Trị Viên Hệ Thống (Admin)', 'admin', 'ALL', 'ALL', 1, ?, ?)
            `, [defaultPassHash, now, now]);
        }

        // 3.2 17 Khoa chuyên môn
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
        console.log(`   👥 Đã bảo đảm 18 tài khoản chính thức sẵn sàng (MK: Vinmec@2026), giữ nguyên mọi tài khoản khác.`);
    }
};
