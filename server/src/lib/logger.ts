/**
 * Winston Logger Configuration
 *
 * Replaces console.log with structured logging
 * Features:
 * - JSON logs in production for parsing
 * - Pretty colored logs in development
 * - Log levels (error, warn, info, debug)
 * - Automatic metadata injection (timestamp, requestId)
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  return msg;
});

// Production format (JSON for log aggregation)
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

// Development format (colored, readable)
const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  devFormat
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? prodFormat : developmentFormat,
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error']
    })
  ],
  // Don't exit on error
  exitOnError: false
});

// Add file transport in production for persistent logs
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }));
}

/**
 * Helper functions for common logging patterns
 */
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, error?: any, meta?: any) => {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
      logger.error(message, { error, ...meta });
    }
  },
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),

  // Domain-specific loggers
  api: (method: string, path: string, statusCode: number, duration: number, meta?: any) => {
    logger.info(`${method} ${path} ${statusCode} ${duration}ms`, meta);
  },

  auth: (action: string, userId?: string, meta?: any) => {
    logger.info(`[Auth] ${action}`, { userId, ...meta });
  },

  db: (operation: string, table: string, duration?: number, meta?: any) => {
    logger.debug(`[DB] ${operation} ${table}`, { duration, ...meta });
  },

  stripe: (event: string, meta?: any) => {
    logger.info(`[Stripe] ${event}`, meta);
  },

  github: (action: string, handle?: string, meta?: any) => {
    logger.debug(`[GitHub] ${action}`, { handle, ...meta });
  },

  chekklist: (action: string, meta?: any) => {
    logger.info(`[Chekklist] ${action}`, meta);
  }
};

// Override console methods in production to ensure all logs go through Winston
if (process.env.NODE_ENV === 'production') {
  console.log = (...args: any[]) => logger.info(args.join(' '));
  console.error = (...args: any[]) => logger.error(args.join(' '));
  console.warn = (...args: any[]) => logger.warn(args.join(' '));
  console.info = (...args: any[]) => logger.info(args.join(' '));
  console.debug = (...args: any[]) => logger.debug(args.join(' '));
}

export default logger;
