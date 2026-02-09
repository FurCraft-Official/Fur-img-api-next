import fs from 'fs-extra';
import path from 'path';
import Database from 'better-sqlite3';
import logger from '../utils/loggerInstance.js';
import config from '../utils/config.js';
let buffer = [];
const BATCH_SIZE = 1000;
async function initDatabase(config) {
    try {
        const dbFile = path.resolve(config.db.sqlite3.file);
        const fileExists = fs.existsSync(dbFile);
        const db = new Database(dbFile);
        if (!fileExists) {
            db.prepare(`
                CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file TEXT,
                path TEXT,
                relative_path TEXT,
                relative_dir TEXT,
                type TEXT
                );
        `).run();
            db.prepare(`
                CREATE INDEX IF NOT EXISTS idx_files_dir_type 
                ON files (relative_dir, type);
        `).run();
            logger.info('Database created and initialized at %s', dbFile);
        }
        else {
            logger.info('Database file found at %s', dbFile);
        }
        if (!db) {
            throw new Error;
        }
        return db;
    }
    catch (e) {
        logger.error({ err: e }, 'Failed to initialize database');
        process.exit(1);
    }
}
async function saveToDatabase(item) {
    buffer.push(item);
    if (buffer.length >= BATCH_SIZE) {
        flush();
    }
}
function flush() {
    if (buffer.length === 0 || !db)
        return;
    try {
        const insert = db.prepare(`
            INSERT OR IGNORE INTO files (file, path, relative_path, relative_dir, type) 
            VALUES (@file, @path, @relativePath, @relativeDir, @type)
            `);
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                insert.run(item);
            }
        });
        insertMany(buffer);
        buffer = [];
        logger.debug('Batch insert successful');
    }
    catch (e) {
        logger.error({ err: e }, 'Error during database flush');
    }
}
function getRandomFromAll() {
    return db.prepare(`
            SELECT * FROM files 
            WHERE type = 'file' 
            ORDER BY RANDOM() 
            LIMIT 1
            `).get();
}
function clearDatabase() {
    try {
        const deleteStmt = db.prepare('DELETE FROM files');
        const resetCursor = db.prepare('DELETE FROM sqlite_sequence WHERE name = \'files\'');
        const transaction = db.transaction(() => {
            deleteStmt.run();
            resetCursor.run();
        });
        transaction();
        logger.info('Database table "files" has been cleared');
        return true;
    }
    catch (e) {
        logger.error({ err: e }, 'Failed to clear database');
        return false;
    }
}
function getRandomFromFolder(folderRelativePath) {
    return db.prepare(`
                SELECT * FROM files 
                WHERE relative_dir = ? 
                AND type = 'file' 
                ORDER BY RANDOM() 
                LIMIT 1
                `).get(folderRelativePath);
}
export function getAllFilelist() {
    const stmt = db.prepare('SELECT * FROM files');
    return stmt.all();
}
function getRateLimits() {
    const stmt = db.prepare('SELECT * FROM hits');
    return stmt.all();
}
function unbanIp(ip) {
    try {
        const key = ip;
        const stmt = db.prepare('DELETE FROM hits WHERE key = ?;');
        const result = stmt.run(key);
        if (result.changes > 0) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (error) {
        logger.error({ err: error, ip }, 'Failed to unban IP');
        return false;
    }
}
async function getDB() {
    try {
        const db = await initDatabase(config);
        if (!db)
            throw new Error('Database not initialized!');
        return db;
    }
    catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
const db = await getDB();
export { db, initDatabase, saveToDatabase, flush, getRandomFromFolder, getRandomFromAll, clearDatabase, getRateLimits, unbanIp };
//# sourceMappingURL=db.js.map