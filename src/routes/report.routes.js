const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const MASTER_DATA = require('../config/masterData');

// GET /api/reports/master-data (Public for app bootstrap)
router.get('/master-data', (req, res) => {
    return res.json(MASTER_DATA);
});

// All subsequent routes require login
router.use(requireAuth);

// GET /api/reports - Fetch reports with filters
router.get('/', async (req, res) => {
    try {
        const { date, facility, department } = req.query;

        let query = `
            SELECT r.id, r.report_date, r.facility, r.department, r.data_json, r.created_at, r.updated_at,
                   u.username as submitter_username, u.full_name as submitter_name
            FROM daily_reports r
            LEFT JOIN users u ON r.submitted_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            query += " AND r.report_date = ?";
            params.append ? params.append(date) : params.push(date);
        }

        if (facility && facility !== 'ALL') {
            query += " AND r.facility = ?";
            params.push(facility);
        } else if (req.user.role !== 'admin' && req.user.facility !== 'ALL') {
            query += " AND r.facility = ?";
            params.push(req.user.facility);
        }

        // If department user, enforce their allowed departments
        if (req.user.role !== 'admin' && req.user.department !== 'ALL') {
            const userDepts = req.user.department.split(',').map(s => s.trim());
            if (department && department !== 'ALL') {
                if (userDepts.includes(department)) {
                    query += " AND r.department = ?";
                    params.push(department);
                } else {
                    query += " AND 1=0";
                }
            } else {
                const placeholders = userDepts.map(() => '?').join(',');
                query += ` AND r.department IN (${placeholders})`;
                params.push(...userDepts);
            }
        } else if (department && department !== 'ALL') {
            query += " AND r.department = ?";
            params.push(department);
        }

        query += " ORDER BY r.report_date DESC, r.facility ASC, r.department ASC";

        const rows = await all(query, params);
        const results = rows.map(r => ({
            id: r.id,
            report_date: r.report_date,
            facility: r.facility,
            department: r.department,
            submitted_by: {
                username: r.submitter_username,
                full_name: r.submitter_name
            },
            data: JSON.parse(r.data_json),
            created_at: r.created_at,
            updated_at: r.updated_at
        }));

        return res.json({ reports: results });
    } catch (err) {
        console.error('Fetch reports error:', err);
        return res.status(500).json({ error: 'Lỗi tải danh sách báo cáo: ' + err.message });
    }
});

// POST /api/reports - Save or update daily report
router.post('/', async (req, res) => {
    try {
        const { report_date, facility, department, data } = req.body;

        if (!report_date || !facility || !department || !data) {
            return res.status(400).json({ error: 'Thiếu thông tin ngày, cơ sở, chuyên khoa hoặc dữ liệu' });
        }

        // Security check: Department user can only submit for their assigned departments
        if (req.user.role !== 'admin' && req.user.department !== 'ALL') {
            const allowedDepts = req.user.department.split(',').map(s => s.trim());
            if (!allowedDepts.includes(department)) {
                return res.status(403).json({
                    error: `Bạn chỉ có quyền nộp báo cáo cho các khoa được gán (${req.user.department}), không thể nộp cho "${department}"!`
                });
            }
        }

        // Security check: Facility check
        if (req.user.role !== 'admin' && req.user.facility !== 'ALL') {
            if (req.user.facility !== facility) {
                return res.status(403).json({
                    error: `Bạn chỉ có quyền nộp báo cáo cho cơ sở "${req.user.facility}", không thể nộp cho "${facility}"!`
                });
            }
        }

        const now = new Date().toISOString();
        const dataJson = JSON.stringify(data);

        // Upsert into daily_reports
        const existing = await get(`
            SELECT id FROM daily_reports 
            WHERE report_date = ? AND facility = ? AND department = ?
        `, [report_date, facility, department]);

        if (existing) {
            await run(`
                UPDATE daily_reports 
                SET data_json = ?, submitted_by = ?, updated_at = ?
                WHERE id = ?
            `, [dataJson, req.user.id, now, existing.id]);

            return res.json({
                success: true,
                message: `Đã cập nhật số liệu ngày ${report_date} cho ${department} (${facility}) thành công!`,
                reportId: existing.id
            });
        } else {
            const result = await run(`
                INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [report_date, facility, department, req.user.id, dataJson, now, now]);

            return res.status(201).json({
                success: true,
                message: `Đã lưu mới số liệu ngày ${report_date} cho ${department} (${facility}) thành công!`,
                reportId: result.id
            });
        }
    } catch (err) {
        console.error('Save report error:', err);
        return res.status(500).json({ error: 'Lỗi khi lưu báo cáo: ' + err.message });
    }
});

// DELETE /api/reports/:id - Delete report
router.delete('/:id', async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const report = await get("SELECT * FROM daily_reports WHERE id = ?", [reportId]);

        if (!report) {
            return res.status(404).json({ error: 'Không tìm thấy bản ghi báo cáo' });
        }

        if (req.user.role !== 'admin' && report.submitted_by !== req.user.id) {
            return res.status(403).json({ error: 'Bạn không có quyền xóa báo cáo này' });
        }

        await run("DELETE FROM daily_reports WHERE id = ?", [reportId]);
        return res.json({ success: true, message: 'Đã xóa bản ghi báo cáo thành công' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
