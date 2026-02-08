import { initLogger } from './logger.js';
import config from './config.js';
export const logger = await initLogger(config);
logger.info('Logger initialized');
export default logger;
//# sourceMappingURL=loggerInstance.js.map