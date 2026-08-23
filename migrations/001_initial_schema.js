/**
 * Migration 001: Initial Schema Setup
 */
module.exports = {
    name: '001_initial_schema',
    async up({ run, get, all }) {
        // Enable WAL mode
        await run("PRAGMA journal_mode = WAL;");

        // 1. Users Table
        await run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'department',
                facility TEXT NOT NULL DEFAULT 'BV VMOCP2',
                department TEXT NOT NULL DEFAULT 'ALL',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        // 2. Facilities Table
        await run(`
            CREATE TABLE IF NOT EXISTS facilities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL
            )
        `);

        // 3. Daily Reports Table
        await run(`
            CREATE TABLE IF NOT EXISTS daily_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                report_date TEXT NOT NULL,
                facility TEXT NOT NULL,
                department TEXT NOT NULL,
                submitted_by INTEGER,
                data_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(report_date, facility, department),
                FOREIGN KEY(submitted_by) REFERENCES users(id)
            )
        `);
    }
};
