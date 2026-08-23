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

const BASE_URL = 'http://127.0.0.1:8080';

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

    // 3. Fetch Dashboard for 'Bệnh viện'
    const resBV = await fetch(`${BASE_URL}/api/dashboard?date=${targetDate}&facility=${encodeURIComponent('Bệnh viện')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataBV = await resBV.json();
    const sumBV = dataBV.summary;

    // 4. Fetch Dashboard for 'PK OCP1'
    const resOCP1 = await fetch(`${BASE_URL}/api/dashboard?date=${targetDate}&facility=${encodeURIComponent('PK OCP1')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataOCP1 = await resOCP1.json();
    const sumOCP1 = dataOCP1.summary;

    // 5. Fetch Dashboard for 'PK OCP2'
    const resOCP2 = await fetch(`${BASE_URL}/api/dashboard?date=${targetDate}&facility=${encodeURIComponent('PK OCP2')}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const dataOCP2 = await resOCP2.json();
    const sumOCP2 = dataOCP2.summary;

    console.log(`📊 BẢNG SO SÁNH TỔNG HỢP THEO TỪNG CƠ SỞ NGÀY ${targetDate}:\n`);

    const comparisonTable = [
        {
            'Chỉ Số KPI': '1. Tổng Lượt Khám',
            'Bệnh Viện': sumBV.total_kham,
            'PK OCP1': sumOCP1.total_kham,
            'PK OCP2': sumOCP2.total_kham,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_kham + sumOCP1.total_kham + sumOCP2.total_kham,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_kham,
            'Khớp 100%': (sumBV.total_kham + sumOCP1.total_kham + sumOCP2.total_kham === sumAll.total_kham) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '2. Khám Cấp Cứu',
            'Bệnh Viện': sumBV.total_cap_cuu,
            'PK OCP1': sumOCP1.total_cap_cuu,
            'PK OCP2': sumOCP2.total_cap_cuu,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_cap_cuu + sumOCP1.total_cap_cuu + sumOCP2.total_cap_cuu,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_cap_cuu,
            'Khớp 100%': (sumBV.total_cap_cuu + sumOCP1.total_cap_cuu + sumOCP2.total_cap_cuu === sumAll.total_cap_cuu) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '3. Vào Viện',
            'Bệnh Viện': sumBV.total_vao_vien,
            'PK OCP1': sumOCP1.total_vao_vien,
            'PK OCP2': sumOCP2.total_vao_vien,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_vao_vien + sumOCP1.total_vao_vien + sumOCP2.total_vao_vien,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_vao_vien,
            'Khớp 100%': (sumBV.total_vao_vien + sumOCP1.total_vao_vien + sumOCP2.total_vao_vien === sumAll.total_vao_vien) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '4. Phẫu Thuật (Mổ)',
            'Bệnh Viện': sumBV.total_phau_thuat,
            'PK OCP1': sumOCP1.total_phau_thuat,
            'PK OCP2': sumOCP2.total_phau_thuat,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_phau_thuat + sumOCP1.total_phau_thuat + sumOCP2.total_phau_thuat,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_phau_thuat,
            'Khớp 100%': (sumBV.total_phau_thuat + sumOCP1.total_phau_thuat + sumOCP2.total_phau_thuat === sumAll.total_phau_thuat) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '4b. Thủ Thuật',
            'Bệnh Viện': sumBV.total_thu_thuat,
            'PK OCP1': sumOCP1.total_thu_thuat,
            'PK OCP2': sumOCP2.total_thu_thuat,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_thu_thuat + sumOCP1.total_thu_thuat + sumOCP2.total_thu_thuat,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_thu_thuat,
            'Khớp 100%': (sumBV.total_thu_thuat + sumOCP1.total_thu_thuat + sumOCP2.total_thu_thuat === sumAll.total_thu_thuat) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '5. Xét Nghiệm',
            'Bệnh Viện': sumBV.total_xet_nghiem,
            'PK OCP1': sumOCP1.total_xet_nghiem,
            'PK OCP2': sumOCP2.total_xet_nghiem,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_xet_nghiem + sumOCP1.total_xet_nghiem + sumOCP2.total_xet_nghiem,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_xet_nghiem,
            'Khớp 100%': (sumBV.total_xet_nghiem + sumOCP1.total_xet_nghiem + sumOCP2.total_xet_nghiem === sumAll.total_xet_nghiem) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '5b. Chẩn Đoán Hình Ảnh',
            'Bệnh Viện': sumBV.total_cdha,
            'PK OCP1': sumOCP1.total_cdha,
            'PK OCP2': sumOCP2.total_cdha,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_cdha + sumOCP1.total_cdha + sumOCP2.total_cdha,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_cdha,
            'Khớp 100%': (sumBV.total_cdha + sumOCP1.total_cdha + sumOCP2.total_cdha === sumAll.total_cdha) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '5c. Điện Quang Can Thiệp',
            'Bệnh Viện': sumBV.total_dqct,
            'PK OCP1': sumOCP1.total_dqct,
            'PK OCP2': sumOCP2.total_dqct,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_dqct + sumOCP1.total_dqct + sumOCP2.total_dqct,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_dqct,
            'Khớp 100%': (sumBV.total_dqct + sumOCP1.total_dqct + sumOCP2.total_dqct === sumAll.total_dqct) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '6. Ra Viện',
            'Bệnh Viện': sumBV.total_ra_vien,
            'PK OCP1': sumOCP1.total_ra_vien,
            'PK OCP2': sumOCP2.total_ra_vien,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_ra_vien + sumOCP1.total_ra_vien + sumOCP2.total_ra_vien,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_ra_vien,
            'Khớp 100%': (sumBV.total_ra_vien + sumOCP1.total_ra_vien + sumOCP2.total_ra_vien === sumAll.total_ra_vien) ? '✅ KHỚP' : '❌ LỆCH'
        },
        {
            'Chỉ Số KPI': '6b. Chuyển Viện',
            'Bệnh Viện': sumBV.total_chuyen_vien,
            'PK OCP1': sumOCP1.total_chuyen_vien,
            'PK OCP2': sumOCP2.total_chuyen_vien,
            'Tổng (BV + OCP1 + OCP2)': sumBV.total_chuyen_vien + sumOCP1.total_chuyen_vien + sumOCP2.total_chuyen_vien,
            'Tất Cả Cơ Sở (ALL)': sumAll.total_chuyen_vien,
            'Khớp 100%': (sumBV.total_chuyen_vien + sumOCP1.total_chuyen_vien + sumOCP2.total_chuyen_vien === sumAll.total_chuyen_vien) ? '✅ KHỚP' : '❌ LỆCH'
        }
    ];

    console.table(comparisonTable);

    // Strict Mathematical Assertions:
    assert.strictEqual(sumBV.total_kham + sumOCP1.total_kham + sumOCP2.total_kham, sumAll.total_kham);
    assert.strictEqual(sumBV.total_cap_cuu + sumOCP1.total_cap_cuu + sumOCP2.total_cap_cuu, sumAll.total_cap_cuu);
    assert.strictEqual(sumBV.total_vao_vien + sumOCP1.total_vao_vien + sumOCP2.total_vao_vien, sumAll.total_vao_vien);
    assert.strictEqual(sumBV.total_phau_thuat + sumOCP1.total_phau_thuat + sumOCP2.total_phau_thuat, sumAll.total_phau_thuat);
    assert.strictEqual(sumBV.total_thu_thuat + sumOCP1.total_thu_thuat + sumOCP2.total_thu_thuat, sumAll.total_thu_thuat);
    assert.strictEqual(sumBV.total_xet_nghiem + sumOCP1.total_xet_nghiem + sumOCP2.total_xet_nghiem, sumAll.total_xet_nghiem);
    assert.strictEqual(sumBV.total_cdha + sumOCP1.total_cdha + sumOCP2.total_cdha, sumAll.total_cdha);
    assert.strictEqual(sumBV.total_dqct + sumOCP1.total_dqct + sumOCP2.total_dqct, sumAll.total_dqct);
    assert.strictEqual(sumBV.total_ra_vien + sumOCP1.total_ra_vien + sumOCP2.total_ra_vien, sumAll.total_ra_vien);
    assert.strictEqual(sumBV.total_chuyen_vien + sumOCP1.total_chuyen_vien + sumOCP2.total_chuyen_vien, sumAll.total_chuyen_vien);

    console.log('\n========================================================================================');
    console.log('  🎉 TẤT CẢ 10/10 CHỈ SỐ: ALL = BỆNH VIỆN + PK OCP1 + PK OCP2 KHỚP TOÁN HỌC 100%!');
    console.log('========================================================================================\n');
}

verifyFacilityAggregation().catch(err => {
    console.error('Fatal facility test error:', err);
    process.exit(1);
});
