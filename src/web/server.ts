/**
* Web 服务器模块
* 创建并启动 HTTP/HTTPS 服务器
* 支持 SSL/TLS 配置
*/

import express from 'express';
import http from 'http';
import https from 'https';
import logger from '../utils/loggerInstance.js';
import fs from 'fs-extra';
import path from 'path';
import { createRoute } from './api.js';
import { AppConfig } from '../types/index.js';
const app = express();

/**
* 启动 Web 服务器
* 创建 HTTP 和 HTTPS 服务器实例，挂载路由，启动监听
* @param {AppConfig} config - 应用配置对象
* @returns {Promise<void>} 异步操作完成后返回
*/
async function startWebserver(config: AppConfig): Promise<void> {
    /**
  * 创建 Web 服务器
  * 根据配置创建 HTTP 服务器，可选创建 HTTPS 服务器
* @param {AppConfig} config - 应用配置对象
  * @returns {void}
  * @throws {Error} 服务器启动失败时退出进程
  */
    const createWebServer = (config: AppConfig): void => {
        try {
            // 创建http服务器
            const httpserver = http.createServer(app);
            httpserver.listen(config.server.httpport, config.server.addr, () => {
                logger.info('HTTP listen at http://%s:%d', config.server.addr, config.server.httpport);
            });
            if (config.server.ssl.enable) {
                // 创建https服务器
                const ssl = {
                    key: fs.readFileSync(path.resolve(config.server.ssl.key)),
                    cert: fs.readFileSync(path.resolve(config.server.ssl.cert))
                };
                const httpsserver = https.createServer(ssl, app);
                httpsserver.listen(config.server.httpsport, config.server.addr, () => {
                    logger.info('HTTPS listen at https://%s:%d', config.server.addr, config.server.httpsport);
                });
            }
        } catch (e) {
            logger.error({ err: e }, 'Failed to start server');
            process.exit(1);
        }
    };
    // 挂载路由
    createRoute();
    // 创建web服务器
    createWebServer(config);
}

export { startWebserver, app };

