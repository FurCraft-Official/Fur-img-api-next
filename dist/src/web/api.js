import logger from '../utils/loggerInstance.js';
import { routerAdmin } from './routers/admin.js';
import { routerStaticfiles } from './routers/staticfiles.js';
import { routerRandomIMG } from './routers/randomimg.js';
import { app } from './server.js';
import { routerStatus } from './routers/status.js';
import { rouerMiddlewares } from './routers/routermiddleware.js';
async function createRoute() {
    app.set('trust proxy', 'loopback');
    rouerMiddlewares();
    routerRandomIMG();
    routerStaticfiles();
    routerStatus();
    routerAdmin();
    app.use((err, req, res, next) => {
        logger.error({ err }, 'Server error');
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.use((req, res) => {
        res.status(404).json({ message: 'Not Fount' });
    });
}
export { createRoute };
//# sourceMappingURL=api.js.map