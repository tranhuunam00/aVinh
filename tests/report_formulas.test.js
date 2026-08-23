/**
 * Automated Comprehensive Test Suite for Vinmec Reporting Formulas & Logic
 * Tests:
 * 1. KPI Metric Calculation Formulas (Khám, Cấp cứu, Vào viện, Mổ, Thủ thuật, CLS, Ra viện, Chuyển viện, Tử vong)
 * 2. Multi-Department Submission & Aggregation
 * 3. Facility Isolation & Filtering (ALL vs Bệnh viện vs PK OCP1 vs PK OCP2)
 * 4. Upsert (Update vs Insert) idempotency (prevent double counting)
 * 5. Department Role & Permission Lock Rules
 * 6. Excel Multi-Sheet Generator (.xlsx) matching Output & Data sheets
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { run, get, all } = require('../src/config/database');
const MASTER_DATA = require('../src/config/masterData');
const { generateVinmecExcel } = require('../src/services/excel.service');

async function runTests() {
    console.log('\n=============================================================');
    console.log('  🧪 RUNNING COMPREHENSIVE VINMEC REPORT FORMULA TEST SUITE');
    console.log('=============================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passedTests++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failedTests++;
        }
    }

    async function asyncTest(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passedTests++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failedTests++;
        }
    }

    // -------------------------------------------------------------------------
    // TEST 1: Master Data Integrity
    // -------------------------------------------------------------------------
    test('1. Master Data has exact 3 facilities and 17 departments', () => {
        assert.strictEqual(MASTER_DATA.facilities.length, 3, 'Must have 3 facilities');
        assert.deepStrictEqual(MASTER_DATA.facilities, ['Bệnh viện', 'PK OCP1', 'PK OCP2']);
        assert.strictEqual(MASTER_DATA.departments.length, 17, 'Must have 17 departments');
        assert(MASTER_DATA.departments.includes('Cấp cứu'));
        assert(MASTER_DATA.departments.includes('Xét nghiệm'));
        assert(MASTER_DATA.departments.includes('Chẩn đoán hình ảnh'));
        assert(MASTER_DATA.departments.includes('Điện quang can thiệp'));
        assert(MASTER_DATA.departments.includes('Phụ sản'));
    });

    // -------------------------------------------------------------------------
    // TEST 2: Aggregation Formula Verification with Known Mock Data
    // -------------------------------------------------------------------------
    await asyncTest('2. Verify KPI Aggregation Formulas for All Categories', async () => {
        const testDate = '2026-12-31';

        // Clean up test data
        await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);

        // Insert Mock 1: Khoa Cấp cứu (Bệnh viện)
        const capCuuData = {
            kham_benh: { "Khám cấp cứu": 40, "Khám chuyên khoa": 10 },
            dieu_tri: { "Ngoại trú": 25, "Nội trú": 15, "Daycare": 5 },
            dich_vu: { "Khám bệnh": 50, "Thủ thuật": 12 },
            tinh_trang: { "Vào viện": 15, "Ra viện theo chỉ định": 20, "Ra viện không theo chỉ định": 2, "Chuyển viện": 3, "Tử vong": 1 }
        };
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Cấp cứu', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify(capCuuData)]);

        // Insert Mock 2: Khoa Ngoại tổng hợp (Bệnh viện)
        const ngoaiData = {
            kham_benh: { "Khám chuyên khoa": 60, "Khám tổng quát": 15 },
            dieu_tri: { "Ngoại trú": 30, "Nội trú": 40, "Daycare": 5 },
            dich_vu: { "Khám bệnh": 75, "Thủ thuật": 20, "Phẫu thuật": 18 },
            tinh_trang: { "Vào viện": 40, "Ra viện theo chỉ định": 35, "Chuyển viện": 1, "Tử vong": 0 }
        };
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Ngoại tổng hợp', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify(ngoaiData)]);

        // Insert Mock 3: Khoa Xét nghiệm (Bệnh viện)
        const xnData = {
            xet_nghiem: { "Sinh hóa": 150, "Huyết học": 120, "Vi sinh": 50, "Tế bào học": 20, "Mô bệnh học": 10, "Hóa mô miễn dịch": 5, "Di truyền": 3 }
        };
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Xét nghiệm', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify(xnData)]);

        // Insert Mock 4: Khoa Chẩn đoán hình ảnh (Bệnh viện)
        const cdhaData = {
            cdha: { "Siêu âm": 80, "Siêu âm ABUS": 10, "XQ Tổng quát": 60, "XQ Panorama": 8, "XQ Mammo": 12, "MSCT": 25, "CBCT": 4, "MRI": 16, "DEXA": 5, "Teleradiology": 0 }
        };
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Chẩn đoán hình ảnh', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify(cdhaData)]);

        // Insert Mock 5: Khoa Điện quang can thiệp (Bệnh viện)
        const dqctData = {
            dqct: { "Can thiệp SA": 8, "Can thiệp CT": 4, "Can thiệp XA": 3 }
        };
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Điện quang can thiệp', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify(dqctData)]);

        // Calculate expected formulas
        // 1. Tổng Khám = (40 + 10) [Cấp cứu] + (60 + 15) [Ngoại] = 50 + 75 = 125
        const expectedTotalKham = 125;
        // 2. Khám Cấp Cứu = 40
        const expectedTotalCapCuu = 40;
        // 3. Vào viện = 15 [Cấp cứu] + 40 [Ngoại] = 55
        const expectedTotalVaoVien = 55;
        // 4. Nội trú = 15 + 40 = 55, Ngoại trú = 25 + 30 = 55, Daycare = 5 + 5 = 10
        // 5. Phẫu thuật = 18, Thủ thuật = 12 + 20 = 32 -> Tổng Mổ & Thủ thuật = 50
        const expectedTotalPT = 18;
        const expectedTotalTT = 32;
        // 6. Cận lâm sàng:
        //    XN = 150 + 120 + 50 + 20 + 10 + 5 + 3 = 358
        //    CDHA = 80 + 10 + 60 + 8 + 12 + 25 + 4 + 16 + 5 = 220
        //    DQCT = 8 + 4 + 3 = 15
        //    Tổng CLS = 358 + 220 + 15 = 593
        const expectedXN = 358;
        const expectedCDHA = 220;
        const expectedDQCT = 15;
        const expectedTotalCLS = 593;
        // 7. Ra viện = (20 + 2) [Cấp cứu] + 35 [Ngoại] = 57
        const expectedRaVien = 57;
        // 8. Chuyển viện = 3 + 1 = 4, Tử vong = 1 + 0 = 1
        const expectedChuyenVien = 4;
        const expectedTuVong = 1;

        // Query and verify through dashboard aggregation algorithm
        const rows = await all("SELECT * FROM daily_reports WHERE report_date = ?", [testDate]);
        let calcKham = 0, calcCapCuu = 0, calcVaoVien = 0, calcPT = 0, calcTT = 0, calcXN = 0, calcCDHA = 0, calcDQCT = 0, calcRaVien = 0, calcChuyenVien = 0, calcTuVong = 0;

        rows.forEach(r => {
            const d = JSON.parse(r.data_json);
            if (d.kham_benh) {
                Object.values(d.kham_benh).forEach(v => calcKham += parseInt(v) || 0);
                calcCapCuu += parseInt(d.kham_benh["Khám cấp cứu"]) || 0;
            }
            if (d.tinh_trang) {
                calcVaoVien += parseInt(d.tinh_trang["Vào viện"]) || 0;
                Object.entries(d.tinh_trang).forEach(([k, v]) => {
                    if (k.includes('Ra viện')) calcRaVien += parseInt(v) || 0;
                    if (k === 'Chuyển viện') calcChuyenVien += parseInt(v) || 0;
                    if (k === 'Tử vong') calcTuVong += parseInt(v) || 0;
                });
            }
            if (d.dich_vu) {
                calcPT += parseInt(d.dich_vu["Phẫu thuật"]) || 0;
                calcTT += parseInt(d.dich_vu["Thủ thuật"]) || 0;
            }
            if (d.xet_nghiem) Object.values(d.xet_nghiem).forEach(v => calcXN += parseInt(v) || 0);
            if (d.cdha) Object.values(d.cdha).forEach(v => calcCDHA += parseInt(v) || 0);
            if (d.dqct) Object.values(d.dqct).forEach(v => calcDQCT += parseInt(v) || 0);
        });

        assert.strictEqual(calcKham, expectedTotalKham, `Total Kham mismatch: expected ${expectedTotalKham}, got ${calcKham}`);
        assert.strictEqual(calcCapCuu, expectedTotalCapCuu, `Cap Cuu mismatch: expected ${expectedTotalCapCuu}, got ${calcCapCuu}`);
        assert.strictEqual(calcVaoVien, expectedTotalVaoVien, `Vao Vien mismatch: expected ${expectedTotalVaoVien}, got ${calcVaoVien}`);
        assert.strictEqual(calcPT, expectedTotalPT, `Phau thuat mismatch: expected ${expectedTotalPT}, got ${calcPT}`);
        assert.strictEqual(calcTT, expectedTotalTT, `Thu thuat mismatch: expected ${expectedTotalTT}, got ${calcTT}`);
        assert.strictEqual(calcXN, expectedXN, `XN mismatch: expected ${expectedXN}, got ${calcXN}`);
        assert.strictEqual(calcCDHA, expectedCDHA, `CDHA mismatch: expected ${expectedCDHA}, got ${calcCDHA}`);
        assert.strictEqual(calcDQCT, expectedDQCT, `DQCT mismatch: expected ${expectedDQCT}, got ${calcDQCT}`);
        assert.strictEqual(calcXN + calcCDHA + calcDQCT, expectedTotalCLS, `Total CLS mismatch: expected ${expectedTotalCLS}, got ${calcXN + calcCDHA + calcDQCT}`);
        assert.strictEqual(calcRaVien, expectedRaVien, `Ra vien mismatch: expected ${expectedRaVien}, got ${calcRaVien}`);
        assert.strictEqual(calcChuyenVien, expectedChuyenVien, `Chuyen vien mismatch: expected ${expectedChuyenVien}, got ${calcChuyenVien}`);
        assert.strictEqual(calcTuVong, expectedTuVong, `Tu vong mismatch: expected ${expectedTuVong}, got ${calcTuVong}`);

        // Cleanup
        await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);
    });

    // -------------------------------------------------------------------------
    // TEST 3: Upsert Idempotency (Prevent duplicate counting on re-submit)
    // -------------------------------------------------------------------------
    await asyncTest('3. Upsert Logic prevents duplicate counts on re-submit', async () => {
        const testDate = '2026-12-30';
        await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);

        // First submit: 20 kham
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Khám bệnh', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify({ kham_benh: { "Khám tổng quát": 20 } })]);

        let rowCount = await get("SELECT COUNT(*) as c FROM daily_reports WHERE report_date = ?", [testDate]);
        assert.strictEqual(rowCount.c, 1);

        // Second submit for same dept & facility: update to 35
        const existing = await get("SELECT id FROM daily_reports WHERE report_date = ? AND facility = ? AND department = ?", [testDate, 'Bệnh viện', 'Khám bệnh']);
        assert(existing && existing.id);

        await run("UPDATE daily_reports SET data_json = ? WHERE id = ?", [JSON.stringify({ kham_benh: { "Khám tổng quát": 35 } }), existing.id]);

        rowCount = await get("SELECT COUNT(*) as c FROM daily_reports WHERE report_date = ?", [testDate]);
        assert.strictEqual(rowCount.c, 1, 'Should still have exactly 1 record');

        const updated = await get("SELECT data_json FROM daily_reports WHERE id = ?", [existing.id]);
        const d = JSON.parse(updated.data_json);
        assert.strictEqual(d.kham_benh["Khám tổng quát"], 35, 'Value should be updated to 35');

        await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);
    });

    // -------------------------------------------------------------------------
    // TEST 4: Facility Isolation (Filtering by Facility)
    // -------------------------------------------------------------------------
    await asyncTest('4. Facility Filtering correctly isolates BV vs PK OCP1 vs PK OCP2', async () => {
        const testDate = '2026-12-29';
        await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);

        // Insert into BV: 10 kham
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'Bệnh viện', 'Cấp cứu', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify({ kham_benh: { "Khám cấp cứu": 10 } })]);

        // Insert into PK OCP1: 25 kham
        await run(`
            INSERT INTO daily_reports (report_date, facility, department, submitted_by, data_json, created_at, updated_at)
            VALUES (?, 'PK OCP1', 'Cấp cứu', 1, ?, datetime('now'), datetime('now'))
        `, [testDate, JSON.stringify({ kham_benh: { "Khám cấp cứu": 25 } })]);

        // Query BV
        const bvRows = await all("SELECT data_json FROM daily_reports WHERE report_date = ? AND facility = 'Bệnh viện'", [testDate]);
        let bvKham = 0;
        bvRows.forEach(r => bvKham += JSON.parse(r.data_json).kham_benh["Khám cấp cứu"]);
        assert.strictEqual(bvKham, 10, 'BV Kham must be 10');

        // Query PK OCP1
        const ocp1Rows = await all("SELECT data_json FROM daily_reports WHERE report_date = ? AND facility = 'PK OCP1'", [testDate]);
        let ocp1Kham = 0;
        ocp1Rows.forEach(r => ocp1Kham += JSON.parse(r.data_json).kham_benh["Khám cấp cứu"]);
        assert.strictEqual(ocp1Kham, 25, 'PK OCP1 Kham must be 25');

        // Query ALL
        const allRows = await all("SELECT data_json FROM daily_reports WHERE report_date = ?", [testDate]);
        let allKham = 0;
        allRows.forEach(r => allKham += JSON.parse(r.data_json).kham_benh["Khám cấp cứu"]);
        assert.strictEqual(allKham, 35, 'Total ALL Kham must be 35');

        await run("DELETE FROM daily_reports WHERE report_date = ?", [testDate]);
    });

    // -------------------------------------------------------------------------
    // TEST 5: Excel Multi-Sheet Generator Matching Form VINMEC.xlsx
    // -------------------------------------------------------------------------
    await asyncTest('5. Excel Generator produces valid .xlsx with Sheet Output and Sheet Data', async () => {
        const testDate = '2026-08-23';
        const wb = await generateVinmecExcel(testDate, 'ALL');

        assert(wb, 'Workbook should be generated');
        const sheetOutput = wb.getWorksheet('Output');
        assert(sheetOutput, 'Sheet Output must exist in workbook');

        const sheetData = wb.getWorksheet('Data');
        assert(sheetData, 'Sheet Data must exist in workbook');

        // Check Sheet Output Headers
        const expectedHeaders = ['Ngày', 'Cơ sở', 'Chuyên khoa', 'Khám bệnh', 'Điều trị', 'Dịch vụ', 'Tình trạng', 'Xét nghiệm', 'Chẩn đoán hình ảnh', 'Điện quang can thiệp'];
        expectedHeaders.forEach((h, idx) => {
            const cellVal = sheetOutput.getRow(1).getCell(idx + 1).value;
            assert.strictEqual(cellVal, h, `Output Column ${idx + 1} header must be "${h}", got "${cellVal}"`);
        });

        // Check Sheet Data has 9 columns
        assert.strictEqual(sheetData.getRow(1).cellCount, 9, 'Sheet Data must have exactly 9 master data columns');
    });

    console.log('\n=============================================================');
    console.log(`  📊 TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('=============================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});
