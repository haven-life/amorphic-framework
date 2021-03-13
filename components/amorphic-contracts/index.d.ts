/**
 * application configuration store object
 *
 * get => Gets properties from this config object
 * set => Sets a key value pair for this config object
 * loadFile => loads a file into config object
 */
export interface Config {
    get(key: string): any
    set(key: string, value: any): any
    loadFile(fileKey: string, file: string): any
    build(configRootDirectory: string, merge?: boolean): ApplicationNameToConfigMap
}

/**
 * Type to define what the config builder function should look like for Amorphic
 */
export type AmorphicConfigBuilder = (configRootDirectory: string, merge?: boolean) => ApplicationNameToConfigMap;

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