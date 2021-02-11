/**
 * application configuration store object
 */
export interface Config {
    get(key: string): any
    set(key: string, value: any): any
    loadFile(fileKey: string, file: string): any
    buildConfig(configRootDirectory: string, merge: boolean): any
}

export interface ApplicationNameToConfigMap {
    [appName: string]: Config
}

/**
 * monitoring module
 */
export interface StatsdClientInterface {
    timing(statsKey: string, timer: number | Date, tags?: object): void
    counter(statsKey: string, num: number, tags?: object): void
}

/**
 * logger function
 */
export type LoggerFunction = (logLevel: string, logObject: any, ...rawLogData) => void