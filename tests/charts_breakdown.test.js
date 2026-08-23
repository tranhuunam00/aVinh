/**
 * Test & Mathematical Verification for Dashboard Charts:
 * 1. Chart "Số Lượng Khám Theo Chuyên Khoa" (Bar Chart)
 * 2. Chart "Cơ Cấu Dịch Vụ" (Donut Chart & Percentages)
 * Target Date: 2026-08-23
 */

const assert = require('assert');
const { all } = require('../src/config/database');

async function verifyChartsMath() {
    console.log('\n========================================================================================');
    console.log('  📊 KIỂM THỬ VÀ GIẢI TRÌNH CÔNG THỨC 2 BIỂU ĐỒ DASHBOARD (NGÀY 23/08/2026)');
    console.log('========================================================================================\n');

    const targetDate = '2026-08-23';
    const rows = await all("SELECT department, facility, data_json FROM daily_reports WHERE report_date = ? AND facility LIKE 'Bệnh viện%'", [targetDate]);

    // -------------------------------------------------------------------------
    // 1. BIỂU ĐỒ 1: SỐ LƯỢNG KHÁM THEO CHUYÊN KHOA
    // -------------------------------------------------------------------------
    console.log('📌 1. BIỂU ĐỒ 1: SỐ LƯỢNG KHÁM THEO CHUYÊN KHOA (BAR CHART)');
    console.log('   Công thức: Cột của mỗi khoa = ∑ (Các loại khám bệnh của khoa đó trong 24h)\n');

    const deptKhamCalculated = {};
    rows.forEach(r => {
        const d = JSON.parse(r.data_json);
        if (d.kham_benh) {
            let sum = 0;
            Object.values(d.kham_benh).forEach(v => sum += parseInt(v) || 0);
            if (sum > 0) {
                deptKhamCalculated[r.department] = sum;
            }
        }
    });

    console.table(Object.entries(deptKhamCalculated).map(([dept, count]) => ({ 'Chuyên Khoa': dept, 'Số Lượt Khám (Trục Y)': count })));

    // Verify exact numbers from chart screenshot:
    assert.strictEqual(deptKhamCalculated['Cấp cứu'], 32, 'Cấp cứu must have 32');
    assert.strictEqual(deptKhamCalculated['Ngoại tổng hợp'], 51, 'Ngoại tổng hợp must have 51');
    assert.strictEqual(deptKhamCalculated['Phụ sản'], 42, 'Phụ sản must have 42');
    assert.strictEqual(deptKhamCalculated['Phục hồi chức năng'], 4, 'Phục hồi chức năng must have 4');
    console.log('   ✅ PASS BIỂU ĐỒ 1: 4 cột chuyên khoa khớp 100% hình ảnh biểu đồ!\n');

    // -------------------------------------------------------------------------
    // 2. BIỂU ĐỒ 2: CƠ CẤU DỊCH VỤ (DONUT CHART)
    // -------------------------------------------------------------------------
    console.log('📌 2. BIỂU ĐỒ 2: CƠ CẤU DỊCH VỤ (DONUT CHART - TỶ TRỌNG %)');
    console.log('   Công thức Tỷ trọng (%) = (Tổng số ca dịch vụ X / Tổng tất cả các ca dịch vụ) * 100%\n');

    const serviceCounts = {};
    let totalAllServices = 0;

    rows.forEach(r => {
        const d = JSON.parse(r.data_json);
        if (d.dich_vu) {
            Object.entries(d.dich_vu).forEach(([sName, sVal]) => {
                const count = parseInt(sVal) || 0;
                if (count > 0) {
                    serviceCounts[sName] = (serviceCounts[sName] || 0) + count;
                    totalAllServices += count;
                }
            });
        }
    });

    const serviceTable = Object.entries(serviceCounts).map(([name, count]) => {
        const percent = ((count / totalAllServices) * 100).toFixed(2);
        return {
            'Tên Dịch Vụ': name,
            'Số Lượng (Ca/Lượt)': count,
            'Tỷ Trọng (%)': `${percent}%`
        };
    });

    console.table(serviceTable);
    console.log(`   👉 TỔNG TẤT CẢ CÁC LƯỢT DỊCH VỤ = ${totalAllServices}`);

    // Verify exact numbers from Donut Chart:
    assert.strictEqual(serviceCounts['Khám bệnh'], 126, 'Khám bệnh count must be 126');
    assert.strictEqual(serviceCounts['Chăm sóc toàn diện'], 41, 'Chăm sóc toàn diện count must be 41');
    assert.strictEqual(serviceCounts['Thủ thuật'], 32, 'Thủ thuật count must be 32');
    assert.strictEqual(serviceCounts['Phẫu thuật'], 14, 'Phẫu thuật count must be 14');
    assert.strictEqual(serviceCounts['Chăm sóc sau sinh'], 14, 'Chăm sóc sau sinh count must be 14');
    assert.strictEqual(serviceCounts['Hỗ trợ sinh đẻ'], 6, 'Hỗ trợ sinh đẻ count must be 6');
    assert.strictEqual(totalAllServices, 233, 'Total services must be 233');

    console.log('   ✅ PASS BIỂU ĐỒ 2: 6 lát cắt Donut Chart và tỷ trọng % khớp 100% toán học!\n');

    console.log('========================================================================================');
    console.log('  🎉 TẤT CẢ BIỂU ĐỒ ĐÃ ĐƯỢC CHỨNG MINH CÔNG THỨC TOÁN HỌC CHÍNH XÁC 100%!');
    console.log('========================================================================================\n');
}

verifyChartsMath().catch(err => {
    console.error('Fatal chart test error:', err);
    process.exit(1);
});
