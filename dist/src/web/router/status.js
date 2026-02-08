import { app } from '../server.js';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import logger from '../../utils/loggerInstance.js';
import { getAllFilelist, getRateLimits } from '../../database/db.js';
import config from '../../utils/config.js';
dayjs.extend(duration);
async function routerStatus() {
    app.get('/health', (req, res) => {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime() * 1000;
            const uptimeDuration = dayjs.duration(uptime);
            const json = {
                status: 'ok',
                memory: {
                    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
                },
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                uptime: {
                    ms: uptime,
                    formatted: `${Math.floor(uptimeDuration.asDays())}天 ${uptimeDuration.hours()}时 ${uptimeDuration.minutes()}分 ${uptimeDuration.seconds()}秒`
                },
                timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss')
            };
            res.json(json);
        }
        catch (err) {
            logger.error({ err }, 'Health check error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Health check failed' });
            }
        }
    });
    app.get('/filelist', (req, res) => {
        try {
            const rowsdata = getAllFilelist();
            const rows = rowsdata;
            const result = {};
            rows.forEach(row => {
                const { file, relative_path, relative_dir, type } = row;
                if (type === 'directory') {
                    return;
                }
                const folderKey = relative_dir || '.';
                if (!result[folderKey]) {
                    result[folderKey] = {};
                }
                const urlPath = relative_path.replace(/\\/g, '/');
                result[folderKey][file] = `/files/${urlPath}`;
            });
            res.json(result);
        }
        catch (e) {
            logger.error({ err: e }, 'Get file list failed');
            res.status(500).json({ error: 'get files failed' });
        }
    });
    app.use('/banlist', (req, res) => {
        try {
            const ratelistdata = getRateLimits();
            const ratelist = ratelistdata;
            const banlist = {};
            for (const items of ratelist) {
                if (items.totalHits > config.server.rateLimit.limit) {
                    banlist.ip = items.key;
                    banlist.totalHits = items.totalHits;
                    banlist.resetTime = new Date(items.resetTime);
                }
            }
            if (Object.keys(banlist).length === 0) {
                logger.info('No banned IPs found');
                return res.json({ message: 'no banned IPs' });
            }
            res.json(banlist);
        }
        catch (e) {
            logger.error({ err: e }, 'Failed to retrieve banlist');
            res.status(500).json({ error: 'failed to retrieve banlist' });
        }
    });
}
export { routerStatus };
//# sourceMappingURL=status.js.map