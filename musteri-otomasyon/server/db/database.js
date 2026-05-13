import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export function getDb() {
    if (!db) {
        const dbPath = join(__dirname, 'otomasyon.db');
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initializeDb();
    }
    return db;
}

function initializeDb() {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
    console.log('✅ Veritabanı başarıyla başlatıldı');
}

export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
