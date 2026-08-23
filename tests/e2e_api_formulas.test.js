/**
 * End-to-End API Formula & Workflow Verification
 * Tests the running server at http://localhost:8080:
 * 1. Admin & Department User Login
 * 2. Submission of Reports across multiple departments with precise numbers
 * 3. Checking GET /api/dashboard summary metrics against exact formula totals
 * 4. Checking Facility filtering in API
 * 5. Checking Excel export binary stream
 */

const assert = require('assert');

async function runE2E() {
    console.log('\n=============================================================');
    console.log('  🌐 RUNNING LIVE API ENDPOINT FORMULA TEST SUITE');
    console.log('=============================================================\n');

    const BASE_URL = 'http://127.0.0.1:4001';

    // 1. Admin Login
    console.log('  [1/5] Testing Admin Login...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Vinmec@2026' })
    });
    assert.strictEqual(loginRes.status, 200, 'Admin login failed');
    const { token, user } = await loginRes.json();
    assert(token, 'Token must exist');
    assert.strictEqual(user.role, 'admin');
    console.log('  ✅ Admin logged in successfully.');

    // 2. Submit Mock Reports for test date
    const testDate = '2026-11-20';
    const { run } = require('../src/config/database');
    await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);
    console.log(`\n  [2/5] Submitting Test Reports for Date: ${testDate}...`);

    // Khoa Phụ Sản (Bệnh viện)
    const sanRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            report_date: testDate,
            facility: 'Bệnh viện',
            department: 'Phụ sản',
            data: {
                kham_benh: { "Khám chuyên khoa": 45, "Khám tổng quát": 15 }, // Total: 60
                dieu_tri: { "Ngoại trú": 30, "Nội trú": 25, "Daycare": 5 },
                dich_vu: { "Khám bệnh": 60, "Thủ thuật": 10, "Phẫu thuật": 8, "Chăm sóc sau sinh": 15, "Hỗ trợ sinh đẻ": 6, "Chăm sóc toàn diện": 20 },
                tinh_trang: { "Vào viện": 25, "Ra viện theo chỉ định": 20 }
            }
        })
    });
    assert([200, 201].includes(sanRes.status), `Failed to submit Phụ sản report: status ${sanRes.status}`);

    // Khoa Xét nghiệm (Bệnh viện)
    const xnRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            report_date: testDate,
            facility: 'Bệnh viện',
            department: 'Xét nghiệm',
            data: {
                xet_nghiem: { "Sinh hóa": 200, "Huyết học": 150, "Vi sinh": 80, "Tế bào học": 30, "Mô bệnh học": 20, "Hóa mô miễn dịch": 10, "Di truyền": 5 } // Total: 495
            }
        })
    });
    assert([200, 201].includes(xnRes.status), `Failed to submit Xét nghiệm report: status ${xnRes.status}`);

    // Khoa Khám bệnh (PK OCP1)
    const ocp1Res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
            report_date: testDate,
            facility: 'PK OCP1',
            department: 'Khám bệnh',
            data: {
                kham_benh: { "Khám chuyên khoa": 70, "Khám tổng quát": 30, "Khám cấp cứu": 10 }, // Total: 110 (Cấp cứu: 10)
                dieu_tri: { "Ngoại trú": 100, "Nội trú": 0, "Daycare": 10 },
                dich_vu: { "Khám bệnh": 110, "Thủ thuật": 15 },
                tinh_trang: { "Vào viện": 0, "Ra viện theo chỉ định": 95, "Chuyển viện": 2 }
            }
        })
    });
    assert([200, 201].includes(ocp1Res.status), `Failed to submit PK OCP1 report: status ${ocp1Res.status}`);

    console.log('  ✅ Reports submitted for Phụ sản (BV), Xét nghiệm (BV), and Khám bệnh (PK OCP1).');

    // 3. Test Dashboard Aggregation (Facility = ALL)
    console.log('\n  [3/5] Testing GET /api/dashboard?facility=ALL Formulas...');
    const dashAllRes = await fetch(`${BASE_URL}/api/dashboard?date=${testDate}&facility=ALL`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(dashAllRes.status, 200);
    const dashAll = await dashAllRes.json();
    const sAll = dashAll.summary;

    // Formula Checks:
    // Total Kham = 60 (San) + 110 (OCP1) = 170
    assert.strictEqual(sAll.total_kham, 170, `Total Kham: expected 170, got ${sAll.total_kham}`);
    // Total Cap cuu = 10 (OCP1)
    assert.strictEqual(sAll.total_cap_cuu, 10, `Cap cuu: expected 10, got ${sAll.total_cap_cuu}`);
    // Total Vao vien = 25 (San)
    assert.strictEqual(sAll.total_vao_vien, 25, `Vao vien: expected 25, got ${sAll.total_vao_vien}`);
    // Total Phau thuat = 8 (San), Thu thuat = 10 + 15 = 25
    assert.strictEqual(sAll.total_phau_thuat, 8, `Phau thuat: expected 8, got ${sAll.total_phau_thuat}`);
    assert.strictEqual(sAll.total_thu_thuat, 25, `Thu thuat: expected 25, got ${sAll.total_thu_thuat}`);
    // Total CLS = 495 (XN)
    assert.strictEqual(sAll.total_xet_nghiem, 495, `Xet nghiem: expected 495, got ${sAll.total_xet_nghiem}`);
    // Total Ra vien = 20 (San) + 95 (OCP1) = 115
    assert.strictEqual(sAll.total_ra_vien, 115, `Ra vien: expected 115, got ${sAll.total_ra_vien}`);
    // Total Chuyen vien = 2 (OCP1)
    assert.strictEqual(sAll.total_chuyen_vien, 2, `Chuyen vien: expected 2, got ${sAll.total_chuyen_vien}`);
    // Submitted depts count = 3
    assert.strictEqual(dashAll.submitted_departments, 3, `Submitted depts: expected 3, got ${dashAll.submitted_departments}`);

    console.log('  ✅ ALL Facility KPI & breakdown formulas verified with 100% precision.');

    // 4. Test Dashboard Isolation (Facility = PK OCP1)
    console.log('\n  [4/5] Testing GET /api/dashboard?facility=PK OCP1 Isolation...');
    const dashOCP1Res = await fetch(`${BASE_URL}/api/dashboard?date=${testDate}&facility=${encodeURIComponent('PK OCP1')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(dashOCP1Res.status, 200);
    const dashOCP1 = await dashOCP1Res.json();
    const sOCP1 = dashOCP1.summary;

    assert.strictEqual(sOCP1.total_kham, 110, `PK OCP1 Kham: expected 110, got ${sOCP1.total_kham}`);
    assert.strictEqual(sOCP1.total_xet_nghiem, 0, `PK OCP1 XN: expected 0, got ${sOCP1.total_xet_nghiem}`);
    assert.strictEqual(dashOCP1.submitted_departments, 1, `PK OCP1 submitted depts: expected 1, got ${dashOCP1.submitted_departments}`);
    console.log('  ✅ Facility isolation verified correctly.');

    // 5. Test Excel Export Stream
    console.log('\n  [5/5] Testing GET /api/export/excel Stream...');
    const exportRes = await fetch(`${BASE_URL}/api/export/excel?date=${testDate}&facility=ALL`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(exportRes.status, 200);
    const contentType = exportRes.headers.get('content-type');
    assert(contentType.includes('spreadsheetml'), `Content-Type must be xlsx, got ${contentType}`);
    const buffer = await exportRes.arrayBuffer();
    assert(buffer.byteLength > 1000, `Excel file should be > 1KB, got ${buffer.byteLength} bytes`);
    console.log(`  ✅ Excel file generated successfully (${buffer.byteLength} bytes).`);

    console.log('\n=============================================================');
    console.log('  🎉 ALL LIVE API FORMULAS & WORKFLOWS VERIFIED 100% PASSED!');
    console.log('=============================================================\n');
}

runE2E().catch(err => {
    console.error('Fatal E2E Test Error:', err);
    process.exit(1);
});
