const express = require('express');
const router = express.Router();
const { generateVinmecExcel } = require('../services/excel.service');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);
router.use(requireAdmin);

// GET /api/export/excel
router.get('/excel', async (req, res) => {
    try {
        const { date, facility } = req.query;

        // Sanitize date parameter for safe file naming
        const safeDate = (date && /^[0-9\-]+$/.test(date)) ? date : 'Tat_Ca';
        const workbook = await generateVinmecExcel(date, facility);

        const filename = `Bao_Cao_Vinmec_OCP2_${safeDate}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Export Excel error:', err);
        res.status(500).json({ error: 'Lỗi khi xuất file Excel.' });
    }
});

module.exports = router;
