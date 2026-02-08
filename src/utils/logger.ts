import pino from 'pino';
import pretty from 'pino-pretty';
import fs from 'fs-extra';
import { AppConfig, LogFileEntry } from '../types/index.js';
import { join } from 'path';
import dayjs from 'dayjs';

// 强制开启颜色显示，解决 Windows 环境下颜色对不上的问题
process.env.FORCE_COLOR = '1';

const LOG_LEVELS: Record<number, string> = {
    0: 'silent',
    1: 'fatal',
    2: 'error',
    3: 'warn',
    4: 'info',
    5: 'debug',
    6: 'trace'
};

class FileStream {
    [key: string]: any
    constructor(filePath: string) {
        this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    }

    write(msg: string) {
        try {
            const log = JSON.parse(msg);
            const timestamp = `[${dayjs(log.time).format('YYYY-MM-DD HH:mm:ss')}]`;
            const level = this.formatLevel(log.level);
            const message = log.msg || '';

            let errorInfo = '';
            if (log.err) {
                errorInfo = `\n  Error: ${log.err.message || ''}`;
                if (log.err.stack) {
                    errorInfo += `\n  Stack: ${log.err.stack}`;
                }
            }

            const extras = Object.keys(log)
                .filter(key => !['level', 'time', 'msg', 'pid', 'hostname', 'err'].includes(key))
                .map(key => `${key}=${JSON.stringify(log[key])}`)
                .join(' ');

            const extrasPart = extras ? ` ${extras}` : '';
            const output = `${timestamp} ${level} ${message}${extrasPart}${errorInfo}\n`;

            this.stream.write(output);
        } catch (e) {
            this.stream.write(msg + '\n');
        }
    }

    formatLevel(levelNumber: number): string {
        const levels: Record<number, string> = {
            10: '[trace]',
            20: '[debug]',
            30: '[info] ',
            40: '[warn] ',
            50: '[error]',
            60: '[fatal]'
        };
        return levels[levelNumber] || '[info] ';
    }
}

// 检查单个文件大小，超过则重命名归档
async function checkAndRotateSize(filePath: string, maxSizeMB: number) {
    if (!maxSizeMB || maxSizeMB <= 0) return;
    try {
        if (await fs.pathExists(filePath)) {
            const stats = await fs.stat(filePath);
            const maxSizeBytes = maxSizeMB * 1024 * 1024;
            if (stats.size > maxSizeBytes) {
                // 如果文件太大，将其重命名为：app-2026-02-05.172230.bak
                const archivePath = `${filePath}.${dayjs().format('HHmmss')}.bak`;
                await fs.move(filePath, archivePath);
            }
        }
    } catch (err) {
        console.error('Failed to rotate log by size:', err);
    }
}

async function rotateOldLogs(logPath: string, maxFiles: number): Promise<void> {
    try {
        const files: string[] = await fs.readdir(logPath);

        const logFiles: LogFileEntry[] = files
            .filter((f: string) => (f.startsWith('app-') && f.endsWith('.log')) || f.endsWith('.bak'))
            .map((f: string): LogFileEntry => ({
                name: f,
                path: join(logPath, f),
                // 如果对性能有追求，建议这里改用 await fs.stat()
                time: fs.statSync(join(logPath, f)).mtime.getTime()
            }))
            .sort((a: LogFileEntry, b: LogFileEntry) => b.time - a.time);

        if (logFiles.length > maxFiles) {
            const filesToDelete = logFiles.slice(maxFiles);
            for (const file of filesToDelete) {
                // file 现在有完美的类型提示了
                await fs.remove(file.path);
            }
        }
    } catch (err) {
        // 在 TS 中 err 默认为 unknown，这里转一下
        const error = err as Error;
        console.error('Failed to rotate logs by count:', error.message);
    }
}

let loggerInstance: ReturnType<typeof pino>;

export async function initLogger(config: AppConfig) {
    const logLevel = LOG_LEVELS[config.log?.level ?? 4] || 'info';
    const logPath = config.log?.path || './logs';
    const enableConsole = config.log?.console !== false;
    const enableFile = config.log?.file !== false;
    const maxFiles = config.log?.maxFiles || 7;
    const maxSize = config.log?.maxSize || 10; // 默认 10MB
    const streams: any[] = [];
    await fs.ensureDir(logPath);

    if (enableFile) {
        const logFileName = `app-${dayjs().format('YYYY-MM-DD')}.log`;
        const logFile = join(logPath, logFileName);

        // --- 新增：写入前先检查大小 ---
        await checkAndRotateSize(logFile, maxSize);

        await fs.ensureFile(logFile);

        streams.push({
            level: logLevel,
            stream: new FileStream(logFile)
        });
    }

    if (enableConsole) {
        streams.push({
            level: logLevel,
            stream: pretty({
                colorize: true,
                translateTime: 'yyyy-mm-dd HH:MM:ss',
                ignore: 'pid,hostname',
                singleLine: true,
                messageFormat: '{msg}',
                customColors: 'trace:gray,debug:blue,info:green,warn:yellow,error:red,fatal:bgRed',
                errorLikeObjectKeys: ['err', 'error']
            })
        });
    }

    loggerInstance = pino(
        {
            level: logLevel,
            timestamp: pino.stdTimeFunctions.isoTime,
            serializers: { err: pino.stdSerializers.err }
        },
        pino.multistream(streams)
    );

    if (enableFile && maxFiles > 0) {
        await rotateOldLogs(logPath, maxFiles);
    }

    return loggerInstance;
}

export function getLogger() {
    if (!loggerInstance) {
        return pino({ level: 'info' });
    }
    return loggerInstance;
}

export default getLogger;
