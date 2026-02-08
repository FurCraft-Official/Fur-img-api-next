import logger from '../utils/loggerInstance.js';
import { routerAdmin } from './router/admin.js';
import { routerStaticfiles } from './router/staticfiles.js';
import { routerRandomIMG } from './router/randomimg.js';
import { app } from './server.js';
import { routerStatus } from './router/status.js';
import { rouerMiddlewares } from './router/routermiddleware.js';
import { Request, Response, NextFunction } from 'express'


async function createRoute() {
    app.set('trust proxy', 'loopback');
    rouerMiddlewares();
    routerRandomIMG();
    routerStaticfiles();
    routerStatus();
    routerAdmin();


    // 全局异常捕获 (Express 5)
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error({ err }, 'Server error');
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    app.use((req, res) => {
        // 404处理
        res.status(404).json({ message: 'Not Fount' });
    });


}

export { createRoute };
