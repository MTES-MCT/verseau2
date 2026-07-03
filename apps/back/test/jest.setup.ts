import { ConsoleLogger, Logger } from '@nestjs/common';

const noop = () => undefined;

process.env.DOTENV_CONFIG_QUIET = 'true';

console.log = noop;
console.warn = noop;
console.error = noop;

Logger.overrideLogger(false);

ConsoleLogger.prototype.log = noop;
ConsoleLogger.prototype.warn = noop;
ConsoleLogger.prototype.error = noop;
ConsoleLogger.prototype.debug = noop;
ConsoleLogger.prototype.verbose = noop;
ConsoleLogger.prototype.fatal = noop;
