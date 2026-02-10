/**
 * 管理员路由模块
 * 提供各种管理功能，如数据库刷新、IP 解封等
 * 所有路由都需要管理员身份验证
 */

import { app } from '../server.js';
import { authMiddleware } from '../middlewares/middleware.js';
import { clearDatabase, flush, saveToDatabase, unbanIp } from '../../database/db.js';
import { scanDirectory } from '../../utils/scanner.js';
import logger from '../../utils/loggerInstance.js';
import config from '../../utils/config.js';

/**
 * 注册管理员路由
 * POST /admin/refresh - 重新扫描图片目录并刷新数据库
 * POST /admin/unban/:ip - 解封指定 IP 地址
 * @returns {Promise<void>} 异步操作完成后返回
 */
async function routerAdmin(): Promise<void> {
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
/**
 * 导出管理员路由函数
 */
