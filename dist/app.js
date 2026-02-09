import { scanDirectory } from './src/utils/scanner.js';
import logger from './src/utils/loggerInstance.js';
import config from './src/utils/config.js';
import { saveToDatabase, flush, clearDatabase, db } from './src/database/db.js';
import { startWebserver } from './src/web/server.js';
async function main() {
    try {
        db.pragma('journal_mode = WAL');
        await clearDatabase();
        await scanDirectory(config.paths.images, async (item) => {
            await saveToDatabase(item);
        });
        flush();
        logger.info('Finished scanning: %s', config.paths.images);
        startWebserver(config);
    }
    catch (e) {
        logger.error({ err: e }, 'Error during scanning and saving to database');
    }
}
await main();
process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
});
process.on('SIGINT', () => {
    logger.info('process exit');
    process.exit(0);
});
process.on('SIGTERM', () => {
    logger.info('process exit');
    process.exit(0);
});
//# sourceMappingURL=app.js.map