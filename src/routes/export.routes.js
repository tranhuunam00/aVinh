const express = require('express');
const router = express.Router();
const { generateVinmecExcel } = require('../services/excel.service');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/export/excel
router.get('/excel', async (req, res) => {
    try {
        const { date, facility } = req.query;
        const workbook = await generateVinmecExcel(date, facility);

        const filename = `Bao_Cao_Vinmec_OCP2_${date || 'Tat_Ca'}.xlsx`;

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Export Excel error:', err);
        res.status(500).json({ error: 'Lỗi xuất file Excel: ' + err.message });
    }
});

module.exports = router;
