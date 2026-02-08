/**
 * 目录扫描模块
 * 递归扫描指定目录中的所有文件和子目录
 * 支持跨平台路径转换（Windows \ 转 Unix /）
 */

import fs from 'fs-extra';
import path from 'path';
// 这里的关键：引入 posix 版本处理 URL 风格路径
const posix = path.posix;
import logger from './loggerInstance.js';
import { scanObj } from '../types/index.js';

/**
 * 递归扫描目录
 * 遍历指定目录中的所有文件和子目录，对每个项目执行回调函数
 * 自动转换路径分隔符为 Unix 格式（/）
 * @param {string} fullPath - 要扫描的完整目录路径
 * @param {Function} callback - 对每个扫描项执行的异步回调函数
 * @param {string} rootPath - 根路径（用于计算相对路径），默认为 fullPath
 * @returns {Promise<void>} 扫描完成后返回
 * @throws {Error} 扫描过程中的错误会被捕获并记录
 */
export const scanDirectory = async (fullPath: string, callback: (item: scanObj) => Promise<void>, rootPath = fullPath) => {
    try {
        const resolvedPath = path.resolve(fullPath);
        const dir = await fs.opendir(resolvedPath, { withFileTypes: true });

        for await (const dirent of dir) {
            const itemPath = path.join(resolvedPath, dirent.name);

            // 1. 先用原生 path 计算出当前系统的相对路径
            const rel = path.relative(path.resolve(rootPath), itemPath);

            // 2. 核心修正：如果是 Windows，把 \ 统一换成 /
            // path.sep 在 Windows 是 \，在 Linux 是 /
            const relativePath = rel.split(path.sep).join('/');

            // 3. 使用 posix 逻辑处理目录名，确保结果永远是 /
            const relativeDirRaw = dirent.isDirectory()
                ? relativePath
                : posix.dirname(relativePath);

            const item = {
                file: dirent.name,
                path: itemPath, // 绝对路径保留系统原生格式，方便 fs 读取
                relativePath: relativePath, // 已转换为 /
                relativeDir: relativeDirRaw === '.' ? '' : relativeDirRaw,
                type: dirent.isDirectory() ? 'directory' : 'file'
            };

            await callback(item);

            if (dirent.isDirectory()) {
                await scanDirectory(itemPath, callback, rootPath);
            }
        }
    } catch (e) {
        logger.error({ err: e }, `Error scanning directory: ${fullPath}`);
    }
};
