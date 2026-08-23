/**
 * Full 17 Department Accounts Migration & Security Test Suite
 */

const assert = require('assert');
const { initDatabase, all, get } = require('../src/config/database');

const BASE_URL = 'http://127.0.0.1:4001';

const EXPECTED_ACCOUNTS = [
    { username: 'baocao_capcuu', dept: 'Cấp cứu' },
    { username: 'baocao_khambenh', dept: 'Khám bệnh' },
    { username: 'baocao_ranghammat', dept: 'Răng hàm mặt' },
    { username: 'baocao_taimuihong', dept: 'Tai mũi họng' },
    { username: 'baocao_nhankhoa', dept: 'Nhãn khoa' },
    { username: 'baocao_dalieu', dept: 'Da liễu' },
    { username: 'baocao_vaccine', dept: 'Vaccine' },
    { username: 'baocao_noi', dept: 'Nội tổng hợp' },
    { username: 'baocao_ngoai', dept: 'Ngoại tổng hợp' },
    { username: 'baocao_ctch', dept: 'Chấn thương chỉnh hình' },
    { username: 'baocao_tkcs', dept: 'Thần kinh cột sống' },
    { username: 'baocao_phcn', dept: 'Phục hồi chức năng' },
    { username: 'baocao_san', dept: 'Phụ sản' },
    { username: 'baocao_nhi', dept: 'Nhi sơ sinh' },
    { username: 'baocao_xetnghiem', dept: 'Xét nghiệm' },
    { username: 'baocao_cdha', dept: 'Chẩn đoán hình ảnh' },
    { username: 'baocao_dqct', dept: 'Điện quang can thiệp' }
];

async function runTest() {
    console.log('\n========================================================================');
    console.log('  🧪 TESTING ALL 17 DEPARTMENT ACCOUNTS MIGRATION & PERMISSION LOCK');
    console.log('========================================================================\n');

    // 1. Run DB Migration
    await initDatabase();

    // 2. Query Users in Database
    const users = await all("SELECT id, username, full_name, role, department, facility FROM users ORDER BY id ASC");
    console.log(`  📊 Total users in database: ${users.length}`);
    
    // Verify admin exists
    const adminUser = users.find(u => u.username === 'admin');
    assert(adminUser, 'Admin account must exist');
    assert.strictEqual(adminUser.role, 'admin');
    console.log('  ✅ 1. Super Admin (admin) verified.');

    // Verify all 17 department accounts exist and are mapped to exact single department
    for (const exp of EXPECTED_ACCOUNTS) {
        const u = users.find(user => user.username === exp.username);
        assert(u, `User ${exp.username} must exist in database`);
        assert.strictEqual(u.department, exp.dept, `User ${exp.username} department must be ${exp.dept}, got ${u.department}`);
        assert.strictEqual(u.role, 'department');
    }
    console.log('  ✅ 2. All 17 department accounts verified in database.');

    // 3. Test Login for each of the 17 accounts via API
    for (const exp of EXPECTED_ACCOUNTS) {
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: exp.username, password: 'Vinmec@2026' })
        });
        const loginData = await loginRes.json();
        assert.strictEqual(loginRes.status, 200, `Login for ${exp.username} failed: ${loginData.error}`);
        assert(loginData.token, `Login for ${exp.username} must return a JWT token`);
        assert.strictEqual(loginData.user.department, exp.dept);
    }
    console.log('  ✅ 3. All 17 department accounts logged in successfully with password "Vinmec@2026".');

    // 4. Test Security: baocao_san cannot submit report for Cấp cứu (403 Forbidden)
    const sanLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'baocao_san', password: 'Vinmec@2026' })
    });
    const sanToken = (await sanLoginRes.json()).token;

    const hackRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sanToken}` },
        body: JSON.stringify({
            report_date: '2026-12-31',
            facility: 'BV VMOCP2',
            department: 'Cấp cứu', // Unauthorized department for baocao_san!
            data: { kham_benh: { "Khám cấp cứu": 99 } }
        })
    });
    assert.strictEqual(hackRes.status, 403, 'Cross-department submission must be rejected with 403 Forbidden');
    console.log('  ✅ 4. Security confirmed: baocao_san strictly blocked from submitting to Cấp cứu (403 Forbidden).');

    // 5. Test Authorized: baocao_san CAN submit report for Phụ sản (200/201 Success)
    const legitRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sanToken}` },
        body: JSON.stringify({
            report_date: '2026-12-31',
            facility: 'BV VMOCP2',
            department: 'Phụ sản',
            data: { kham_benh: { "Khám chuyên khoa": 12 } }
        })
    });
    assert([200, 201].includes(legitRes.status), `Legit submission for Phụ sản should succeed, got ${legitRes.status}`);
    console.log('  ✅ 5. Authorized submission for baocao_san -> Phụ sản SUCCEEDED.');

    // Cleanup test record
    const { run } = require('../src/config/database');
    await run("DELETE FROM daily_reports WHERE report_date = '2026-12-31'");

    console.log('\n========================================================================');
    console.log('  🎉 ALL 17 DEPARTMENT ACCOUNTS MIGRATED & VERIFIED 100% WORKING!');
    console.log('========================================================================\n');
}

runTest().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
