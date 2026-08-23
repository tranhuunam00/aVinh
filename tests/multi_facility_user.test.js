/**
 * Multi-Facility & Multi-Department User Security & Workflow Test Suite
 */

const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:8080';

async function testMultiFacilityUser() {
    console.log('\n=============================================================');
    console.log('  🧪 TESTING MULTI-FACILITY & MULTI-DEPARTMENT USER SECURITY');
    console.log('=============================================================\n');

    // 1. Login as Super Admin
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Vinmec@2026' })
    });
    const adminData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login failed');
    const adminToken = adminData.token;
    console.log('  ✅ 1. Super Admin logged in successfully.');

    // 2. Create / Update test user with multi-facility and multi-department
    const testUsername = 'dr_multi';
    const testPassword = 'Password@2026';
    const testFacilities = 'PK OCP1, PK OCP2';
    const testDepts = 'Phụ sản, Xét nghiệm';

    // Check if user exists
    const usersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const usersData = await usersRes.json();
    const existing = (usersData.users || []).find(u => u.username === testUsername);

    let testUserId;
    if (existing) {
        testUserId = existing.id;
        await fetch(`${BASE_URL}/api/users/${testUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                full_name: 'Bác Sĩ Phụ Trách Liên Cơ Sở',
                facility: testFacilities,
                department: testDepts,
                role: 'department',
                is_active: 1,
                new_password: testPassword
            })
        });
    } else {
        const createRes = await fetch(`${BASE_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({
                username: testUsername,
                password: testPassword,
                full_name: 'Bác Sĩ Phụ Trách Liên Cơ Sở',
                facility: testFacilities,
                department: testDepts,
                role: 'department'
            })
        });
        const createData = await createRes.json();
        assert.strictEqual(createRes.status, 201, `Create user failed: ${createData.error}`);
        testUserId = createData.userId;
    }
    console.log(`  ✅ 2. User "${testUsername}" configured with:`);
    console.log(`     - Facilities : [${testFacilities}]`);
    console.log(`     - Departments: [${testDepts}]`);

    // 3. Login as test user
    const userLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: testPassword })
    });
    const userData = await userLoginRes.json();
    assert.strictEqual(userLoginRes.status, 200, `User login failed: ${userData.error}`);
    const userToken = userData.token;
    console.log('  ✅ 3. Test user logged in successfully.');

    const targetDate = '2026-12-01';

    // 4. Test Authorized Submission 1: PK OCP1 + Phụ sản (ALLOWED)
    const sub1Res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({
            report_date: targetDate,
            facility: 'PK OCP1',
            department: 'Phụ sản',
            data: { kham_benh: { "Khám chuyên khoa": 15 } }
        })
    });
    assert([200, 201].includes(sub1Res.status), `Submission for PK OCP1 + Phụ sản should succeed, got ${sub1Res.status}`);
    console.log('  ✅ 4. Authorized submission for (PK OCP1, Phụ sản) SUCCEEDED.');

    // 5. Test Authorized Submission 2: PK OCP2 + Xét nghiệm (ALLOWED)
    const sub2Res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({
            report_date: targetDate,
            facility: 'PK OCP2',
            department: 'Xét nghiệm',
            data: { xet_nghiem: { "Sinh hóa": 50 } }
        })
    });
    assert([200, 201].includes(sub2Res.status), `Submission for PK OCP2 + Xét nghiệm should succeed, got ${sub2Res.status}`);
    console.log('  ✅ 5. Authorized submission for (PK OCP2, Xét nghiệm) SUCCEEDED.');

    // 6. Test Unauthorized Facility: Bệnh viện c (or Bệnh viện) + Phụ sản (FORBIDDEN)
    const facRes = await fetch(`${BASE_URL}/api/facilities`);
    const facData = await facRes.json();
    const bvFac = facData.facilities.find(f => f.name.startsWith('Bệnh viện')) || { name: 'Bệnh viện' };

    const unauthFacRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({
            report_date: targetDate,
            facility: bvFac.name,
            department: 'Phụ sản',
            data: { kham_benh: { "Khám chuyên khoa": 10 } }
        })
    });
    assert.strictEqual(unauthFacRes.status, 403, `Submission for unauthorized facility ${bvFac.name} must be 403 Forbidden`);
    console.log(`  ✅ 6. Security verified: Unauthorized facility (${bvFac.name}) correctly rejected with 403 Forbidden.`);

    // 7. Test Unauthorized Department: PK OCP1 + Cấp cứu (FORBIDDEN)
    const unauthDeptRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
        body: JSON.stringify({
            report_date: targetDate,
            facility: 'PK OCP1',
            department: 'Cấp cứu',
            data: { kham_benh: { "Khám cấp cứu": 5 } }
        })
    });
    assert.strictEqual(unauthDeptRes.status, 403, 'Submission for unauthorized department (Cấp cứu) must be 403 Forbidden');
    console.log('  ✅ 7. Security verified: Unauthorized department (Cấp cứu) correctly rejected with 403 Forbidden.');

    // 8. Cleanup test user & data
    const { run } = require('../src/config/database');
    await run("DELETE FROM daily_reports WHERE report_date = ?", [targetDate]);
    await fetch(`${BASE_URL}/api/users/${testUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log('  ✅ 8. Cleaned up test user and records.');

    console.log('\n=============================================================');
    console.log('  🎉 MULTI-FACILITY & MULTI-DEPARTMENT SECURITY PASSED 100%!');
    console.log('=============================================================\n');
}

testMultiFacilityUser().catch(err => {
    console.error('Multi-facility user test failed:', err);
    process.exit(1);
});
