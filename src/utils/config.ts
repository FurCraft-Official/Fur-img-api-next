/**
 * 配置模块
 * 负责初始化和读取应用配置文件
 * 如果配置文件不存在，会创建默认配置
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * 初始化配置
 * 检查配置文件是否存在，如果不存在则创建默认配置
 * @returns {Promise<void>} 异步操作完成后返回
 */
async function initConfig() {
    try {
        const exists = await fs.pathExists(path.resolve('./data/config.json'));
        const data = {
            'server': {
                'addr': 'localhost',
                'httpport': 3000,
                'httpsport': 3001,
                'forcehttps': false,
                'gzip': true,
                'ssl': {
                    'enable': false,
                    'cert': './ssl/fullchain.pem',
                    'key': './ssl/privkey.pem'
                },
                'cors': {
                    'enabled': true,
                    'origins': '*',
                    'methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'preflightContinue': false,
                    'optionsSuccessStatus': 204
                },
                'rateLimit': {
                    'enable': true,
                    'windowMS': 15,
                    'limit': 100,
                    'statusCode': 429,
                    'message': 'too many requests',
                    'standardHeaders': 'draft-8',
                    'legacyHeaders': false,
                    'validate': {
                        'trustProxy': false
                    }
                }
            },
            'db': {
                'sqlite3': {
                    'file': './data/app.db'
                }
            },
            'log': {
                'path': './logs',
                'level': 4,
                'console': true,
                'file': true,
                'maxFiles': 7,
                'maxSize': '10M'
            },
            'paths': {
                'html': './public',
                'images': './img'
            },
            'admintoken': '114514'

        };
        if (!exists) {
            try {
                // 初始化配置
                await fs.outputJsonSync(path.resolve('./data/config.json'), data, { spaces: 4 });
                console.log('Default configuration file created at ./config/config.json');
            } catch (e) {
                console.error('Failed to create default config file:', e);
            }
        }
    } catch (e) {
        console.error('Failed to initialize config:', e);
        process.exit(1);
    }
}
/**
 * 读取配置文件
 * 从 config.json 读取应用配置
 * @returns {Promise<AppConfig>} 返回应用配置对象
 * @throws {Error} 配置文件读取失败时退出进程
 */
async function readConfig() {
    try {
        const configData = await fs.readJSON(path.resolve('./data/config.json'));
        return configData;
    } catch (e) {
        console.error('Failed to read config:', e);
        process.exit(1);
    }
}
await initConfig();
const config = await readConfig();
console.log('Configuration load successfully.');
export default config;
