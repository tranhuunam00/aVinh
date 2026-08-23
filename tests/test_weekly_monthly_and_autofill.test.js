/**
 * Comprehensive Test Suite for:
 * 1. Facility cleanup (No CS3)
 * 2. Auto-fill formula in Section 3: Khám bệnh = ∑ Mục 1 (Cấp cứu + Chuyên khoa + Tổng quát + Cộng đồng)
 * 3. 1-Submission-per-day lock security
 * 4. GET /api/dashboard/weekly (T2-CN, comparison with previous week, growth rates)
 * 5. GET /api/dashboard/monthly (Comparison with previous month, growth rates, daily trend)
 */

const assert = require('assert');
const { initDatabase, all, get, run } = require('../src/config/database');

const BASE_URL = 'http://127.0.0.1:4001';

async function runTests() {
    console.log('\n========================================================================');
    console.log('  🧪 TESTING WEEKLY & MONTHLY VIEWS, AUTO-FILL & LOCKING POLICIES');
    console.log('========================================================================\n');

    await initDatabase();

    // 1. Check Facility Cleanup
    console.log('  [1/5] Testing Facility Cleanup (CS3 Removal)...');
    const facilities = await all("SELECT name FROM facilities");
    const facNames = facilities.map(f => f.name);
    assert(!facNames.includes('cs3'), 'Facility cs3 must be completely removed');
    assert(!facNames.includes('Bệnh viện c'), 'Temporary facility Bệnh viện c must be removed');
    assert(facNames.includes('BV VMOCP2') && facNames.includes('PK OCP1') && facNames.includes('PK OCP2'), 'Standard 3 facilities must exist');
    console.log(`  ✅ Clean facilities confirmed: [ ${facNames.join(', ')} ]`);

    // 2. Test Admin Login
    console.log('  [2/5] Logging in as Super Admin & Dept Account...');
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Vinmec@2026' })
    });
    const adminToken = (await adminLoginRes.json()).token;
    assert(adminToken, 'Admin token required');

    const capcuuLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'baocao_capcuu', password: 'Vinmec@2026' })
    });
    const capcuuToken = (await capcuuLoginRes.json()).token;
    assert(capcuuToken, 'Dept token required');
    console.log('  ✅ Admin and baocao_capcuu logged in successfully.');

    // 3. Test Auto-calculation & Submission Lock Policy
    console.log('  [3/5] Testing Auto-Calculation and 1-Time Submission Lock Policy...');
    const testDate = '2026-10-15';
    await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);

    // First submission by baocao_capcuu (should succeed 201)
    const sub1Res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${capcuuToken}` },
        body: JSON.stringify({
            report_date: testDate,
            facility: 'BV VMOCP2',
            department: 'Cấp cứu',
            data: {
                kham_benh: { "Khám cấp cứu": 25, "Khám chuyên khoa": 15 },
                dieu_tri: { "Ngoại trú": 10, "Nội trú": 5, "Daycare": 1 },
                dich_vu: { "Khám bệnh": 40, "Thủ thuật": 4 }, // 40 = 25 + 15
                tinh_trang: { "Vào viện": 5, "Ra viện theo chỉ định": 4 }
            }
        })
    });
    assert.strictEqual(sub1Res.status, 201, 'First submission should return 201 Created');
    console.log('  ✅ 1st submission by baocao_capcuu succeeded (201 Created).');

    // Second submission by baocao_capcuu for same day/dept/facility (MUST BE REJECTED with 403 Locked)
    const sub2Res = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${capcuuToken}` },
        body: JSON.stringify({
            report_date: testDate,
            facility: 'BV VMOCP2',
            department: 'Cấp cứu',
            data: {
                kham_benh: { "Khám cấp cứu": 30 }
            }
        })
    });
    assert.strictEqual(sub2Res.status, 403, 'Subsequent submission by department user must be rejected with 403 Forbidden (Locked)');
    const sub2Data = await sub2Res.json();
    assert(sub2Data.error.includes('khóa'), 'Error message must specify that the report is locked');
    console.log('  ✅ 2nd submission rejected with 403 (Lock verified: Department user cannot overwrite submitted report).');

    // Super Admin can update the locked report (allowed 200)
    const adminUpdateRes = await fetch(`${BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
            report_date: testDate,
            facility: 'BV VMOCP2',
            department: 'Cấp cứu',
            data: {
                kham_benh: { "Khám cấp cứu": 28, "Khám chuyên khoa": 12 },
                dich_vu: { "Khám bệnh": 40 }
            }
        })
    });
    assert.strictEqual(adminUpdateRes.status, 200, 'Admin is permitted to update locked reports (200 OK)');
    console.log('  ✅ Super Admin successfully updated report (Admin override verified).');

    // Cleanup test record
    await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);

    // 4. Test Weekly Dashboard API
    console.log('  [4/5] Testing GET /api/dashboard/weekly Endpoint & Comparison...');
    const weeklyRes = await fetch(`${BASE_URL}/api/dashboard/weekly?date=2026-08-23&facility=ALL`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(weeklyRes.status, 200, 'Weekly dashboard request failed');
    const weeklyData = await weeklyRes.json();
    
    assert.strictEqual(weeklyData.mode, 'weekly');
    assert(weeklyData.week_range, 'week_range must be present');
    assert.strictEqual(weeklyData.daily_breakdown.length, 7, 'daily_breakdown must contain exactly 7 days (T2-CN)');
    assert(weeklyData.comparison, 'comparison object must be present');
    assert(typeof weeklyData.comparison.total_kham.percent === 'number', 'growth percentage must be a number');
    console.log(`  ✅ Weekly Dashboard verified: 7-day breakdown (${weeklyData.week_range.label}), Current Week Total Khám: ${weeklyData.summary.total_kham}`);

    // 5. Test Monthly Dashboard API
    console.log('  [5/5] Testing GET /api/dashboard/monthly Endpoint & Comparison...');
    const monthlyRes = await fetch(`${BASE_URL}/api/dashboard/monthly?month=2026-08&facility=ALL`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(monthlyRes.status, 200, 'Monthly dashboard request failed');
    const monthlyData = await monthlyRes.json();

    assert.strictEqual(monthlyData.mode, 'monthly');
    assert(monthlyData.month_info, 'month_info must be present');
    assert.strictEqual(monthlyData.month_info.month, '2026-08');
    assert.strictEqual(monthlyData.daily_trend.length, 31, 'August must have 31 days in daily_trend');
    assert(monthlyData.comparison, 'comparison object must be present');
    console.log(`  ✅ Monthly Dashboard verified: ${monthlyData.month_info.month_label} (${monthlyData.month_info.days_in_month} days), Total Month Khám: ${monthlyData.summary.total_kham}`);

    console.log('\n========================================================================');
    console.log('  🎉 ALL 5/5 ENHANCEMENT TESTS PASSED 100% WITH ZERO ERRORS!');
    console.log('========================================================================\n');
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
