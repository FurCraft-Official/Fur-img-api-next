import { app } from '../server.js';
import { authMiddleware } from '../middleware.js';
import { clearDatabase, flush, saveToDatabase, unbanIp } from '../../database/db.js';
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
    app.post('/admin/unban/:ip', authMiddleware, (req, res) => {
        try {
            const ip = String(req.params.ip);
            if (!unbanIp(ip)) {
                logger.warn({ ip }, 'IP not found in banlist');
                res.status(404).json({ error: 'IP not found in banlist' });
                return;
            }
            res.json({ message: `Successfully unbanned ${ip}` });
            logger.info({ ip }, 'IP successfully unbanned');
        } catch (e) {
            logger.error({ err: e }, 'Failed to unban IP');
            res.status(500).json({ error: 'failed to unban IP' });
        }
    });
}

export { routerAdmin };
