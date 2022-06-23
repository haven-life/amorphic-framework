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
 * Logger Object types and interfaces
 */
 export namespace Logger {
    export type Data = {
        [key: string]: any;
    }

    export type strNumKeyValuePair = {
        [key: string]: number | string;
    }

    export interface ErrorData {
        isHumanRelated: boolean;
        code?: string;
        error?: any;
        message?: string;
        data?: Data & { fromError?: never };
    }

    export interface Context {
        globalId?: string,
        globalSource?: string,
        referenceId?: string,
        referenceType?: string,
        sessionId? : string,
        piiLevel?: any,
        data?: Data
    }

    export interface ErrorLog {
        isHumanRelated?: boolean,
        code?: string,
        name?: string,
        message?: string,
        stack?: string,
        data?: Data
    }

    interface GeoIP  {
        latitude?: number,
        longitude?: number,
        cityName?: string,
        stateName?: string,
        postalCode?: string,
        timeZone?: string,
        countryName?: string,
        countryCode?: string,
        continentCode?: string
    }

    export interface Request {
        url?: string,
        method?: string,
        clientIpAddress?: string,
        data?: Data,
        remoteUser?: string,
        remoteAddress?: string,
        line?: string,
        length?: number,
        time?: number,
        headers?: string,
        status?: number,
        bytesSent?: number,
        bodyBytesSent?: number,
        httpReferer?: string,
        httpUserAgent?: string,
        httpXForwardedFor?: string,
        upstreamAddress?: string,
        upstreamStatus?: number,
        upstreamResponseTime?: number,
        upstreamConnectTime?: number,
        upstreamHeaderTime?: number,
        upstreamBytesReceived?: number,
        upstreamBytesSent?: number,
        geoip?: GeoIP
    }

    export interface Response {
        status?: number,
        data?: Data
    }
    
    export interface Log {
        module?: string,
        function?: string,
        category?: 'security' | 'availability' | 'request' | 'milestone'
        message?: string,
        context?: Context,
        error?: ErrorLog,
        request?: Request,
        response?: Response,
        data?: Data
    }    
}

/**
 * logger function
 */
export type LoggerFunction = (logLevel: string, logObject: Logger.Log, ...rawLogData) => void