import fs from 'fs-extra';
import path from 'path';
// 这里的关键：引入 posix 版本处理 URL 风格路径
const posix = path.posix;
import logger from './loggerInstance.js';

export const scanDirectory = async (fullPath, callback, rootPath = fullPath) => {
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
