const express = require('express');
const router = express.Router();
const { all } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const MASTER_DATA = require('../config/masterData');

// Helper to compute summary and breakdowns from an array of daily_reports DB rows
function computeSummary(rows) {
    const summary = {
        total_kham: 0,
        total_noi_tru: 0,
        total_ngoai_tru: 0,
        total_daycare: 0,
        total_phau_thuat: 0,
        total_thu_thuat: 0,
        total_cap_cuu: 0,
        total_vao_vien: 0,
        total_ra_vien: 0,
        total_chuyen_vien: 0,
        total_nang_xin_ve: 0,
        total_tu_vong: 0,
        total_xet_nghiem: 0,
        total_cdha: 0,
        total_dqct: 0,
        dept_kham_data: {},
        xet_nghiem_detail: {},
        cdha_detail: {},
        dqct_detail: {},
        service_detail: {},
        status_detail: {}
    };

    rows.forEach(r => {
        const dept = r.department;
        let d = {};
        try {
            d = typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json;
        } catch (e) {
            d = {};
        }

        const kb = d.kham_benh || {};
        const dt = d.dieu_tri || {};
        const dv = d.dich_vu || {};
        const tt = d.tinh_trang || {};
        const xn = d.xet_nghiem || {};
        const cd = d.cdha || {};
        const dq = d.dqct || {};

        // 1. Khám bệnh
        let deptKhamSum = 0;
        Object.values(kb).forEach(val => {
            deptKhamSum += parseInt(val) || 0;
        });
        if (deptKhamSum > 0) {
            summary.dept_kham_data[dept] = (summary.dept_kham_data[dept] || 0) + deptKhamSum;
        }
        summary.total_kham += deptKhamSum;

        // Cấp cứu
        summary.total_cap_cuu += parseInt(kb["Khám cấp cứu"]) || 0;

        // 2. Điều trị
        summary.total_noi_tru += parseInt(dt["Nội trú"]) || 0;
        summary.total_ngoai_tru += parseInt(dt["Ngoại trú"]) || 0;
        summary.total_daycare += parseInt(dt["Daycare"]) || 0;

        // 3. Dịch vụ (Mổ = Phẫu thuật)
        Object.entries(dv).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            summary.service_detail[k] = (summary.service_detail[k] || 0) + num;
            if (k === 'Phẫu thuật' || k === 'Phẫu thuật (Mổ)') summary.total_phau_thuat += num;
            if (k === 'Thủ thuật') summary.total_thu_thuat += num;
        });

        // 4. Tình trạng
        Object.entries(tt).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            summary.status_detail[k] = (summary.status_detail[k] || 0) + num;
            if (k === 'Vào viện') summary.total_vao_vien += num;
            if (k.includes('Ra viện')) summary.total_ra_vien += num;
            if (k === 'Chuyển viện') summary.total_chuyen_vien += num;
            if (k === 'Nặng xin về') summary.total_nang_xin_ve += num;
            if (k === 'Tử vong') summary.total_tu_vong += num;
        });

        // 5. Cận lâm sàng (XN, CĐHA, ĐQCT)
        Object.entries(xn).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            summary.xet_nghiem_detail[k] = (summary.xet_nghiem_detail[k] || 0) + num;
            summary.total_xet_nghiem += num;
        });

        Object.entries(cd).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            summary.cdha_detail[k] = (summary.cdha_detail[k] || 0) + num;
            summary.total_cdha += num;
        });

        Object.entries(dq).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            summary.dqct_detail[k] = (summary.dqct_detail[k] || 0) + num;
            summary.total_dqct += num;
        });
    });

    return summary;
}

// Calculate comparison growth between current and previous values
function calculateComparison(curr, prev) {
    const metrics = [
        'total_kham', 'total_cap_cuu', 'total_vao_vien', 'total_noi_tru', 
        'total_ngoai_tru', 'total_daycare', 'total_phau_thuat', 'total_thu_thuat',
        'total_xet_nghiem', 'total_cdha', 'total_dqct', 'total_ra_vien', 
        'total_chuyen_vien', 'total_nang_xin_ve', 'total_tu_vong'
    ];

    const comp = {};
    metrics.forEach(m => {
        const cVal = curr[m] || 0;
        const pVal = prev[m] || 0;
        const diff = cVal - pVal;
        let pct = 0;
        if (pVal > 0) {
            pct = Math.round(((cVal - pVal) / pVal) * 1000) / 10;
        } else if (cVal > 0) {
            pct = 100;
        }
        comp[m] = {
            current: cVal,
            previous: pVal,
            diff: diff,
            percent: pct,
            is_increase: diff > 0,
            is_decrease: diff < 0
        };
    });
    return comp;
}

// =========================================================================
// 1. GET /api/dashboard - Daily view (Báo cáo theo ngày)
// =========================================================================
router.get('/', requireAuth, async (req, res) => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        const reportDate = req.query.date || todayStr;
        const facility = req.query.facility || 'ALL';

        let query = `
            SELECT r.id, r.report_date, r.facility, r.department, r.data_json, r.updated_at,
                   u.full_name as submitter_name
            FROM daily_reports r
            LEFT JOIN users u ON r.submitted_by = u.id
            WHERE r.report_date = ?
        `;
        const params = [reportDate];

        if (facility && facility !== 'ALL') {
            query += " AND r.facility = ?";
            params.push(facility);
        }

        const rows = await all(query, params);

        // Checklist for 17 departments
        const departmentStatus = {};
        MASTER_DATA.departments.forEach(dept => {
            departmentStatus[dept] = {
                submitted: false,
                facility: null,
                updated_at: null,
                submitter_name: null
            };
        });

        let submittedCount = 0;
        rows.forEach(r => {
            const dept = r.department;
            if (departmentStatus[dept]) {
                departmentStatus[dept] = {
                    submitted: true,
                    facility: r.facility,
                    updated_at: r.updated_at,
                    submitter_name: r.submitter_name
                };
                submittedCount++;
            }
        });

        const summary = computeSummary(rows);

        return res.json({
            mode: 'daily',
            report_date: reportDate,
            facility: facility,
            total_departments: MASTER_DATA.departments.length,
            submitted_departments: submittedCount,
            department_status: departmentStatus,
            summary: summary
        });
    } catch (err) {
        console.error('Dashboard daily error:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ khi tải số liệu Dashboard: ' + err.message });
    }
});

// =========================================================================
// 2. GET /api/dashboard/weekly - Weekly view (Thứ 2 -> Chủ Nhật + So sánh tuần trước)
// =========================================================================
router.get('/weekly', requireAuth, async (req, res) => {
    try {
        const facility = req.query.facility || 'ALL';
        let refDateStr = req.query.date || new Date().toISOString().split('T')[0];
        const refDate = new Date(refDateStr);

        // Determine Monday of current week
        // In JS: getDay() returns 0 for Sunday, 1 for Monday ... 6 for Saturday
        const dayOfWeek = refDate.getDay();
        const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const mondayDate = new Date(refDate);
        mondayDate.setDate(refDate.getDate() + diffToMon);

        // Build array of 7 days: T2 -> CN
        const weekDays = [];
        const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
        for (let i = 0; i < 7; i++) {
            const d = new Date(mondayDate);
            d.setDate(mondayDate.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            weekDays.push({
                date: dateStr,
                label: `${dayLabels[i]} (${d.getDate()}/${d.getMonth() + 1})`,
                day_name: dayLabels[i]
            });
        }

        const startCurWeek = weekDays[0].date;
        const endCurWeek = weekDays[6].date;

        // Build array of previous week: 7 days earlier
        const prevMondayDate = new Date(mondayDate);
        prevMondayDate.setDate(mondayDate.getDate() - 7);
        const prevWeekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(prevMondayDate);
            d.setDate(prevMondayDate.getDate() + i);
            prevWeekDays.push(d.toISOString().split('T')[0]);
        }
        const startPrevWeek = prevWeekDays[0];
        const endPrevWeek = prevWeekDays[6];

        // Query Current Week Reports
        let curQuery = "SELECT * FROM daily_reports WHERE report_date BETWEEN ? AND ?";
        const curParams = [startCurWeek, endCurWeek];
        if (facility && facility !== 'ALL') {
            curQuery += " AND facility = ?";
            curParams.push(facility);
        }
        const curRows = await all(curQuery, curParams);

        // Query Previous Week Reports
        let prevQuery = "SELECT * FROM daily_reports WHERE report_date BETWEEN ? AND ?";
        const prevParams = [startPrevWeek, endPrevWeek];
        if (facility && facility !== 'ALL') {
            prevQuery += " AND facility = ?";
            prevParams.push(facility);
        }
        const prevRows = await all(prevQuery, prevParams);

        // Aggregate current and previous summaries
        const curSummary = computeSummary(curRows);
        const prevSummary = computeSummary(prevRows);

        // Compute 7-day breakdown for daily charts
        const dailyBreakdown = weekDays.map(wd => {
            const dayRows = curRows.filter(r => r.report_date === wd.date);
            const daySum = computeSummary(dayRows);
            return {
                date: wd.date,
                label: wd.label,
                day_name: wd.day_name,
                total_kham: daySum.total_kham,
                total_cap_cuu: daySum.total_cap_cuu,
                total_vao_vien: daySum.total_vao_vien,
                total_phau_thuat: daySum.total_phau_thuat,
                total_thu_thuat: daySum.total_thu_thuat,
                total_xet_nghiem: daySum.total_xet_nghiem,
                total_cdha: daySum.total_cdha,
                total_ra_vien: daySum.total_ra_vien
            };
        });

        const comparison = calculateComparison(curSummary, prevSummary);

        return res.json({
            mode: 'weekly',
            facility: facility,
            week_range: {
                start_date: startCurWeek,
                end_date: endCurWeek,
                prev_start_date: startPrevWeek,
                prev_end_date: endPrevWeek,
                label: `Tuần từ ${weekDays[0].label} đến ${weekDays[6].label}`
            },
            daily_breakdown: dailyBreakdown,
            summary: curSummary,
            previous_summary: prevSummary,
            comparison: comparison
        });
    } catch (err) {
        console.error('Dashboard weekly error:', err);
        return res.status(500).json({ error: 'Lỗi tải số liệu báo cáo tuần: ' + err.message });
    }
});

// =========================================================================
// 3. GET /api/dashboard/monthly - Monthly view (Tổng hợp tháng + So sánh cùng kỳ tháng trước)
// =========================================================================
router.get('/monthly', requireAuth, async (req, res) => {
    try {
        const facility = req.query.facility || 'ALL';
        const now = new Date();
        const curMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const targetMonth = req.query.month || curMonthStr; // Format: 'YYYY-MM'

        const [yearStr, monthNumStr] = targetMonth.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthNumStr); // 1 - 12

        // Current Month Range
        const startCurMonth = `${targetMonth}-01`;
        const lastDayCurMonth = new Date(year, monthNum, 0).getDate();
        const endCurMonth = `${targetMonth}-${String(lastDayCurMonth).padStart(2, '0')}`;

        // Previous Month Range
        const prevMonthDate = new Date(year, monthNum - 2, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonthNum = prevMonthDate.getMonth() + 1;
        const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
        const startPrevMonth = `${prevMonthStr}-01`;
        const lastDayPrevMonth = new Date(prevYear, prevMonthNum, 0).getDate();
        const endPrevMonth = `${prevMonthStr}-${String(lastDayPrevMonth).padStart(2, '0')}`;

        // Query Current Month
        let curQuery = "SELECT * FROM daily_reports WHERE report_date BETWEEN ? AND ?";
        const curParams = [startCurMonth, endCurMonth];
        if (facility && facility !== 'ALL') {
            curQuery += " AND facility = ?";
            curParams.push(facility);
        }
        const curRows = await all(curQuery, curParams);

        // Query Previous Month
        let prevQuery = "SELECT * FROM daily_reports WHERE report_date BETWEEN ? AND ?";
        const prevParams = [startPrevMonth, endPrevMonth];
        if (facility && facility !== 'ALL') {
            prevQuery += " AND facility = ?";
            prevParams.push(facility);
        }
        const prevRows = await all(prevQuery, prevParams);

        const curSummary = computeSummary(curRows);
        const prevSummary = computeSummary(prevRows);

        // Build Daily Trend Array for the entire month
        const dailyTrend = [];
        for (let day = 1; day <= lastDayCurMonth; day++) {
            const dateStr = `${targetMonth}-${String(day).padStart(2, '0')}`;
            const dayRows = curRows.filter(r => r.report_date === dateStr);
            const daySum = computeSummary(dayRows);
            dailyTrend.push({
                day: day,
                date: dateStr,
                label: `Ngày ${day}`,
                has_data: dayRows.length > 0,
                total_kham: daySum.total_kham,
                total_cap_cuu: daySum.total_cap_cuu,
                total_vao_vien: daySum.total_vao_vien,
                total_phau_thuat: daySum.total_phau_thuat,
                total_thu_thuat: daySum.total_thu_thuat,
                total_xet_nghiem: daySum.total_xet_nghiem,
                total_cdha: daySum.total_cdha,
                total_ra_vien: daySum.total_ra_vien
            });
        }

        const comparison = calculateComparison(curSummary, prevSummary);

        return res.json({
            mode: 'monthly',
            facility: facility,
            month_info: {
                month: targetMonth,
                month_label: `Tháng ${monthNum}/${year}`,
                prev_month: prevMonthStr,
                prev_month_label: `Tháng ${prevMonthNum}/${prevYear}`,
                days_in_month: lastDayCurMonth
            },
            daily_trend: dailyTrend,
            summary: curSummary,
            previous_summary: prevSummary,
            comparison: comparison
        });
    } catch (err) {
        console.error('Dashboard monthly error:', err);
        return res.status(500).json({ error: 'Lỗi tải số liệu báo cáo tháng: ' + err.message });
    }
});

module.exports = router;
