/**
 * API 路由配置模块
 * 注册应用的所有路由和中间件
 * 包括管理员路由、静态文件、随机图片、状态检查等
 */

import logger from '../utils/loggerInstance.js';
import { routerAdmin } from './router/admin.js';
import { routerStaticfiles } from './router/staticfiles.js';
import { routerRandomIMG } from './router/randomimg.js';
import { app } from './server.js';
import { routerStatus } from './router/status.js';
import { rouerMiddlewares } from './router/routermiddleware.js';
import { Request, Response, NextFunction } from 'express';


/**
 * 创建应用路由
 * 注册所有中间件和路由处理器
 * 设置全局异常捕获和 404 处理
 * @returns {Promise<void>} 异步操作完成后返回
 */
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
