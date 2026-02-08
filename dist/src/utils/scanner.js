import fs from 'fs-extra';
import path from 'path';
const posix = path.posix;
import logger from './loggerInstance.js';
export const scanDirectory = async (fullPath, callback, rootPath = fullPath) => {
    try {
        const resolvedPath = path.resolve(fullPath);
        const dir = await fs.opendir(resolvedPath, { withFileTypes: true });
        for await (const dirent of dir) {
            const itemPath = path.join(resolvedPath, dirent.name);
            const rel = path.relative(path.resolve(rootPath), itemPath);
            const relativePath = rel.split(path.sep).join('/');
            const relativeDirRaw = dirent.isDirectory()
                ? relativePath
                : posix.dirname(relativePath);
            const item = {
                file: dirent.name,
                path: itemPath,
                relativePath: relativePath,
                relativeDir: relativeDirRaw === '.' ? '' : relativeDirRaw,
                type: dirent.isDirectory() ? 'directory' : 'file'
            };
            await callback(item);
            if (dirent.isDirectory()) {
                await scanDirectory(itemPath, callback, rootPath);
            }
        }
    }
    catch (e) {
        logger.error({ err: e }, `Error scanning directory: ${fullPath}`);
    }
};
//# sourceMappingURL=scanner.js.map