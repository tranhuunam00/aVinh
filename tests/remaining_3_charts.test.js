/**
 * Test & Mathematical Verification for Remaining 3 Dashboard Charts:
 * 3. Chẩn Đoán Hình Ảnh (10 kỹ thuật)
 * 4. Xét Nghiệm (7 nhóm xét nghiệm)
 * 5. Tình Trạng Ra Vào Viện & Chuyển Tuyến (6 nhóm tình trạng)
 * Target Date: 2026-08-23
 */

const assert = require('assert');
const { all } = require('../src/config/database');

async function verifyRemaining3Charts() {
    console.log('\n========================================================================================');
    console.log('  🏥 KIỂM THỬ VÀ GIẢI TRÌNH CÔNG THỨC 3 BIỂU ĐỒ CÒN LẠI (NGÀY 23/08/2026)');
    console.log('========================================================================================\n');

    const targetDate = '2026-08-23';
    const rows = await all("SELECT department, facility, data_json FROM daily_reports WHERE report_date = ?", [targetDate]);

    // -------------------------------------------------------------------------
    // 1. BIỂU ĐỒ 3: CHẨN ĐOÁN HÌNH ẢNH (10 KỸ THUẬT)
    // -------------------------------------------------------------------------
    console.log('📌 1. BIỂU ĐỒ 3: CHẨN ĐOÁN HÌNH ẢNH (CĐHA)');
    console.log('   Công thức: Cột của mỗi kỹ thuật K = ∑ (Số lượt thực hiện kỹ thuật K trong 24h)\n');

    const cdhaCounts = {};
    let totalCDHA = 0;

    rows.forEach(r => {
        const d = JSON.parse(r.data_json);
        if (d.cdha) {
            Object.entries(d.cdha).forEach(([k, v]) => {
                const count = parseInt(v) || 0;
                cdhaCounts[k] = (cdhaCounts[k] || 0) + count;
                totalCDHA += count;
            });
        }
    });

    console.table(Object.entries(cdhaCounts).map(([tech, count]) => ({ 'Kỹ Thuật CĐHA': tech, 'Lượt Thực Hiện': count })));
    console.log(`   👉 TỔNG SỐ LƯỢT CHẨN ĐOÁN HÌNH ẢNH = ${totalCDHA}\n`);

    assert.strictEqual(cdhaCounts['Siêu âm'], 92);
    assert.strictEqual(cdhaCounts['Siêu âm ABUS'], 14);
    assert.strictEqual(cdhaCounts['XQ Tổng quát'], 70);
    assert.strictEqual(cdhaCounts['XQ Panorama'], 10);
    assert.strictEqual(cdhaCounts['XQ Mammo'], 8);
    assert.strictEqual(cdhaCounts['MSCT'], 20);
    assert.strictEqual(cdhaCounts['CBCT'], 5);
    assert.strictEqual(cdhaCounts['MRI'], 18);
    assert.strictEqual(cdhaCounts['DEXA'], 6);
    assert.strictEqual(cdhaCounts['Teleradiology'] || 0, 0);
    assert.strictEqual(totalCDHA, 243);
    console.log('   ✅ PASS BIỂU ĐỒ 3: Khớp 100% 10 cột Chẩn đoán hình ảnh!\n');

    // -------------------------------------------------------------------------
    // 2. BIỂU ĐỒ 4: XÉT NGHIỆM (7 NHÓM XÉT NGHIỆM)
    // -------------------------------------------------------------------------
    console.log('📌 2. BIỂU ĐỒ 4: XÉT NGHIỆM (7 NHÓM)');
    console.log('   Công thức: Cột của mỗi nhóm XN = ∑ (Số mẫu xét nghiệm thực hiện trong 24h)\n');

    const xnCounts = {};
    let totalXN = 0;

    rows.forEach(r => {
        const d = JSON.parse(r.data_json);
        if (d.xet_nghiem) {
            Object.entries(d.xet_nghiem).forEach(([k, v]) => {
                const count = parseInt(v) || 0;
                xnCounts[k] = (xnCounts[k] || 0) + count;
                totalXN += count;
            });
        }
    });

    console.table(Object.entries(xnCounts).map(([group, count]) => ({ 'Nhóm Xét Nghiệm': group, 'Số Mẫu Thực Hiện': count })));
    console.log(`   👉 TỔNG SỐ MẪU XÉT NGHIỆM = ${totalXN}\n`);

    assert.strictEqual(xnCounts['Sinh hóa'], 165);
    assert.strictEqual(xnCounts['Huyết học'], 125);
    assert.strictEqual(xnCounts['Vi sinh'], 42);
    assert.strictEqual(xnCounts['Tế bào học'], 15);
    assert.strictEqual(xnCounts['Mô bệnh học'], 9);
    assert.strictEqual(xnCounts['Hóa mô miễn dịch'], 5);
    assert.strictEqual(xnCounts['Di truyền'], 3);
    assert.strictEqual(totalXN, 364);
    console.log('   ✅ PASS BIỂU ĐỒ 4: Khớp 100% 7 cột Xét nghiệm!\n');

    // -------------------------------------------------------------------------
    // 3. BIỂU ĐỒ 5: TÌNH TRẠNG RA VÀO VIỆN & CHUYỂN TUYẾN (6 NHÓM)
    // -------------------------------------------------------------------------
    console.log('📌 3. BIỂU ĐỒ 5: TÌNH TRẠNG RA VÀO VIỆN & CHUYỂN TUYẾN');
    console.log('   Công thức: Cột của mỗi tình trạng T = ∑ (Số ca của tình trạng T từ các khoa)\n');

    const statusCounts = {
        'Vào viện': 0,
        'Ra viện theo chỉ định': 0,
        'Ra viện không theo chỉ định': 0,
        'Chuyển viện': 0,
        'Nặng xin về': 0,
        'Tử vong': 0
    };

    rows.forEach(r => {
        const d = JSON.parse(r.data_json);
        if (d.tinh_trang) {
            Object.entries(d.tinh_trang).forEach(([k, v]) => {
                const count = parseInt(v) || 0;
                if (statusCounts[k] !== undefined) {
                    statusCounts[k] += count;
                }
            });
        }
    });

    console.table(Object.entries(statusCounts).map(([statusName, count]) => ({ 'Tình Trạng Người Bệnh': statusName, 'Số Ca (Trục Y)': count })));

    assert.strictEqual(statusCounts['Vào viện'], 27, 'Vào viện must be 27 (12 Cấp cứu + 9 Ngoại + 6 Sản)');
    assert.strictEqual(statusCounts['Ra viện theo chỉ định'], 26, 'Ra viện theo CĐ must be 26 (14 Cấp cứu + 7 Ngoại + 5 Sản)');
    assert.strictEqual(statusCounts['Ra viện không theo chỉ định'], 1, 'Ra viện không theo CĐ must be 1 (1 Cấp cứu)');
    assert.strictEqual(statusCounts['Chuyển viện'], 2, 'Chuyển viện must be 2 (2 Cấp cứu)');
    assert.strictEqual(statusCounts['Nặng xin về'], 0, 'Nặng xin về must be 0');
    assert.strictEqual(statusCounts['Tử vong'], 0, 'Tử vong must be 0');

    console.log('   ✅ PASS BIỂU ĐỒ 5: Khớp 100% 6 cột Tình trạng ra vào viện & chuyển tuyến!\n');

    console.log('========================================================================================');
    console.log('  🎉 TẤT CẢ 5/5 BIỂU ĐỒ TRÊN DASHBOARD ĐÃ ĐƯỢC KIỂM THỬ KHỚP 100% TOÁN HỌC!');
    console.log('========================================================================================\n');
}

verifyRemaining3Charts().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
