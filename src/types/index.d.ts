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
            enabled: boolean;
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
            standardHeaders: string;
            legacyHeaders: boolean;
            validate: {
                trustProxy: boolean;
            };
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

export interface scanObj {
    file: string
    path: string
    relativeDir: string
    relativePath: string
    type: string
}

export interface fileObj {
    file: string
    id: number
    path: string
    relative_dir: string
    relative_path: string
    type: string
}

export interface banlistObj {
    ip: string
    totalHits: number
    resetTime: Date
}

interface LogFileEntry {
    name: string;
    path: string;
    time: number;
}