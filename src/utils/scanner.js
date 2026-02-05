import fs from 'fs-extra';
import path from 'path';
import logger from './loggerInstance.js';

export const scanDirectory = async (fullPath, callback, rootPath = fullPath) => {
    try {
        const resolvedPath = path.resolve(fullPath);
        const dir = await fs.opendir(resolvedPath, { withFileTypes: true });

        for await (const dirent of dir) {
            const itemPath = path.join(resolvedPath, dirent.name);
            const relativePath = path.relative(path.resolve(rootPath), itemPath);

            // 获取文件所在目录的相对路径
            // 如果是文件：返回其父目录的相对路径
            // 如果是目录：返回其自身的相对路径
            const relativeDir = dirent.isDirectory()
                ? relativePath
                : path.dirname(relativePath);

            const item = {
                file: dirent.name,
                path: itemPath,
                relativePath: relativePath,
                relativeDir: relativeDir === '.' ? '' : relativeDir, // 如果是根目录，设为空字符串或 '.'
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
