import logger from '../../utils/loggerInstance.js';
import config from '../../utils/config.js';
import fs from 'fs-extra';
import path from 'path';
import { app } from '../server.js';
import { getRandomFromAll, getRandomFromFolder } from '../../database/db.js';
import { formatFileInfo } from '../middleware.js';
import mime from 'mime-types';
async function routerRandomIMG() {
    app.get('/api', (req, res) => {
        try {
            const filedata = getRandomFromAll();
            const file = filedata;
            if (!file) {
                return res.status(404).json({ error: 'No files found' });
            }
            if (req.query.json === 'true') {
                const FileInfo = formatFileInfo(file, config.paths.images);
                return res.json(FileInfo);
            }
            const filePath = path.resolve(file.path);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const mimeType = mime.lookup(file.file) || 'application/octet-stream';
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=60');
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            fileStream.on('error', (err) => {
                logger.error({ err }, 'Stream error');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream failed' });
                }
            });
        }
        catch (e) {
            logger.error({ err: e }, 'API error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
    app.get('/api/*splat', (req, res) => {
        try {
            const urlFolder = req.params.splat.join('/');
            const filedata = getRandomFromFolder(urlFolder);
            const file = filedata;
            if (!file) {
                return res.status(404).json({ error: 'No files found in this folder' });
            }
            if (req.query.json === 'true') {
                const FileInfo = formatFileInfo(file, config.paths.images);
                return res.json(FileInfo);
            }
            const filePath = path.resolve(file.path);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found' });
            }
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const mimeType = mime.lookup(file.file) || 'application/octet-stream';
            res.setHeader('Content-Length', fileSize);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=60');
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            fileStream.on('error', (err) => {
                logger.error({ err }, 'Stream error');
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Stream failed' });
                }
            });
        }
        catch (err) {
            logger.error({ err }, 'API folder error');
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    });
}
export { routerRandomIMG };
//# sourceMappingURL=randomimg.js.map