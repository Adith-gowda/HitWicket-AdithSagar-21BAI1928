const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const logDir = path.join(__dirname, 'logs');

const transport = new DailyRotateFile({
    filename: path.join(logDir, '%DATE%-combined.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,      
    maxSize: '20m',           
    maxFiles: '14d'           
});

// Create a winston logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level}]: ${message}${stack ? `\nStack: ${stack}` : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        transport,
        new winston.transports.File({ filename: path.join(logDir, 'errors.log'), level: 'error' })
    ],
});

module.exports = logger;
