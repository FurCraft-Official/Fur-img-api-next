/**
 * 中间件模块
 * 提供请求日志、身份验证、文件信息格式化等中间件功能
 */

import fs from 'fs-extra';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/loggerInstance.js';
import dayjs from 'dayjs';
import config from '../utils/config.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { fileObj } from '../types/index.js';
dayjs.extend(customParseFormat);

/**
 * 格式化文件信息
 * 将数据库中的文件对象转换为 API 响应格式
 * 计算文件大小、修改时间，生成可访问的 URL
 * @param {fileObj} fileObj - 数据库中的文件对象
 * @param {string} baseScanPath - 基础扫描路径，用于计算相对 URL
 * @returns {Object} 格式化后的文件信息对象，包含 id、name、size、mtime、url
 */
const formatFileInfo = (fileObj: fileObj, baseScanPath: string): { id: number; name: string; size: number; mtime: any; url: string } | undefined => {
    try {
        const absolutePath = path.resolve(fileObj.path);
        const stats = fs.statSync(absolutePath);

        // 计算相对路径用于拼接 URL
        // 例如：E:\api\tupian\wallpaper\1.jpg -> wallpaper/1.jpg
        const relativePath = path.relative(path.resolve(baseScanPath), absolutePath);
        const time = dayjs(stats.mtime).format('YYYY-MM-DD HH:mm:ss');
        // 将 Windows 路径分隔符 \ 转换为 URL 分隔符 /
        const urlPath = relativePath.split(path.sep).join('/');
        const result = {
            id: fileObj.id,
            name: fileObj.file,
            size: stats.size, // 字节
            mtime: time, // 修改时间
            // 拼接挂载在 /files 下的静态访问路径
            url: `/files/${urlPath}`
        };
        return result;
    } catch (e) {
        logger.error({ err: e, path: fileObj.path }, 'Failed to parse JSON from file object');
    }
};
function requestLogger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const size = res.get('Content-Length') || 0;
        logger.info({ ip: req.ip, method: req.method, url: req.url, statusCode: res.statusCode, duration: `${duration}ms`, size: `${size}bytes` }, 'Request completed');
    });

    next();
}
function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const adminToken = config.admintoken;
    const clientToken = req.query.token;

    if (!adminToken || adminToken.trim() === '') {
        return res.status(401).json({ error: 'unauthorized_server_config' });
    }

    if (clientToken === adminToken) {
        return next(); // 验证通过，继续
    }

    return res.status(401).json({ error: 'unauthorized' });
}
export { formatFileInfo, requestLogger, authMiddleware };
