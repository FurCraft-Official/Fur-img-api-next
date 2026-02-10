/**
 * 应用配置接口
 * 定义了服务器、数据库、日志和路径的所有配置选项
 */
export interface AppConfig {
    server: {
        addr: string;
        httpport: number;
        httpsport: number;
        forcehttps: boolean;
        gzip: boolean;
        ssl: {
            enable: boolean;
            cert: string;
            key: string;
        };
        cors: {
            enable: boolean;
            origins: string;
            methods: string;
            preflightContinue: boolean;
            optionsSuccessStatus: number;
        };
        rateLimit: {
            enable: boolean;
            windowMS: number;
            limit: number;
            statusCode: number;
            message: string;
            standardHeaders: boolean | 'draft-6' | 'draft-7' | 'draft-8';
            legacyHeaders: boolean;
        };
    };
    db: {
        sqlite3: {
            file: string;
        };
    };
    log: {
        path: string;
        level: number;
        console: boolean;
        file: boolean;
        maxFiles: number;
        maxSize: number;
    };
    paths: {
        html: string;
        images: string;
    };
    admintoken: string;
}

/**
 * 扫描对象接口
 * 表示文件系统扫描过程中的单个文件或目录项
 */
export interface scanObj {
    file: string
    path: string
    relativeDir: string
    relativePath: string
    type: string
}

/**
 * 文件对象接口
 * 表示存储在数据库中的文件记录
 */
export interface fileObj {
    file: string
    id: number
    path: string
    relative_dir: string
    relative_path: string
    type: string
}

/**
 * 封禁列表对象接口
 * 表示速率限制中被封禁的 IP 地址信息
 */
export interface banlistObj {
    ip: string
    totalHits: number
    resetTime: Date
}

/**
 * 日志文件条目接口
 * 用于日志轮转和管理
 */
interface LogFileEntry {
    name: string;
    path: string;
    time: number;
}
