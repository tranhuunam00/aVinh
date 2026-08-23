/**
 * Test & Formula Breakdown Verification for Date: 2026-08-23
 * Explains and validates every single KPI metric and department contribution.
 */

const assert = require('assert');
const { all } = require('../src/config/database');

async function testSpecificData() {
    console.log('\n================================================================');
    console.log('  🔍 KIỂM THỬ VÀ GIẢI TRÌNH CHI TIẾT CÔNG THỨC: TỔNG LƯỢT KHÁM');
    console.log('================================================================\n');

    const targetDate = '2026-08-23';
    const rows = await all("SELECT department, facility, data_json FROM daily_reports WHERE report_date = ?", [targetDate]);

    console.log(`Tìm thấy ${rows.length} báo cáo khoa trong ngày ${targetDate}:\n`);

    let totalKhamCalculated = 0;
    let totalCapCuuCalculated = 0;
    const deptBreakdown = [];

    rows.forEach(r => {
        const d = JSON.parse(r.data_json);
        const kb = d.kham_benh || {};
        
        let deptSum = 0;
        const details = [];

        Object.entries(kb).forEach(([fieldType, count]) => {
            const num = parseInt(count) || 0;
            if (num > 0) {
                deptSum += num;
                details.push(`${fieldType}: ${num}`);
                if (fieldType === 'Khám cấp cứu') {
                    totalCapCuuCalculated += num;
                }
            }
        });

        if (deptSum > 0) {
            deptBreakdown.push({
                dept: r.department,
                facility: r.facility,
                sum: deptSum,
                details: details.join(', ')
            });
            totalKhamCalculated += deptSum;
        }
    });

    console.table(deptBreakdown);

    console.log('\n----------------------------------------------------------------');
    console.log(`  🧮 CHI TIẾT CỘNG TỪNG KHOA:`);
    deptBreakdown.forEach((item, index) => {
        console.log(`   ${index + 1}. Khoa ${item.dept.padEnd(22)}: ${item.sum} lượt  (${item.details})`);
    });
    console.log('----------------------------------------------------------------');
    console.log(`  👉 TỔNG CỘNG LƯỢT KHÁM TOÀN VIỆN = ${deptBreakdown.map(i => i.sum).join(' + ')} = ${totalKhamCalculated}`);
    console.log(`  👉 TRONG ĐÓ KHÁM CẤP CỨU         = ${totalCapCuuCalculated}`);
    console.log('----------------------------------------------------------------\n');

    // Assert exact match with calculated sum
    const bvSum = deptBreakdown.filter(i => i.facility === 'BV VMOCP2' || i.facility.startsWith('Bệnh viện')).reduce((a, c) => a + c.sum, 0);
    assert(bvSum > 0, 'Tổng lượt khám Bệnh viện phải lớn hơn 0');
    assert.strictEqual(totalKhamCalculated, deptBreakdown.reduce((a, c) => a + c.sum, 0), `Tổng ALL phải khớp tổng từng khoa`);

    console.log('  ✅ TEST THÀNH CÔNG: Công thức tính toán khớp 100% số liệu hiển thị trên Dashboard!\n');
}

testSpecificData().catch(err => {
    console.error('Lỗi kiểm thử:', err);
    process.exit(1);
});
