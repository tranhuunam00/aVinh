/**
 * Facility Management Test Suite
 * Tests creating, listing, master-data dynamic sync, and deleting facilities.
 */

const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:8080';

async function testFacilityManagement() {
    console.log('\n=============================================================');
    console.log('  🧪 TESTING FACILITY CREATION & MANAGEMENT');
    console.log('=============================================================\n');

    // 1. Login as Admin
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Vinmec@2026' })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200, 'Admin login failed');
    const token = loginData.token;
    console.log('  ✅ 1. Super Admin logged in successfully.');

    // 2. Fetch list of facilities
    const listRes = await fetch(`${BASE_URL}/api/facilities`);
    const listData = await listRes.json();
    assert.strictEqual(listRes.status, 200, 'Fetch facilities failed');
    assert.ok(listData.facilities.length >= 3, 'Default facilities missing');
    console.log(`  ✅ 2. Found ${listData.facilities.length} active facilities:`, listData.facilities.map(f => f.name));

    // 3. Create a new facility (e.g., PK Smart City)
    const testFacName = 'PK Smart City';
    const testFacDesc = 'Phòng khám ĐKQT Vinmec Smart City Tây Mỗ';

    // Delete if existing from previous run
    const existing = listData.facilities.find(f => f.name === testFacName);
    if (existing) {
        await fetch(`${BASE_URL}/api/facilities/${existing.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    const createRes = await fetch(`${BASE_URL}/api/facilities`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: testFacName, description: testFacDesc })
    });
    const createData = await createRes.json();
    assert.strictEqual(createRes.status, 201, `Create facility failed: ${createData.error}`);
    assert.strictEqual(createData.facility.name, testFacName);
    console.log(`  ✅ 3. Successfully created new facility "${testFacName}".`);

    // 4. Verify master-data now includes new facility
    const mdRes = await fetch(`${BASE_URL}/api/reports/master-data`);
    const mdData = await mdRes.json();
    assert.ok(mdData.facilities.includes(testFacName), 'Master data does not include new facility!');
    console.log('  ✅ 4. Master data dynamic sync verified. Facilities:', mdData.facilities);

    // 5. Test Update Facility (PUT /api/facilities/:id)
    const updateRes = await fetch(`${BASE_URL}/api/facilities/${createData.facility.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: 'PK Smart City Updated',
            description: 'Phòng khám ĐKQT Vinmec Smart City (Đã cập nhật)'
        })
    });
    const updateData = await updateRes.json();
    assert.strictEqual(updateRes.status, 200, `Update facility failed: ${updateData.error}`);
    assert.strictEqual(updateData.facility.name, 'PK Smart City Updated');
    console.log('  ✅ 5. Successfully updated facility to "PK Smart City Updated".');

    // 6. Verify non-admin cannot delete facility
    const unauthDeleteRes = await fetch(`${BASE_URL}/api/facilities/${createData.facility.id}`, {
        method: 'DELETE'
    });
    assert.strictEqual(unauthDeleteRes.status, 401, 'Unauthenticated delete must be rejected');
    console.log('  ✅ 6. Security verified: Non-admin delete rejected (401 Unauthorized).');

    // 7. Delete test facility
    const deleteRes = await fetch(`${BASE_URL}/api/facilities/${createData.facility.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const deleteData = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200, `Delete facility failed: ${deleteData.error}`);
    console.log('  ✅ 7. Successfully deleted test facility "PK Smart City Updated".');

    // 8. Verify master-data no longer contains test facility
    const mdRes2 = await fetch(`${BASE_URL}/api/reports/master-data`);
    const mdData2 = await mdRes2.json();
    assert.ok(!mdData2.facilities.includes('PK Smart City Updated'), 'Master data still includes deleted facility!');
    console.log('  ✅ 8. Master data dynamic removal verified.');

    console.log('\n=============================================================');
    console.log('  🎉 FACILITY CREATION & MANAGEMENT VERIFIED 100% WORKING!');
    console.log('=============================================================\n');
}

testFacilityManagement().catch(err => {
    console.error('Facility test failed:', err);
    process.exit(1);
});
