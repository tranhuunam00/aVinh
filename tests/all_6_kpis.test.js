/**
 * Test Suite & Full Mathematical Proof for All 6 Dashboard KPI Cards
 * Target Date: 2026-08-23
 *
 * 1. TỔNG LƯỢT KHÁM (129)
 * 2. KHÁM CẤP CỨU (33)
 * 3. BỆNH NHÂN VÀO VIỆN (27) [Nội trú: 48, Daycare: 14]
 * 4. PHẪU THUẬT & THỦ THUẬT (46) [Mổ: 14, Thủ thuật: 32]
 * 5. KHỐI CẬN LÂM SÀNG (621) [XN: 364, CĐHA: 243, ĐQCT: 14]
 * 6. RA VIỆN / CHUYỂN TUYẾN (27) [Chuyển viện: 2, Tử vong: 0]
 */

const assert = require('assert');
const { all } = require('../src/config/database');

async function verifyAll6KPIs() {
    console.log('\n========================================================================================');
    console.log('  🏥 KIỂM THỬ TOÀN DIỆN 6 THẺ CHỈ SỐ KPI DASHBOARD GIAO BAN NGÀY 23/08/2026');
    console.log('========================================================================================\n');

    const targetDate = '2026-08-23';
    const rows = await all("SELECT department, facility, data_json FROM daily_reports WHERE report_date = ? AND facility LIKE 'Bệnh viện%'", [targetDate]);

    console.log(`Đọc thành công dữ liệu ${rows.length} khoa đã nộp báo cáo trong ngày:\n`);

    // Data structures for tracking
    const kpi1_kham = [];
    const kpi2_capcuu = [];
    const kpi3_vaovien = [];
    const kpi3_noitru = [];
    const kpi3_daycare = [];
    const kpi4_phauthuat = [];
    const kpi4_thuthuat = [];
    const kpi5_xn = [];
    const kpi5_cdha = [];
    const kpi5_dqct = [];
    const kpi6_ravien = [];
    const kpi6_chuyenvien = [];
    const kpi6_tuvong = [];

    rows.forEach(r => {
        const dept = r.department;
        const d = JSON.parse(r.data_json);

        // 1 & 2: Khám & Cấp cứu
        if (d.kham_benh) {
            let deptKhamTotal = 0;
            Object.entries(d.kham_benh).forEach(([field, count]) => {
                const num = parseInt(count) || 0;
                if (num > 0) {
                    deptKhamTotal += num;
                    if (field === 'Khám cấp cứu') {
                        kpi2_capcuu.push({ dept, count: num });
                    }
                }
            });
            if (deptKhamTotal > 0) {
                kpi1_kham.push({ dept, total: deptKhamTotal, details: JSON.stringify(d.kham_benh) });
            }
        }

        // 3: Điều trị & Vào viện
        if (d.dieu_tri) {
            if (d.dieu_tri["Nội trú"]) kpi3_noitru.push({ dept, count: parseInt(d.dieu_tri["Nội trú"]) || 0 });
            if (d.dieu_tri["Daycare"]) kpi3_daycare.push({ dept, count: parseInt(d.dieu_tri["Daycare"]) || 0 });
        }
        if (d.tinh_trang) {
            if (d.tinh_trang["Vào viện"]) kpi3_vaovien.push({ dept, count: parseInt(d.tinh_trang["Vào viện"]) || 0 });
            
            // 6: Ra viện / Chuyển viện / Tử vong
            let raVienSum = 0;
            Object.entries(d.tinh_trang).forEach(([k, v]) => {
                const num = parseInt(v) || 0;
                if (k.includes('Ra viện') && num > 0) raVienSum += num;
                if (k === 'Chuyển viện' && num > 0) kpi6_chuyenvien.push({ dept, count: num });
                if (k === 'Tử vong' && num > 0) kpi6_tuvong.push({ dept, count: num });
            });
            if (raVienSum > 0) kpi6_ravien.push({ dept, count: raVienSum });
        }

        // 4: Phẫu thuật & Thủ thuật
        if (d.dich_vu) {
            if (d.dich_vu["Phẫu thuật"]) kpi4_phauthuat.push({ dept, count: parseInt(d.dich_vu["Phẫu thuật"]) || 0 });
            if (d.dich_vu["Thủ thuật"]) kpi4_thuthuat.push({ dept, count: parseInt(d.dich_vu["Thủ thuật"]) || 0 });
        }

        // 5: Cận lâm sàng (XN, CĐHA, ĐQCT)
        if (d.xet_nghiem) {
            let xnSum = 0;
            Object.values(d.xet_nghiem).forEach(v => xnSum += parseInt(v) || 0);
            if (xnSum > 0) kpi5_xn.push({ dept, count: xnSum, details: JSON.stringify(d.xet_nghiem) });
        }
        if (d.cdha) {
            let cdSum = 0;
            Object.values(d.cdha).forEach(v => cdSum += parseInt(v) || 0);
            if (cdSum > 0) kpi5_cdha.push({ dept, count: cdSum, details: JSON.stringify(d.cdha) });
        }
        if (d.dqct) {
            let dqSum = 0;
            Object.values(d.dqct).forEach(v => dqSum += parseInt(v) || 0);
            if (dqSum > 0) kpi5_dqct.push({ dept, count: dqSum, details: JSON.stringify(d.dqct) });
        }
    });

    // =========================================================================
    // KPI 1: TỔNG LƯỢT KHÁM = 129
    // =========================================================================
    const sumKham = kpi1_kham.reduce((acc, cur) => acc + cur.total, 0);
    console.log('📌 [KPI 1] TỔNG LƯỢT KHÁM');
    console.log('   Công thức: ∑ (Khám cấp cứu + Khám chuyên khoa + Khám tổng quát + Khám cộng đồng)');
    console.log(`   Các khoa đóng góp:`);
    kpi1_kham.forEach(k => console.log(`     - Khoa ${k.dept.padEnd(20)}: ${k.total} lượt`));
    console.log(`   👉 TỔNG = ${kpi1_kham.map(k => k.total).join(' + ')} = ${sumKham}`);
    assert.strictEqual(sumKham, 129, 'KPI 1 must be 129');
    console.log('   ✅ PASS KPI 1\n');

    // =========================================================================
    // KPI 2: KHÁM CẤP CỨU = 33
    // =========================================================================
    const sumCapCuu = kpi2_capcuu.reduce((acc, cur) => acc + cur.count, 0);
    console.log('📌 [KPI 2] KHÁM CẤP CỨU (24H)');
    console.log('   Công thức: ∑ (Tất cả ca "Khám cấp cứu" tiếp nhận trong 24h)');
    kpi2_capcuu.forEach(k => console.log(`     - Khoa ${k.dept.padEnd(20)}: ${k.count} ca`));
    console.log(`   👉 TỔNG = ${kpi2_capcuu.map(k => k.count).join(' + ')} = ${sumCapCuu}`);
    assert.strictEqual(sumCapCuu, 33, 'KPI 2 must be 33');
    console.log('   ✅ PASS KPI 2\n');

    // =========================================================================
    // KPI 3: BỆNH NHÂN VÀO VIỆN = 27 (Nội trú: 48 | Daycare: 14)
    // =========================================================================
    const sumVaoVien = kpi3_vaovien.reduce((acc, cur) => acc + cur.count, 0);
    const sumNoiTru = kpi3_noitru.reduce((acc, cur) => acc + cur.count, 0);
    const sumDaycare = kpi3_daycare.reduce((acc, cur) => acc + cur.count, 0);
    console.log('📌 [KPI 3] BỆNH NHÂN VÀO VIỆN (Nội trú & Daycare)');
    console.log('   Công thức Vào viện: ∑ (Chỉ số "Vào viện" từ các khoa)');
    console.log('   Công thức Nội trú : ∑ ("Nội trú") | Daycare: ∑ ("Daycare")');
    console.log(`   Vào viện từng khoa:`);
    kpi3_vaovien.forEach(k => console.log(`     - Khoa ${k.dept.padEnd(20)}: ${k.count} BN vào viện`));
    console.log(`   👉 TỔNG VÀO VIỆN = ${kpi3_vaovien.map(k => k.count).join(' + ')} = ${sumVaoVien}`);
    console.log(`   👉 TỔNG NỘI TRÚ  = ${kpi3_noitru.map(k => k.count).join(' + ')} = ${sumNoiTru}`);
    console.log(`   👉 TỔNG DAYCARE  = ${kpi3_daycare.map(k => k.count).join(' + ')} = ${sumDaycare}`);
    assert.strictEqual(sumVaoVien, 27, 'KPI 3 Vào viện must be 27');
    assert.strictEqual(sumNoiTru, 48, 'KPI 3 Nội trú must be 48');
    assert.strictEqual(sumDaycare, 14, 'KPI 3 Daycare must be 14');
    console.log('   ✅ PASS KPI 3\n');

    // =========================================================================
    // KPI 4: PHẪU THUẬT & THỦ THUẬT = 46 (Mổ: 14 | Thủ thuật: 32)
    // =========================================================================
    const sumMo = kpi4_phauthuat.reduce((acc, cur) => acc + cur.count, 0);
    const sumThuThuat = kpi4_thuthuat.reduce((acc, cur) => acc + cur.count, 0);
    const sumPT_TT = sumMo + sumThuThuat;
    console.log('📌 [KPI 4] PHẪU THUẬT & THỦ THUẬT');
    console.log('   Công thức: ∑ (Phẫu thuật / Mổ) + ∑ (Thủ thuật)');
    console.log(`   Phẫu thuật (Mổ):`);
    kpi4_phauthuat.forEach(k => console.log(`     - Khoa ${k.dept.padEnd(20)}: ${k.count} ca mổ`));
    console.log(`   Thủ thuật:`);
    kpi4_thuthuat.forEach(k => console.log(`     - Khoa ${k.dept.padEnd(20)}: ${k.count} thủ thuật`));
    console.log(`   👉 TỔNG MỔ (Phẫu thuật) = ${kpi4_phauthuat.map(k => k.count).join(' + ')} = ${sumMo}`);
    console.log(`   👉 TỔNG THỦ THUẬT       = ${kpi4_thuthuat.map(k => k.count).join(' + ')} = ${sumThuThuat}`);
    console.log(`   👉 TỔNG CỘNG KPI        = ${sumMo} + ${sumThuThuat} = ${sumPT_TT}`);
    assert.strictEqual(sumMo, 14, 'Mổ must be 14');
    assert.strictEqual(sumThuThuat, 32, 'Thủ thuật must be 32');
    assert.strictEqual(sumPT_TT, 46, 'KPI 4 Total must be 46');
    console.log('   ✅ PASS KPI 4\n');

    // =========================================================================
    // KPI 5: KHỐI CẬN LÂM SÀNG = 621 (XN: 364 | CĐHA: 243 | ĐQCT: 14)
    // =========================================================================
    const sumXN = kpi5_xn.reduce((acc, cur) => acc + cur.count, 0);
    const sumCDHA = kpi5_cdha.reduce((acc, cur) => acc + cur.count, 0);
    const sumDQCT = kpi5_dqct.reduce((acc, cur) => acc + cur.count, 0);
    const sumTotalCLS = sumXN + sumCDHA + sumDQCT;
    console.log('📌 [KPI 5] KHỐI CẬN LÂM SÀNG (CLS)');
    console.log('   Công thức: ∑ (7 nhóm Xét nghiệm) + ∑ (10 kỹ thuật CĐHA) + ∑ (3 kỹ thuật ĐQCT)');
    console.log(`   👉 Xét nghiệm (XN)          = ${sumXN} mẫu`);
    console.log(`   👉 Chẩn đoán hình ảnh (CĐHA) = ${sumCDHA} lượt chụp/siêu âm`);
    console.log(`   👉 Điện quang can thiệp(ĐQCT)= ${sumDQCT} ca can thiệp`);
    console.log(`   👉 TỔNG KHỐI CLS            = ${sumXN} + ${sumCDHA} + ${sumDQCT} = ${sumTotalCLS}`);
    assert.strictEqual(sumXN, 364, 'XN must be 364');
    assert.strictEqual(sumCDHA, 243, 'CDHA must be 243');
    assert.strictEqual(sumDQCT, 14, 'DQCT must be 14');
    assert.strictEqual(sumTotalCLS, 621, 'KPI 5 Total CLS must be 621');
    console.log('   ✅ PASS KPI 5\n');

    // =========================================================================
    // KPI 6: RA VIỆN / CHUYỂN TUYẾN = 27 (Chuyển viện: 2 | Tử vong: 0)
    // =========================================================================
    const sumRaVien = kpi6_ravien.reduce((acc, cur) => acc + cur.count, 0);
    const sumChuyenVien = kpi6_chuyenvien.reduce((acc, cur) => acc + cur.count, 0);
    const sumTuVong = kpi6_tuvong.reduce((acc, cur) => acc + cur.count, 0);
    console.log('📌 [KPI 6] RA VIỆN / CHUYỂN TUYẾN / TỬ VONG');
    console.log('   Công thức Ra viện: ∑ (Ra viện theo chỉ định + Ra viện không theo chỉ định)');
    console.log('   Công thức Chuyển viện: ∑ (Chuyển viện) | Tử vong: ∑ (Tử vong)');
    console.log(`   Ra viện từng khoa:`);
    kpi6_ravien.forEach(k => console.log(`     - Khoa ${k.dept.padEnd(20)}: ${k.count} BN ra viện`));
    console.log(`   👉 TỔNG RA VIỆN     = ${kpi6_ravien.map(k => k.count).join(' + ')} = ${sumRaVien}`);
    console.log(`   👉 TỔNG CHUYỂN VIỆN = ${sumChuyenVien}`);
    console.log(`   👉 TỔNG TỬ VONG     = ${sumTuVong}`);
    assert.strictEqual(sumRaVien, 27, 'KPI 6 Ra vien must be 27');
    assert.strictEqual(sumChuyenVien, 2, 'KPI 6 Chuyen vien must be 2');
    assert.strictEqual(sumTuVong, 0, 'KPI 6 Tu vong must be 0');
    console.log('   ✅ PASS KPI 6\n');

    console.log('========================================================================================');
    console.log('  🎉 TẤT CẢ 6/6 THẺ CHỈ SỐ KPI TRÊN DASHBOARD ĐÃ ĐƯỢC CHỨNG MINH CHÍNH XÁC 100%!');
    console.log('========================================================================================\n');
}

verifyAll6KPIs().catch(err => {
    console.error('Fatal KPI test error:', err);
    process.exit(1);
});
