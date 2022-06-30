import { Enums } from './logger-enums';

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