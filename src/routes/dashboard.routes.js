const express = require('express');
const router = express.Router();
const { all } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const MASTER_DATA = require('../config/masterData');

// GET /api/dashboard - Aggregated morning briefing stats
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

        let submittedCount = 0;

        rows.forEach(r => {
            const dept = r.department;
            const d = JSON.parse(r.data_json);

            if (departmentStatus[dept]) {
                departmentStatus[dept] = {
                    submitted: true,
                    facility: r.facility,
                    updated_at: r.updated_at,
                    submitter_name: r.submitter_name
                };
                submittedCount++;
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

            // 3. Dịch vụ
            Object.entries(dv).forEach(([k, v]) => {
                const num = parseInt(v) || 0;
                summary.service_detail[k] = (summary.service_detail[k] || 0) + num;
                if (k === 'Phẫu thuật') summary.total_phau_thuat += num;
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

        return res.json({
            report_date: reportDate,
            facility: facility,
            total_departments: MASTER_DATA.departments.length,
            submitted_departments: submittedCount,
            department_status: departmentStatus,
            summary: summary
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        return res.status(500).json({ error: 'Lỗi máy chủ khi tải số liệu Dashboard: ' + err.message });
    }
});

module.exports = router;
