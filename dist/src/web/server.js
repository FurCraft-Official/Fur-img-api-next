import express from 'express';
import http from 'http';
import https from 'https';
import logger from '../utils/loggerInstance.js';
import fs from 'fs-extra';
import path from 'path';
import { createRoute } from './api.js';
const app = express();
async function startWebserver(config) {
    const createWebServer = (config) => {
        try {
            const httpserver = http.createServer(app);
            httpserver.listen(config.server.httpport, config.server.addr, () => {
                logger.info('HTTP listen at http://%s:%d', config.server.addr, config.server.httpport);
            });
            if (config.server.ssl.enable) {
                const ssl = {
                    key: fs.readFileSync(path.resolve(config.server.ssl.key)),
                    cert: fs.readFileSync(path.resolve(config.server.ssl.cert))
                };
                const httpsserver = https.createServer(ssl, app);
                httpsserver.listen(config.server.httpsport, config.server.addr, () => {
                    logger.info('HTTPS listen at https://%s:%d', config.server.addr, config.server.httpsport);
                });
            }
        }
        catch (e) {
            logger.error({ err: e }, 'Failed to start server');
            process.exit(1);
        }
    };
    createRoute();
    createWebServer(config);
}
export { startWebserver, app };
//# sourceMappingURL=server.js.map