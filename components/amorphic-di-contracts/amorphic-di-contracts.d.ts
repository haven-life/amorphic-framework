// config object consumed by amorphic
export type Config = {
    get(key: string): any;
    set(key: string, value: any): any;
    loadFile(fileKey: string, file: string): any;
    buildConfig(configRootDirectory: string, merge: boolean): any;
};

// logger object consumed by amorphic
export type LoggerFunction = (logLevel: string, logObject: any, ...rawLogData) => void;