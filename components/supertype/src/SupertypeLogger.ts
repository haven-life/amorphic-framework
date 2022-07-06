const levelToStr = { 60: 'fatal', 50: 'error', 40: 'warn', 30: 'info', 20: 'debug', 10: 'trace' };
const strToLevel = { 'fatal': 60, 'error': 50, 'warn': 40, 'info': 30, 'debug': 20, 'trace': 10 };

import type { Enums, HavenLogger, Interfaces } from '@haventech/amorphic-contracts';

function isObject(obj) {
    return obj != null
        && typeof (obj) === 'object'
        && !(obj instanceof Array)
        && !(obj instanceof Date)
        && !(obj instanceof Error);
}

export class SupertypeLogger implements HavenLogger {
    context: any;

    // for overriding
    // sendToLog: Function;
    // formatDateTime: Function;

    constructor() {
        this.context = {};
    }

    error(): boolean;
    error(object: Interfaces.ExpandedLog, ...params: any[]): void;
    error(...args: any[]): void | boolean {
        this.log('error' as Enums.LogLevel, ...args);
    }

    warn(): boolean;
    warn(object: Interfaces.ExpandedLog, ...params: any[]): void;
    warn(...args: any[]): void | boolean {
        this.log('warn' as Enums.LogLevel, ...args);
    }

    info(): boolean;
    info(object: Interfaces.ExpandedLog, ...params: any[]): void;
    info(message: string, functionName: string, piiLevel?: Enums.PiiLevelEnum): void;
    info(...args: any[]): void | boolean {
        this.log('info' as Enums.LogLevel, ...args);
    }

    debug(): boolean;
    debug(object: Interfaces.ExpandedLog, ...params: any[]): void;
    debug(...args: any[]): void | boolean {
        this.log('debug' as Enums.LogLevel, ...args);
    }

    private static preProcessErrorObject(logObject: any, defaultErrorIsHumanRelated: boolean): Interfaces.ErrorLog {
        const errorObject = logObject instanceof Error ? logObject : logObject.error;
        const argsErrorIsHumanRelated = errorObject && errorObject.isHumanRelated;
        const data = errorObject && errorObject.data;
        const code = errorObject && errorObject.code;
        const message = errorObject && (errorObject.message || errorObject.name) || 'error';
        const isHumanRelated = argsErrorIsHumanRelated || defaultErrorIsHumanRelated;
        const errorData = {
            isHumanRelated,
            data,
            code,
            error: logObject instanceof Error ? Object.assign(logObject || {}, { message }) :
                Object.assign(logObject.error || {}, { message })
        };
        const error = this.mapToErrorLog(errorData);
        return error;
    }

    static mapToErrorLog(errData: Interfaces.ErrorData): Interfaces.ErrorLog {
        const { isHumanRelated, code, error } = errData;
        const logErrorObj: Interfaces.ErrorLog = { isHumanRelated };
        if (code) {
            logErrorObj.code = code;
        }
        if (error instanceof Error) {
            Object.assign(logErrorObj, this.prepareLogErrorObj(error));
        }
        if (errData.data) {
            logErrorObj.data = { ...logErrorObj.data, ...errData.data };
        }

        const messageFromError = error?.message;
        logErrorObj.message = [errData.message, messageFromError].filter((x) => x).join(': ') || 'error';
        return logErrorObj;
    }

    private static prepareLogErrorObj({ name, stack, message: _message, ...data }: Error): Interfaces.ErrorLog {
        const logErrorObj: Interfaces.ErrorLog = {};
        if (name) {
            logErrorObj.name = name;
        }
        if (stack) {
            logErrorObj.stack = stack;
        }
        if (Object.keys(data).includes('code')) {
            logErrorObj.code = data['code'];
            delete data['code'];
        }
        if (_message) {
            logErrorObj.message = _message;
        }
        if (Object.keys(data).includes('isHumanRelated')) {
            logErrorObj.isHumanRelated = data['isHumanRelated'];
            delete data['isHumanRelated'];
        }
        if (data && Object.keys(data).length > 0) {
            logErrorObj.data = Object.assign(logErrorObj.data || {}, { fromError: data });
        }
        return logErrorObj;
    }

    private static preProcessDataObject(data: any, clonedLogObject: any): any {
        // data objects mixing default and data object from log.
        if (data && Object.keys(data).length > 0) {
            return Object.assign({}, data, clonedLogObject && clonedLogObject.data);
        }
        return clonedLogObject && clonedLogObject.data;
    }

    // Log all arguments assuming the first one is level and after that are a set of fields that will be processed
    private log(logLevel: Enums.LogLevel, ...args: any[]): void {
        console.log('test');
        // 'fields' contains the defaults set by ChildLogger.
        const fields = this['fields'];
        const defaultErrorIsHumanRelated = fields && fields.error &&
            Object.keys(fields.error).includes('isHumanRelated') ?
            fields.error.isHumanRelated : undefined;

        const data = fields && fields.data;
        const properties = args && Array.isArray(args) ? args.slice() : args;

        if (Array.isArray(properties) && properties.length > 0) {
            let logObject: Interfaces.Log = {};
            logObject.data = {};
            let startIndex = 0;
            if (typeof properties[startIndex] === 'object') {
                logObject = Object.assign({}, !(properties[startIndex] instanceof Error) ? properties[startIndex] : {});
                if (properties[0] && (properties[0] instanceof Error || Object.keys(properties[0]).includes('error'))) {
                    logObject.error = SupertypeLogger.preProcessErrorObject(properties[startIndex], defaultErrorIsHumanRelated);
                }
                logObject.data = SupertypeLogger.preProcessDataObject(data, properties[startIndex]) || {};
                startIndex++;
            }

            //Handle the case where log function is (message, functionName, piiLevel(optional))
            if (typeof properties[startIndex] === 'string' && typeof properties[startIndex + 1] === 'string'
                && logLevel === 'info') {
                logObject.message = properties[startIndex];
                logObject.function = properties[startIndex+1];
                startIndex += 2;
                const logsPiiLevel = typeof properties[startIndex] === 'string' && properties[startIndex];
                if (logsPiiLevel) {
                    logObject.context = {};
                    logObject.context.piiLevel = logsPiiLevel;
                    startIndex++;
                }
            }

            logObject.data.__amorphicContext = { ...this.context };
            const argArrayWithLogObject: any[] = [logObject, ...properties.slice(startIndex)];
            this.sendToLog(logLevel, argArrayWithLogObject);
            return;
        }

        properties['__amorphicContext'] = { ...this.context };
        this.sendToLog(logLevel, properties);
        return;
    }

    childLogger(): HavenLogger {
        return new SupertypeLogger();
    };

    loggerObjects() {
        return {
            context: this.context,
            time: (new Date()).toISOString()
        }
    }

    startContext(context) {
        this.context = context;
    }

    // Save the properties in the context and return a new object that has the properties only so they can be cleared
    setContextProps(context) {
        const reverse = {};

        for (const prop in context) {
            reverse[prop] = true;
            this.context[prop] = context[prop];
        }

        return reverse;
    }

    // Remove any properties recorded by setContext
    clearContextProps(contextToClear) {
        for (const prop in contextToClear) {
            delete this.context[prop];
        }
    }

    formatDateTime(date): string {
        return f(2, (date.getMonth() + 1), '/') + f(2, date.getDate(), '/') + f(4, date.getFullYear(), ' ') +
            f(2, date.getHours(), ':') + f(2, date.getMinutes(), ':') + f(2, date.getSeconds(), ':') +
            f(3, date.getMilliseconds()) + ' GMT' + (0 - date.getTimezoneOffset() / 60);

        function f(z, d, s?) {
            while (String(d).length < z) {
                d = '0' + d;
            }

            return d + (s || '');
        }
    }

    /**
     * this function is designed to be replaced by the consumer of this class.
     *
     * @param logLevel - log level
     * @param logObject - formatted log object, passed in from consumer
     */
    protected sendToLog(logLevel, logObject) {
        console.log(this.prettyPrint(logLevel, logObject));     // eslint-disable-line no-console
    }

    prettyPrint(level, json) {
        let split = this.split(json, {time: 1, msg: 1, level: 1, name: 1});

        return this.formatDateTime(new Date()) + ': ' +
            level.toUpperCase() + ': ' +
            addColonIfToken(split[1].name, ': ') +
            addColonIfToken(split[1].msg, ': ') +
            xy(split[0]);

        function addColonIfToken (token, colonAndSpace) {
            if (token) {
                return token + colonAndSpace;
            }

            return '';
        }

        function xy(j) {
            var str = '';
            var sep = '';

            for (var prop in j) {
                str += sep + prop + '=' + JSON.stringify(j[prop]);
                sep = ' ';
            }

            if (str.length > 0) {
                return '(' + str + ')';
            }

            return '';
        }
    }

    private split(json, props): any[] {
        const a = {};
        const b = {};

        for (const prop in json) {
            (props[prop] ? b : a)[prop] = json[prop];
        }

        return [a, b];
    }
}