/**
 * Web 服务器模块
 * 创建并启动 HTTP/HTTPS 服务器
 * 支持 SSL/TLS 配置及 Proxy Protocol 解析
 */

import express from 'express';
import http from 'http';
import https from 'https';
import logger from '../utils/loggerInstance.js';
import fs from 'fs-extra';
import path from 'path';
import proxywrap from 'findhit-proxywrap';
import { createRoute } from './api.js';
import { AppConfig } from '../types/index.js';

const app = express();

/**
 * 启动 Web 服务器
 * @param {AppConfig} config - 应用配置对象
 * @returns {Promise<void>}
 */
async function startWebserver(config: AppConfig): Promise<void> {

    const createWebServer = (config: AppConfig): void => {
        try {
            // 1. 包装 http 和 https 模块以支持 Proxy Protocol (v2)
            // strict: false 表示如果请求不带 PROXY 头（比如你本地直接访问），服务器也不会崩溃
            const proxiedHttp = proxywrap.proxy(http, { strict: false });
            const proxiedHttps = proxywrap.proxy(https, { strict: false });

            // 2. 创建 HTTP 服务器
            const httpserver = proxiedHttp.createServer(app);
            httpserver.listen(config.server.httpport, config.server.addr, () => {
                logger.info('HTTP (Proxy Protocol enabled) listen at http://%s:%d', config.server.addr, config.server.httpport);
            });

            // 3. 创建 HTTPS 服务器
            if (config.server.ssl.enable) {
                const ssl = {
                    key: fs.readFileSync(path.resolve(config.server.ssl.key)),
                    cert: fs.readFileSync(path.resolve(config.server.ssl.cert))
                };

                // 使用包装后的 proxiedHttps 创建实例
                const httpsserver = proxiedHttps.createServer(ssl, app);
                httpsserver.listen(config.server.httpsport, config.server.addr, () => {
                    logger.info('HTTPS (Proxy Protocol enabled) listen at https://%s:%d', config.server.addr, config.server.httpsport);
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
