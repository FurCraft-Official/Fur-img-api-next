import { app } from '../server.js';
import express from 'express';
import path from 'path';
import config from '../../utils/config.js';
async function routerStaticfiles() {
    app.use('/', express.static(path.resolve(config.paths.html)));
    app.use('/files', express.static(path.resolve(config.paths.images)));
}
export { routerStaticfiles };
//# sourceMappingURL=staticfiles.js.map