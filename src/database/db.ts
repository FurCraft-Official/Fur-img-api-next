/**
 * 数据库模块
 * 使用 better-sqlite3 进行 SQLite 数据库操作
 * 包含文件列表的 CRUD 操作、随机查询、速率限制管理等功能
 */

import fs from 'fs-extra';
import path from 'path';
import Database from 'better-sqlite3';
import logger from '../utils/loggerInstance.js';
import config from '../utils/config.js';
import { AppConfig, scanObj } from '../types/index.js';
import e from 'express';

let buffer: scanObj[] = [];
const BATCH_SIZE = 1000;

/**
 * 初始化数据库
 * 创建数据库文件、建立表结构和索引
 * @param {AppConfig} config - 应用配置对象
 * @returns {Promise<Database.Database>} 返回 better-sqlite3 数据库实例或 undefined
 * @throws {Error} 数据库初始化失败时捕获并记录错误
 */
async function initDatabase(config: AppConfig): Promise<Database.Database> {
    try {
        const dbFile = path.resolve(config.db.sqlite3.file);
        const fileExists = fs.existsSync(dbFile);

        const db = new Database(dbFile);

        if (!fileExists) {
            // 只有在文件不存在（新创建）时才初始化表结构
            // 在 initDatabase 的 CREATE TABLE 语句中添加：
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
            // 建议删除之前的单字段索引，改为这个
            db.prepare(`
                CREATE INDEX IF NOT EXISTS idx_files_dir_type 
                ON files (relative_dir, type);
        `).run();
            logger.info('Database created and initialized at %s', dbFile);
        } else {
            logger.info('Database file found at %s', dbFile);
            // 可选：如果表已存在但没有新字段，可以执行 ALTER TABLE 语句
        }
        if (!db) {
            throw new Error;
        }

        return db;
    } catch (e) {
        logger.error({ err: e }, 'Failed to initialize database');
        process.exit(1);
    }
}
/**
 * 保存项目到数据库缓冲区
 * 当缓冲区达到指定大小时自动批量插入
 * @param {scanObj} item - 要保存的扫描对象
 * @returns {Promise<void>} 异步操作完成后返回
 */
async function saveToDatabase(item: scanObj): Promise<void> {
    buffer.push(item);
    if (buffer.length >= BATCH_SIZE) {
        flush();
    }
}

/**
 * 将缓冲区数据批量插入到数据库
 * 使用事务确保数据一致性
 * @returns {void}
 */
function flush(): void {
    if (buffer.length === 0 || !db) return;

    try {
        // 1. 预编译 SQL 语句，加入 relative_path
        // 注意：SQL 里的 @relativePath 对应对象中的键名
        const insert = db.prepare(`
            INSERT OR IGNORE INTO files (file, path, relative_path, relative_dir, type) 
            VALUES (@file, @path, @relativePath, @relativeDir, @type)
            `);

        // 2. 创建并执行事务
        const insertMany = db.transaction((items: scanObj[]) => {
            for (const item of items) {
                insert.run(item);
            }
        });

        insertMany(buffer);

        // 3. 清空缓存
        buffer = [];
        logger.debug('Batch insert successful');
    } catch (e) {
        logger.error({ err: e }, 'Error during database flush');
    }
}

/**
 * 从所有文件中随机获取一个
 * @returns {any} 返回随机的文件记录
 */
function getRandomFromAll(): any {
    return db.prepare(`
            SELECT * FROM files 
            WHERE type = 'file' 
            ORDER BY RANDOM() 
            LIMIT 1
            `).get();
}
/**
 * 清空数据库中的所有文件记录并重置自增 ID
 * @returns {boolean} 清空成功返回 true，失败返回 false
 */
function clearDatabase(): boolean {
    try {
        // 使用 BEGIN 和 COMMIT 包装以确保原子性（虽然单条语句自动包装，但养成好习惯）
        const deleteStmt = db.prepare('DELETE FROM files');
        const resetCursor = db.prepare('DELETE FROM sqlite_sequence WHERE name = \'files\'');

        const transaction = db.transaction(() => {
            deleteStmt.run();
            // 重置自增 ID，让新插入的数据从 1 开始
            resetCursor.run();
        });

        transaction();
        logger.info('Database table "files" has been cleared');
        return true;
    } catch (e) {
        logger.error({ err: e }, 'Failed to clear database');
        return false;
    }
}

// 函数 2：从特定文件夹（及其子文件夹，如果你想要的话）选一个
/**
 * 从指定文件夹中随机获取一个文件
 * @param {string} folderRelativePath - 相对路径，例如 "img/screenshots"
 * @returns {any} 返回指定文件夹中的随机文件记录
 */
function getRandomFromFolder(folderRelativePath: string): any {
    // 这里的 folderRelativePath 传入例如 "img/screenshots"
    return db.prepare(`
                SELECT * FROM files 
                WHERE relative_dir = ? 
                AND type = 'file' 
                ORDER BY RANDOM() 
                LIMIT 1
                `).get(folderRelativePath);
}
/**
 * 获取数据库中的所有文件列表
 * @returns {any[]} 返回所有文件记录数组
 */
export function getAllFilelist(): any {
    const stmt = db.prepare('SELECT * FROM files');
    return stmt.all();
}
/**
 * 获取所有速率限制记录
 * @returns {any[]} 返回所有 hits 表的记录
 */
function getRateLimits(): any {
    const stmt = db.prepare('SELECT * FROM hits');
    return stmt.all();
}
/**
 * 解禁指定的 IP 地址
 * 从数据库中删除该 IP 的速率限制记录
 * @param {string} ip - 要解禁的 IP 地址
 * @returns {boolean} 解禁成功返回 true，失败返回 false
 */
function unbanIp(ip: string): boolean {
    try {
        // 1. 如果你之前去掉了前缀，这里直接查 ip
        // 2. 如果你保留了前缀 'limiter_'，这里需要拼接一下：const key = 'limiter_' + ip;
        const key = ip;

        const stmt = db.prepare('DELETE FROM hits WHERE key = ?;');
        const result = stmt.run(key);
        if (result.changes > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        logger.error({ err: error, ip }, 'Failed to unban IP');
        return false;
    }
}

/**
 * 清空 files 表的所有内容并重置自增 ID
 * @param {Object} db better-sqlite3 实例
*/
/**
 * 获取数据库实例
 * 初始化数据库并返回 better-sqlite3 实例
 * @returns {Promise<Database.Database>} 返回初始化后的数据库实例
 * @throws {Error} 如果数据库未能正确初始化，抛出异常
 */
async function getDB(): Promise<Database.Database> {
    try {
        const db = await initDatabase(config);
        if (!db) throw new Error('Database not initialized!');
        return db as Database.Database;
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
const db = await getDB();
export { db, initDatabase, saveToDatabase, flush, getRandomFromFolder, getRandomFromAll, clearDatabase, getRateLimits, unbanIp };
