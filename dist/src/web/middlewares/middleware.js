import fs from 'fs-extra';
import path from 'path';
import logger from '../../utils/loggerInstance.js';
import dayjs from 'dayjs';
import config from '../../utils/config.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(customParseFormat);
const formatFileInfo = (fileObj, baseScanPath) => {
    try {
        const absolutePath = path.resolve(fileObj.path);
        const stats = fs.statSync(absolutePath);
        const relativePath = path.relative(path.resolve(baseScanPath), absolutePath);
        const time = dayjs(stats.mtime).format('YYYY-MM-DD HH:mm:ss');
        const urlPath = relativePath.split(path.sep).join('/');
        const result = {
            id: fileObj.id,
            name: fileObj.file,
            size: stats.size,
            mtime: time,
            url: `/files/${urlPath}`
        };
        return result;
    }
    catch (e) {
        logger.error({ err: e, path: fileObj.path }, 'Failed to parse JSON from file object');
    }
};
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const size = res.get('Content-Length') || 0;
        logger.info({ ip: req.ip, method: req.method, url: req.url, statusCode: res.statusCode, duration: `${duration}ms`, size: `${size}bytes` }, 'Request completed');
    });
    next();
}
function authMiddleware(req, res, next) {
    const adminToken = config.admintoken;
    const clientToken = req.query.token;
    if (!adminToken || adminToken.trim() === '') {
        return res.status(401).json({ error: 'unauthorized_server_config' });
    }
    if (clientToken === adminToken) {
        return next();
    }
    return res.status(401).json({ error: 'unauthorized' });
}
export { formatFileInfo, requestLogger, authMiddleware };
//# sourceMappingURL=middleware.js.map