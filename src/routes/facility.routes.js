const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/facilities (Public / Authenticated to populate dropdowns)
router.get('/', async (req, res) => {
    try {
        const rows = await all("SELECT id, name, description, created_at FROM facilities ORDER BY id ASC");
        return res.json({ facilities: rows });
    } catch (err) {
        console.error('Fetch facilities error:', err);
        return res.status(500).json({ error: 'Lỗi khi tải danh sách cơ sở.' });
    }
});

// POST /api/facilities (Super Admin only - Add new facility)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Tên cơ sở không được để trống!' });
        }

        const trimmedName = name.trim();
        const existing = await get("SELECT id FROM facilities WHERE name = ?", [trimmedName]);
        if (existing) {
            return res.status(400).json({ error: `Cơ sở "${trimmedName}" đã tồn tại trong hệ thống!` });
        }

        const now = new Date().toISOString();
        const result = await run(
            "INSERT INTO facilities (name, description, created_at) VALUES (?, ?, ?)",
            [trimmedName, (description || '').trim(), now]
        );

        return res.status(201).json({
            success: true,
            message: `Đã thêm cơ sở "${trimmedName}" thành công!`,
            facility: {
                id: result.id,
                name: trimmedName,
                description: (description || '').trim(),
                created_at: now
            }
        });
    } catch (err) {
        console.error('Create facility error:', err);
        return res.status(500).json({ error: 'Lỗi khi tạo mới cơ sở.' });
    }
});

// PUT /api/facilities/:id (Super Admin only - Update facility)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Tên cơ sở không được để trống!' });
        }

        const trimmedName = name.trim();
        const facility = await get("SELECT * FROM facilities WHERE id = ?", [id]);
        if (!facility) {
            return res.status(404).json({ error: 'Không tìm thấy cơ sở cần sửa!' });
        }

        const oldName = facility.name;

        // If name changed, check if new name already exists on another facility
        if (trimmedName !== oldName) {
            const duplicate = await get("SELECT id FROM facilities WHERE name = ? AND id != ?", [trimmedName, id]);
            if (duplicate) {
                return res.status(400).json({ error: `Tên cơ sở "${trimmedName}" đã tồn tại trên hệ thống!` });
            }

            // Cascade update daily_reports and users to preserve all historical data and assignments
            await run("UPDATE daily_reports SET facility = ? WHERE facility = ?", [trimmedName, oldName]);
            await run("UPDATE users SET facility = ? WHERE facility = ?", [trimmedName, oldName]);
        }

        await run(
            "UPDATE facilities SET name = ?, description = ? WHERE id = ?",
            [trimmedName, (description || '').trim(), id]
        );

        return res.json({
            success: true,
            message: `Đã cập nhật cơ sở "${trimmedName}" thành công!`,
            facility: {
                id,
                name: trimmedName,
                description: (description || '').trim()
            }
        });
    } catch (err) {
        console.error('Update facility error:', err);
        return res.status(500).json({ error: 'Lỗi khi cập nhật thông tin cơ sở.' });
    }
});

// DELETE /api/facilities/:id (Super Admin only - Delete facility)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const facility = await get("SELECT * FROM facilities WHERE id = ?", [id]);
        if (!facility) {
            return res.status(404).json({ error: 'Không tìm thấy cơ sở cần xóa!' });
        }

        // Check if there are reports or users associated with this facility
        const reportCount = await get("SELECT COUNT(*) as count FROM daily_reports WHERE facility = ?", [facility.name]);
        if (reportCount && reportCount.count > 0) {
            return res.status(400).json({
                error: `Không thể xóa cơ sở "${facility.name}" vì đang có ${reportCount.count} bản ghi báo cáo gắn với cơ sở này!`
            });
        }

        const userCount = await get("SELECT COUNT(*) as count FROM users WHERE facility = ?", [facility.name]);
        if (userCount && userCount.count > 0) {
            return res.status(400).json({
                error: `Không thể xóa cơ sở "${facility.name}" vì đang có ${userCount.count} tài khoản khoa được gán cơ sở này!`
            });
        }

        await run("DELETE FROM facilities WHERE id = ?", [id]);
        return res.json({
            success: true,
            message: `Đã xóa cơ sở "${facility.name}" thành công!`
        });
    } catch (err) {
        console.error('Delete facility error:', err);
        return res.status(500).json({ error: 'Lỗi khi xóa cơ sở.' });
    }
});

module.exports = router;
