const ExcelJS = require('exceljs');
const { all } = require('../config/database');
const MASTER_DATA = require('../config/masterData');

async function generateVinmecExcel(date, facility) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vinmec Ocean Park 2';
    workbook.created = new Date();
    workbook.modified = new Date();

    // =========================================================================
    // SHEET 1: OUTPUT (Dữ liệu tổng hợp)
    // =========================================================================
    const wsOut = workbook.addWorksheet('Output', {
        views: [{ showGridLines: true }]
    });

    wsOut.columns = [
        { header: 'Ngày', key: 'report_date', width: 14 },
        { header: 'Cơ sở', key: 'facility', width: 16 },
        { header: 'Chuyên khoa', key: 'department', width: 26 },
        { header: 'Khám bệnh', key: 'kham_benh', width: 32 },
        { header: 'Điều trị', key: 'dieu_tri', width: 28 },
        { header: 'Dịch vụ', key: 'dich_vu', width: 32 },
        { header: 'Tình trạng', key: 'tinh_trang', width: 32 },
        { header: 'Xét nghiệm', key: 'xet_nghiem', width: 35 },
        { header: 'Chẩn đoán hình ảnh', key: 'cdha', width: 35 },
        { header: 'Điện quang can thiệp', key: 'dqct', width: 25 }
    ];

    // Format Header Row
    const headerRow = wsOut.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '002060' } // Exact Navy Blue in Form VINMEC.xlsx
        };
        cell.font = {
            name: 'Calibri',
            size: 11,
            bold: true,
            color: { argb: 'FFFFFF' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Query Data from SQLite
    let query = `
        SELECT report_date, facility, department, data_json, updated_at
        FROM daily_reports
        WHERE 1=1
    `;
    const params = [];

    if (date) {
        query += " AND report_date = ?";
        params.push(date);
    }
    if (facility && facility !== 'ALL') {
        query += " AND facility = ?";
        params.push(facility);
    }

    query += " ORDER BY report_date DESC, facility ASC, department ASC";

    const rows = await all(query, params);

    rows.forEach((r) => {
        const d = JSON.parse(r.data_json);

        const kb = d.kham_benh || {};
        const kbParts = [];
        Object.entries(kb).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) kbParts.push(`${k}: ${num}`);
        });

        const dt = d.dieu_tri || {};
        const dtParts = [];
        Object.entries(dt).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) dtParts.push(`${k}: ${num}`);
        });

        const dv = d.dich_vu || {};
        const dvParts = [];
        Object.entries(dv).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) dvParts.push(`${k}: ${num}`);
        });

        const tt = d.tinh_trang || {};
        const ttParts = [];
        Object.entries(tt).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) ttParts.push(`${k}: ${num}`);
        });

        const xn = d.xet_nghiem || {};
        const xnParts = [];
        Object.entries(xn).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) xnParts.push(`${k}: ${num}`);
        });

        const cd = d.cdha || {};
        const cdParts = [];
        Object.entries(cd).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) cdParts.push(`${k}: ${num}`);
        });

        const dq = d.dqct || {};
        const dqParts = [];
        Object.entries(dq).forEach(([k, v]) => {
            const num = parseInt(v) || 0;
            if (num > 0) dqParts.push(`${k}: ${num}`);
        });

        const addedRow = wsOut.addRow({
            report_date: r.report_date,
            facility: r.facility,
            department: r.department,
            kham_benh: kbParts.join(', '),
            dieu_tri: dtParts.join(', '),
            dich_vu: dvParts.join(', '),
            tinh_trang: ttParts.join(', '),
            xet_nghiem: xnParts.join(', '),
            cdha: cdParts.join(', '),
            dqct: dqParts.join(', ')
        });

        addedRow.eachCell((cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 11 };
            cell.border = {
                top: { style: 'thin', color: { argb: 'D9D9D9' } },
                left: { style: 'thin', color: { argb: 'D9D9D9' } },
                bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
                right: { style: 'thin', color: { argb: 'D9D9D9' } }
            };
            if (colNumber === 1 || colNumber === 2) {
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            } else {
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
            }
        });
    });

    // =========================================================================
    // SHEET 2: DATA (Danh mục Master Data chuẩn)
    // =========================================================================
    const wsData = workbook.addWorksheet('Data', {
        views: [{ showGridLines: true }]
    });

    const dataHeaders = [
        'Cơ sở', 'Chuyên khoa', 'Khám bệnh', 'Điều trị', 'Dịch vụ',
        'Tình trạng', 'Xét nghiệm', 'Chẩn đoán hình ảnh', 'Điện quang can thiệp'
    ];
    wsData.addRow(dataHeaders);

    const dataHeaderRow = wsData.getRow(1);
    dataHeaderRow.height = 24;
    dataHeaderRow.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 11, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    // Fill Data matrix
    const colFacilities = MASTER_DATA.facilities;
    const colDepts = MASTER_DATA.departments;
    const colKham = MASTER_DATA.fields_by_category.kham_benh;
    const colDieuTri = MASTER_DATA.fields_by_category.dieu_tri;
    const colDichVu = MASTER_DATA.fields_by_category.dich_vu;
    const colTinhTrang = MASTER_DATA.fields_by_category.tinh_trang;
    const colXN = MASTER_DATA.fields_by_category.xet_nghiem;
    const colCDHA = MASTER_DATA.fields_by_category.cdha;
    const colDQCT = MASTER_DATA.fields_by_category.dqct;

    const maxRows = Math.max(
        colFacilities.length, colDepts.length, colKham.length, colDieuTri.length,
        colDichVu.length, colTinhTrang.length, colXN.length, colCDHA.length, colDQCT.length
    );

    for (let i = 0; i < maxRows; i++) {
        wsData.addRow([
            colFacilities[i] || '',
            colDepts[i] || '',
            colKham[i] || '',
            colDieuTri[i] || '',
            colDichVu[i] || '',
            colTinhTrang[i] || '',
            colXN[i] || '',
            colCDHA[i] || '',
            colDQCT[i] || ''
        ]);
    }

    // Auto-fit column widths for Data sheet
    wsData.columns.forEach(col => {
        col.width = 24;
    });

    return workbook;
}

module.exports = {
    generateVinmecExcel
};
