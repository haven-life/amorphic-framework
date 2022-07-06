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

export interface HavenLoggerCommon {
    /**
     * This utility function converts the errData to ErrorLog that can be directly used with logger.error().
     * It adds isHumanRelated and code fields to the result from errData.
     * It adds message to the result from error or errData when possible. Use "error" when message not provided.
     * It adds name and stack fields to result when the fields are not empty.
     * If the error contains fields other than name, stack, and message, it will put them into
     * logErrorObj.data.fromError.
     * @param {Interfaces.ErrorData} errData - error data with mandatory fields and optional message.
     * @returns {Interfaces.ErrorLog} - returns logErrorObj
     */
    mapToErrorLog?(errData: Interfaces.ErrorData): Interfaces.ErrorLog;
}

export interface HavenLogger extends Interfaces.BunyanBaseInterface, HavenLoggerCommon {

    /**
     * Uses the request header's groupId and source value to set local storage context object.
     * By optionally setting 'generateContextIfMissing' to true, the middleware also has the ability to
     * generate new globalId and globalSource header values if the current values are missing in
     * request. Default value for 'generateContextIfMissing' is false.
     * @param {Interfaces.ApiContextMiddleware} options - This is an optional field. generateContextIfMissing
     * can be optionally specified as true (default is false), to create new global id and global source.
     * Note: The new globalId and globalSource would only be created if they are both not populated by request.
     * @returns {any} - returns any
     */
    setApiContextMiddleware?(options?: Interfaces.ApiContextMiddleware) : any;

    /**
     * This utility function would fetch the headers info from the current local storage context.
     * This can be useful in cases when you may want to propogate exisiting cached context header
     * to a new service.
     * @returns {Enums.GlobalHeaderType} - returns header object or type GlobalHeaderType
     */
    getHeaderContextFromLocalStorage?(): Enums.GlobalHeaderType;

    /**
     * Fetches current context from LocalStorage. This function returns undefined if called outside of a
     * asynchronous context initialized by calling "asyncLocalStorage.run"
     * @returns {Interfaces.Context} - returns Logger Context object
     */
    getContextFromLocalStorage?(): Interfaces.Context;

    /**
     * Uses the context object to set the entire local storage context (not just the headers).
     * By optionally setting 'generateContextIfMissing' to true, the middleware also has the ability to
     * generate new globalId and globalSource header values if the current values are missing in
     * request. Default value for 'generateContextIfMissing' is false.
     * @param {Interfaces.SourceContextMiddleware} options - context is required here. generateContextIfMissing
     * can be optionally specified as true (default is false), to create new global id and source.
     * @param {any} next - next items to run
     * @returns {Promise<any>} - returns promise
     */
    setContextFromSourceMiddleware?(options: Interfaces.SourceContextMiddleware, next): Promise<any>;

    /**
     * Set endpoint GET /uiLogConfig on backend server for UI Logger to fetch backend logLevel.
     * @param {Enums.ServerType} serverType - supported server type (express or restify) is required.
     * @param {any} server - server instance (express or restify) is required.
     * @returns void
     */
    addUIConfigHandler?(serverType: Enums.ServerType, server: any): void;

    /**
     * Set endpoint POST /uiLog on backend server for parsing logs sent from UI Logger.
     * Backend server would use this api to receive UI logs and use its logger to parse UI logs.
     * @param {Enums.ServerType} serverType - supported server type (express or restify) is required.
     * @param {any} server - server instance (express or restify) is required.
     * @param {HavenLogger} logger - logger instance (express or restify) is required.
     * @returns void
     */
    addUILogHandler?(serverType: Enums.ServerType, server: any, logger: HavenLogger): void;

    /**
     * Use this method to optionally set defaults for module, category, context.piiLevel,
     * error.isHumanRelated in the first parameter as an object. You may also use the
     * second parameter of the function to pass key/value pairs. These key/value pairs would
     * get set as default data elements on the log. Defaults set by this function can always be overwritten
     * by the individual log. For data element we merge the default's data element with log's data
     * element.
     * @param {Interfaces.ChildLogRootValues} rootValues - Optional. set module, category, context.piiLevel,
     * error.isHumanRelated defaults.
     * @param {Interfaces.ChildLogDataValues} dataValues - Optional. set key/value pair defaults, that get added
     * to the root level data objects.
     * @returns {HavenLogger}
     */
    childLogger?(rootValues?: Interfaces.ChildLogRootValues, dataValues?: Interfaces.ChildLogDataValues): HavenLogger;

}

export interface HavenUILogger extends Interfaces.BunyanBaseInterface, HavenLoggerCommon {

    /**
     * Use this method to optionally set defaults for module, category, context.piiLevel,
     * error.isHumanRelated in the first parameter as an object. You may also use the
     * second parameter of the function to pass key/value pairs. These key/value pairs would
     * get set as default data elements on the log. Defaults set by this function can always be overwritten
     * by the individual log. For data element however, we merge the default's data element with log's data
     * element.
     * @param {Interfaces.ChildLogRootValues} rootValues - Optional. set module, category, context.piiLevel,
     * error.isHumanRelated defaults.
     * @param {Interfaces.ChildLogDataValues} dataValues - Optional. set key/value pair defaults, that get added
     * to the root level data objects.
     * @returns {HavenUILogger}
     */
    childLogger?(rootValues?: Interfaces.ChildLogRootValues, dataValues?: Interfaces.ChildLogDataValues): HavenUILogger;
}

/**
 * Logger enums
 */
 export namespace Enums {
    export enum Category {
        security = 'security',
        availability = 'availability',
        request = 'request',
        milestone = 'milestone'
    }

    export enum PiiLevelEnum {
        's1' = 's1',
        's2' = 's2',
        'nonPII' = 'non-pii'
    }

    export const enum GlobalHeader {
        HT_GLOBAL_ID = 'HT-Global-Id',
        HT_GLOBAL_SOURCE = 'HT-Global-Source'
    }
    
    export type GlobalHeaderType = {
        [key in GlobalHeader]?: string;
    }

    export const enum ServerType {
        express = 'express',
        restify = 'restify'
    }

    export enum LogLevel {
        info = 'info',
        error = 'error',
        debug = 'debug',
        warn = 'warn'
    }
    
    export const LevelFromName: {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60
    };
}

/**
 * Logger types and interfaces
 */
export namespace Interfaces {
    export interface BunyanBaseInterface {
        info(): boolean;
        error(): boolean;
        debug(): boolean;
        warn(): boolean;
        info(object: ExpandedLog, ...params: any[]): void;
        info(message: string, functionName: string, piiLevel?: Enums.PiiLevelEnum): void;
        error(object: ExpandedLog, ...params: any[]): void;
        debug(object: ExpandedLog, ...params: any[]): void;
        warn(object: ExpandedLog, ...params: any[]): void;
    }
    
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
        piiLevel?:  Enums.PiiLevelEnum,
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
        category?: 'security' | 'availability' | 'request' | 'milestone',
        message?: string,
        context?: Context,
        error?: ErrorLog,
        request?: Request,
        response?: Response,
        data?: Data
    }
    
    export interface ChildLogRootValues {
        module?: string,
        category?: Enums.Category,
        context?: {
            piiLevel?: Enums.PiiLevelEnum
        },
        error?:  {
            isHumanRelated?: boolean
        }
    }
    
    export interface ChildLogDataValues {
        [key: string]: any;
    }
    
    export interface ExpandedLog extends Log {
        [key: string]: any;
    }

    export interface ApiContextMiddleware {
        generateContextIfMissing?: boolean
    }
    
    export interface SourceContextMiddleware extends ApiContextMiddleware {
        context?: Context
    }
}