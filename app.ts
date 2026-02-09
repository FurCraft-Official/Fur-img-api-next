/**
 * 主应用入口文件
 * 负责初始化数据库、扫描目录并启动 Web 服务器
 */

// import fs from 'fs-extra';
// import path from 'path';
import { scanDirectory } from './src/utils/scanner.js';
import logger from './src/utils/loggerInstance.js';
import config from './src/utils/config.js';
import { saveToDatabase, flush, clearDatabase, db } from './src/database/db.js';
import { startWebserver } from './src/web/server.js';
import { scanObj } from './src/types/index.js';

/**
 * 主函数
 * 初始化数据库、扫描图片目录、保存到数据库、启动 Web 服务器
 * @returns {Promise<void>} 异步操作完成后返回
 * @throws {Error} 扫描或保存过程中出错时抛出异常
 */
async function main(): Promise<void> {
    try {
        // 初始化数据库
        db.pragma('journal_mode = WAL');
        await clearDatabase();
        await scanDirectory(config.paths.images, async (item: scanObj) => {
            await saveToDatabase(item);
        });
        flush();
        logger.info('Finished scanning: %s', config.paths.images);
        // 启动express服务器
        startWebserver(config);
    }
    catch (e) {
        logger.error({ err: e }, 'Error during scanning and saving to database');
    }
}
await main();
process.on('uncaughtException', (err): void => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
});

process.on('SIGINT', (): void => {
    logger.info('process exit');
    process.exit(0);
});
process.on('SIGTERM', (): void => {
    logger.info('process exit');
    process.exit(0);
});
