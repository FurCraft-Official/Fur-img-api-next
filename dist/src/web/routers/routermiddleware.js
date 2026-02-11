import config from '../../utils/config.js';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { SqliteStore } from 'rate-limit-sqlite';
import { app } from '../server.js';
import { requestLogger } from '../middlewares/middleware.js';
async function rouerMiddlewares() {
    app.use((req, res, next) => {
        requestLogger(req, res, next);
    });
    if (config.server.cors.enable) {
        const corsConfig = {
            'origin': config.server.cors.origins,
            'methods': config.server.cors.methods,
            'preflightContinue': config.server.cors.preflightContinue,
            'optionsSuccessStatus': config.server.cors.optionsSuccessStatus
        };
        app.use(cors(corsConfig));
    }
    if (config.server.rateLimit.enable) {
        const limiter = rateLimit({
            windowMs: config.server.rateLimit.windowMS * 60 * 1000,
            limit: config.server.rateLimit.limit,
            standardHeaders: config.server.rateLimit.standardHeaders,
            legacyHeaders: config.server.rateLimit.legacyHeaders,
            validate: { trustProxy: true },
            message: config.server.rateLimit.message,
            statusCode: config.server.rateLimit.statusCode,
            store: new SqliteStore({
                location: config.db.sqlite3.file,
                prefix: ''
            })
        });
        app.use(limiter);
    }
    if (config.server.gzip) {
        app.use(compression({
            filter: (req, res) => {
                const type = res.getHeader('Content-Type');
                if (!type) {
                    return compression.filter(req, res);
                }
                const isHighlyCompressed = typeof type === 'string' && (type.includes('image/jpeg') ||
                    type.includes('image/png') ||
                    type.includes('image/webp') ||
                    type.includes('image/gif') ||
                    type.includes('image/avif'));
                if (isHighlyCompressed) {
                    return false;
                }
                return compression.filter(req, res);
            }
        }));
    }
}
export { rouerMiddlewares };
//# sourceMappingURL=routermiddleware.js.map