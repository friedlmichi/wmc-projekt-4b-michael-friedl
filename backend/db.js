const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            allergens TEXT,
            gps_enabled INTEGER DEFAULT 0,
            language TEXT DEFAULT 'de'
        )`, (err) => {
            if (err) {
                console.error('Error creating users table', err.message);
            } else {
                db.run(`ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'de'`, () => {});
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS symptom_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) {
                console.error('Error creating symptom_logs table', err.message);
            }
        });
    }
});

module.exports = db;
