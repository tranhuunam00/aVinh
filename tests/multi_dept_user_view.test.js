/**
 * Test Multi-Department Account (e.g., namth) Viewing Reports Submitted by Admin
 */

const assert = require('assert');
const { get, run } = require('../src/config/database');
const bcrypt = require('bcryptjs');

const BASE_URL = 'http://127.0.0.1:4001';

async function testMultiDeptUserView() {
    console.log('\n=============================================================');
    console.log('  🧪 TESTING MULTI-DEPARTMENT USER VIEW (namth)');
    console.log('=============================================================\n');

    // 1. Create or reset user namth
    const passwordHash = await bcrypt.hash('Namth@2026', 10);
    const existing = await get("SELECT id FROM users WHERE username = 'namth'");
    if (existing) {
        await run(`
            UPDATE users 
            SET department = 'Xét nghiệm, Chẩn đoán hình ảnh, Điện quang can thiệp',
                facility = 'ALL',
                password_hash = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `, [passwordHash, existing.id]);
    } else {
        await run(`
            INSERT INTO users (username, password_hash, full_name, role, department, facility, created_at, updated_at)
            VALUES ('namth', ?, 'Namth', 'department', 'Xét nghiệm, Chẩn đoán hình ảnh, Điện quang can thiệp', 'ALL', datetime('now'), datetime('now'))
        `, [passwordHash]);
    }
    console.log('  ✅ User namth ready with assigned departments: [Xét nghiệm, Chẩn đoán hình ảnh, Điện quang can thiệp] and facility: ALL.');

    // 2. Admin logs in
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Vinmec@2026' })
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.token;
    console.log('  ✅ Admin logged in.');

    // 3. Admin submits report for PK OCP1 - Chẩn đoán hình ảnh on 2026-08-23
    const submitRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
            report_date: '2026-08-23',
            facility: 'PK OCP1',
            department: 'Chẩn đoán hình ảnh',
            data: {
                cdha: {
                    "Siêu âm": 1,
                    "Siêu âm ABUS": 1,
                    "XQ Tổng quát": 2,
                    "XQ Panorama": 1,
                    "XQ Mammo": 0,
                    "MSCT": 0,
                    "CBCT": 0,
                    "MRI": 0,
                    "DEXA": 0,
                    "Teleradiology": 0
                }
            }
        })
    });
    assert([200, 201].includes(submitRes.status), 'Admin submission failed');
    console.log('  ✅ Admin submitted report for (2026-08-23, PK OCP1, Chẩn đoán hình ảnh).');

    // 4. User namth logs in
    const namthLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'namth', password: 'Namth@2026' })
    });
    const namthData = await namthLoginRes.json();
    const namthToken = namthData.token;
    console.log('  ✅ User namth logged in successfully.');

    // 5. User namth queries reports for (2026-08-23, PK OCP1, Chẩn đoán hình ảnh)
    const namthFetchRes = await fetch(`${BASE_URL}/api/reports?date=2026-08-23&facility=PK%20OCP1&department=Ch%E1%BA%A9n%20%C4%91o%C3%A1n%20h%C3%ACnh%20%E1%BA%A3nh`, {
        headers: { 'Authorization': `Bearer ${namthToken}` }
    });
    const namthFetchData = await namthFetchRes.json();
    console.log(`  - Fetch response reports count: ${namthFetchData.reports ? namthFetchData.reports.length : 0}`);

    assert(namthFetchData.reports && namthFetchData.reports.length === 1, 'namth should see exactly 1 report');
    const report = namthFetchData.reports[0];
    assert.strictEqual(report.department, 'Chẩn đoán hình ảnh');
    assert.strictEqual(report.facility, 'PK OCP1');
    assert.strictEqual(report.data.cdha['Siêu âm'], 1);
    assert.strictEqual(report.data.cdha['Siêu âm ABUS'], 1);
    assert.strictEqual(report.data.cdha['XQ Tổng quát'], 2);
    assert.strictEqual(report.data.cdha['XQ Panorama'], 1);

    console.log('  ✅ User namth successfully retrieved and verified the data submitted by Admin!');
    console.log('\n=============================================================');
    console.log('  🎉 MULTI-DEPARTMENT DATA SHARING VERIFIED 100% WORKING!');
    console.log('=============================================================\n');
}

testMultiDeptUserView().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
