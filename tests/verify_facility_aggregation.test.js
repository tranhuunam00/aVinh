/**
 * Test & Verification for Facility Aggregation:
 * 1. Mode: Tất cả cơ sở (ALL)
 * 2. Mode: Bệnh viện (Single facility)
 * 3. Mode: PK OCP1 (Single facility)
 * 4. Mode: PK OCP2 (Single facility)
 *
 * Proves mathematically that: ALL = Bệnh viện + PK OCP1 + PK OCP2
 */

const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:4001';

async function verifyFacilityAggregation() {
    console.log('\n========================================================================================');
    console.log('  🏥 KIỂM TRA ĐỒNG BỘ TOÀN DIỆN: TẤT CẢ CƠ SỞ (ALL) VS TỪNG CƠ SỞ ĐƠN LẺ');
    console.log('========================================================================================\n');

    // 1. Admin logs in
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Vinmec@2026' })
    });
    const { token } = await loginRes.json();

    const targetDate = '2026-08-23';

    // 2. Fetch Dashboard for ALL
    const resAll = await fetch(`${BASE_URL}/api/dashboard?date=${targetDate}&facility=ALL`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataAll = await resAll.json();
    const sumAll = dataAll.summary;

    // 3. Dynamically fetch all facilities from database
    const facRes = await fetch(`${BASE_URL}/api/facilities`);
    const facData = await facRes.json();
    const facilityList = facData.facilities.map(f => f.name);

    console.log(`Đang kiểm tra tổng hợp cho ${facilityList.length} cơ sở:`, facilityList);

    const facilitySummaries = [];
    for (const fac of facilityList) {
        const res = await fetch(`${BASE_URL}/api/dashboard?date=${targetDate}&facility=${encodeURIComponent(fac)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        facilitySummaries.push({ name: fac, summary: data.summary });
    }

    const aggregated = {
        total_kham: facilitySummaries.reduce((a, c) => a + c.summary.total_kham, 0),
        total_cap_cuu: facilitySummaries.reduce((a, c) => a + c.summary.total_cap_cuu, 0),
        total_vao_vien: facilitySummaries.reduce((a, c) => a + c.summary.total_vao_vien, 0),
        total_phau_thuat: facilitySummaries.reduce((a, c) => a + c.summary.total_phau_thuat, 0),
        total_thu_thuat: facilitySummaries.reduce((a, c) => a + c.summary.total_thu_thuat, 0),
        total_xet_nghiem: facilitySummaries.reduce((a, c) => a + c.summary.total_xet_nghiem, 0),
        total_cdha: facilitySummaries.reduce((a, c) => a + c.summary.total_cdha, 0),
        total_dqct: facilitySummaries.reduce((a, c) => a + c.summary.total_dqct, 0),
        total_ra_vien: facilitySummaries.reduce((a, c) => a + c.summary.total_ra_vien, 0),
        total_chuyen_vien: facilitySummaries.reduce((a, c) => a + c.summary.total_chuyen_vien, 0),
    };

    console.log(`\n📊 BẢNG SO SÁNH TỔNG HỢP THEO TỪNG CƠ SỞ NGÀY ${targetDate}:\n`);

    const comparisonTable = [
        {
            'Chỉ Số KPI': '1. Tổng Lượt Khám',
            'Tổng Từng Cơ Sở': aggregated.total_kham,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_kham,
            'Khớp 100%': (aggregated.total_kham === sumAll.total_kham) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '2. Khám Cấp Cứu',
            'Tổng Từng Cơ Sở': aggregated.total_cap_cuu,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_cap_cuu,
            'Khớp 100%': (aggregated.total_cap_cuu === sumAll.total_cap_cuu) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '3. Vào Viện',
            'Tổng Từng Cơ Sở': aggregated.total_vao_vien,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_vao_vien,
            'Khớp 100%': (aggregated.total_vao_vien === sumAll.total_vao_vien) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '4. Phẫu Thuật (Mổ)',
            'Tổng Từng Cơ Sở': aggregated.total_phau_thuat,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_phau_thuat,
            'Khớp 100%': (aggregated.total_phau_thuat === sumAll.total_phau_thuat) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '4b. Thủ Thuật',
            'Tổng Từng Cơ Sở': aggregated.total_thu_thuat,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_thu_thuat,
            'Khớp 100%': (aggregated.total_thu_thuat === sumAll.total_thu_thuat) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '5. Xét Nghiệm',
            'Tổng Từng Cơ Sở': aggregated.total_xet_nghiem,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_xet_nghiem,
            'Khớp 100%': (aggregated.total_xet_nghiem === sumAll.total_xet_nghiem) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '5b. Chẩn Đoán Hình Ảnh',
            'Tổng Từng Cơ Sở': aggregated.total_cdha,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_cdha,
            'Khớp 100%': (aggregated.total_cdha === sumAll.total_cdha) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '5c. Điện Quang Can Thiệp',
            'Tổng Từng Cơ Sở': aggregated.total_dqct,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_dqct,
            'Khớp 100%': (aggregated.total_dqct === sumAll.total_dqct) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '6. Ra Viện',
            'Tổng Từng Cơ Sở': aggregated.total_ra_vien,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_ra_vien,
            'Khớp 100%': (aggregated.total_ra_vien === sumAll.total_ra_vien) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '6b. Chuyển Viện',
            'Tổng Từng Cơ Sở': aggregated.total_chuyen_vien,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_chuyen_vien,
            'Khớp 100%': (aggregated.total_chuyen_vien === sumAll.total_chuyen_vien) ? '✅ KHỚP' : '❌ LỆCH'
        }
    ];

    console.table(comparisonTable);

    // Strict Mathematical Assertions:
    assert.strictEqual(aggregated.total_kham, sumAll.total_kham);
    assert.strictEqual(aggregated.total_cap_cuu, sumAll.total_cap_cuu);
    assert.strictEqual(aggregated.total_vao_vien, sumAll.total_vao_vien);
    assert.strictEqual(aggregated.total_phau_thuat, sumAll.total_phau_thuat);
    assert.strictEqual(aggregated.total_thu_thuat, sumAll.total_thu_thuat);
    assert.strictEqual(aggregated.total_xet_nghiem, sumAll.total_xet_nghiem);
    assert.strictEqual(aggregated.total_cdha, sumAll.total_cdha);
    assert.strictEqual(aggregated.total_dqct, sumAll.total_dqct);
    assert.strictEqual(aggregated.total_ra_vien, sumAll.total_ra_vien);
    assert.strictEqual(aggregated.total_chuyen_vien, sumAll.total_chuyen_vien);

    console.log('\n========================================================================================');
    console.log('  🎉 TẤT CẢ 10/10 CHỈ SỐ: ALL = BỆNH VIỆN + PK OCP1 + PK OCP2 KHỚP TOÁN HỌC 100%!');
    console.log('========================================================================================\n');
}

verifyFacilityAggregation().catch(err => {
    console.error('Fatal facility test error:', err);
    process.exit(1);
});
