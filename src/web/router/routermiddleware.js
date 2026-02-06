import config from '../../utils/config.js';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { SqliteStore } from 'rate-limit-sqlite';
import { app } from '../server.js';
import { requestLogger } from '../middleware.js';

async function rouerMiddlewares() {
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
            statusCode: config.server.rateLimit.statusCode,
            store: new SqliteStore({
                location: config.db.sqlite3.file,
                prefix: 'limiter_'
            })
        });
        app.use(limiter);
    }
    if (config.server.gzip) {
        app.use(compression());
    }
    app.use((req, res, next) => {
        // 日志中间件
        requestLogger(req, res, next);
    });
}

export { rouerMiddlewares };
