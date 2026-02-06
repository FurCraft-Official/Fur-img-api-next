import { app } from '../server.js';
import { authMiddleware } from '../middleware.js';
import { clearDatabase, flush, saveToDatabase } from '../../database/db.js';
import { scanDirectory } from '../../utils/scanner.js';
import logger from '../../utils/loggerInstance.js';
import config from '../../utils/config.js';

async function routerAdmin() {
    app.post('/admin/refresh', authMiddleware, async (req, res) => {
        try {
            res.status(200).json({ message: 'refresh database start' });
            // 重新写入数据库
            await clearDatabase();
            await scanDirectory(config.paths.images, async (item) => {
                await saveToDatabase(item);
            });
            flush();
            logger.info('Refresh database finished');
        } catch (e) {
            logger.error({ err: e }, 'Refresh database failed');
            res.status(500).json({ error: 'refresh failed' });
        }
    });
}

export { routerAdmin };
