import fs from 'fs-extra';
import path from 'path';
import logger from '../utils/loggerInstance.js';
import { getRandomFromAll, getRandomFromFolder, clearDatabase, flush, saveToDatabase, getAllFilelist } from '../database/db.js';
import { scanDirectory } from '../utils/scanner.js';
import { JSON, requestLogger, authMiddleware } from './middleware.js';
import cors from 'cors';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration.js';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
dayjs.extend(duration);


async function createRoute(db, config, app, express) {
    app.use((req, res, next) => {
        // 日志中间件
        requestLogger(req, res, next);
    });
    if (config.server.cors.enable) {
        // 启用cors中间件
        const corsConfig = {
            'origin': config.server.cors.origins,
            'methods': config.server.cors.methods,
            'preflightContinue': config.server.cors.preflightContinue,
            'optionsSuccessStatus': config.server.cors.optionsSuccessStatus
        };
        app.use(cors(corsConfig));
    }
    if (config.server.rateLimit.enable) {
        // 启用访问速率限制
        const limiter = rateLimit({
            windowMs: config.server.rateLimit.windowMS * 60 * 1000,
            limit: config.server.rateLimit.limit,
            standardHeaders: config.server.rateLimit.standardHeaders,
            legacyHeaders: config.server.rateLimit.legacyHeaders,
            validate: config.server.rateLimit.validate,
            message: config.server.rateLimit.message,
            statusCode: config.server.rateLimit.statusCode
        });
        app.use(limiter);
    }
    if (config.server.gzip) {
        app.use(compression());
    }
    app.get('/api', (req, res) => {
        try {
            const file = getRandomFromAll(db);

            if (!file) {
                return res.status(404).json({ error: 'No files found' });
            }

            if (req.query.json === 'true') {
                const json = JSON(file, config.paths.images);
                return res.json(json);
            }

            const filePath = path.resolve(file.path);

            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // 获取文件信息
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;

            // 设置响应头
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Content-Type', getMimeType(file.file));
            res.setHeader('Cache-Control', 'public, max-age=31536000');

            // 创建可读流并传输
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            // 错误处理
            fileStream.on('error', (err) => {
                logger.error({ err }, 'Stream error');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream failed' });
                }
            });

        } catch (e) {
            logger.error({ err: e }, 'API error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });

    app.get('/api/*splat', (req, res) => {
        try {
            const urlFolder = req.params.splat[0]; // Express 4/5 兼容写法
            const file = getRandomFromFolder(db, urlFolder);

            if (!file) {
                return res.status(404).json({ error: 'No files found in this folder' });
            }

            if (req.query.json === 'true') {
                const json = JSON(file, config.paths.images);
                return res.json(json);
            }

            const filePath = path.resolve(file.path);

            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }

            // 获取文件信息
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;

            // 设置响应头
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Content-Type', getMimeType(file.file));
            res.setHeader('Cache-Control', 'public, max-age=31536000');

            // 创建可读流并传输
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);

            // 错误处理
            fileStream.on('error', (err) => {
                logger.error({ err }, 'Stream error');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream failed' });
                }
            });

        } catch (err) {
            logger.error({ err }, 'API folder error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
    app.get('/health', (req, res) => {
        try {
            const memoryUsage = process.memoryUsage();
            const uptime = process.uptime() * 1000; // 转换为毫秒
            const uptimeDuration = dayjs.duration(uptime);

            res.json({
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
            });
        } catch (err) {
            logger.error({ err }, 'Health check error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Health check failed' });
            }
        }
    });
    app.get('/filelist', (req, res) => {
        try {
            // 假设 getAllFilelist(db) 返回的是 SELECT * FROM files 的结果
            const rows = getAllFilelist(db);
            const result = {};

            rows.forEach(row => {
                // 直接解构我们新加的字段
                const { file, relative_path, relative_dir, type } = row;

                // 1. 过滤掉目录类型
                if (type === 'directory') {
                    return;
                }

                // 2. 规范化文件夹 Key
                // 如果 relativeDir 是空字符串（代表根目录），统一用 '.'
                const folderKey = relative_dir || '.';

                // 3. 初始化文件夹对象
                if (!result[folderKey]) {
                    result[folderKey] = {};
                }

                // 4. 映射文件名到 URL
                // 直接使用数据库里的 relativePath，只需确保它使用的是正斜杠
                const urlPath = relative_path.replace(/\\/g, '/');
                result[folderKey][file] = `/files/${urlPath}`;
            });

            res.json(result);
        } catch (e) {
            logger.error({ err: e }, 'Get file list failed');
            res.status(500).json({ error: 'get files failed' });
        }
    });
    app.post('/admin/refresh', authMiddleware, async (req, res) => {
        try {
            res.status(200).json({ message: 'refresh database start' });
            // 重新写入数据库
            await clearDatabase(db);
            await scanDirectory(config.paths.images, async (item) => {
                await saveToDatabase(db, item);
            });
            flush(db);
            logger.info('Refresh database finished');
        } catch (e) {
            logger.error({ err: e }, 'Refresh database failed');
            res.status(500).json({ error: 'refresh failed' });
        }
    });

    // 全局异常捕获 (Express 5)
    app.use((err, req, res, next) => {
        logger.error({ err }, 'Server error');
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    // 挂载静态目录
    app.use('/', express.static(path.resolve(config.paths.html)));
    app.use('/files', express.static(path.resolve(config.paths.images)));

    app.use((req, res) => {
        // 404处理
        res.status(404).json({ message: 'Not Fount' });
    });

    function getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.pdf': 'application/pdf',
            '.json': 'application/json'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

}

export { createRoute };
