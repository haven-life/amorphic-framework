import { isModuleNamespaceObject } from "util/types";

const levelToStr = { 60: 'fatal', 50: 'error', 40: 'warn', 30: 'info', 20: 'debug', 10: 'trace' };
const strToLevel = { 'fatal': 60, 'error': 50, 'warn': 40, 'info': 30, 'debug': 20, 'trace': 10 };

export class SupertypeLogger {
    static moduleName: string = SupertypeLogger.name;
    private amorphicContext = '__amorphicContext';
    context: any;
    granularLevels: any;
    level: any;
    logger: any;

    // for overriding
    // sendToLog: Function;
    // formatDateTime: Function;

    constructor() {
        this.context = {};
        this.granularLevels = {};
        this.level = 'info';
    }


    fatal(...data: any[]): void {
        this.log(60, ...data);
    }

    error(...data: any[]): void {
        this.log(50, ...data);
    }

    warn(...data: any[]): void {
        this.log(40, ...data);
    }

    info(...data: any[]): void {
        this.log(30, ...data);
    }

    debug(...data: any[]): void {
        this.log(20, ...data);
    }

    trace(...data: any[]): void {
        this.log(10, ...data);
    }

    /**
     * assign a custom send to log functionality.
     * @param logger - logger must fit the format of info/error/debug/warn
     */
    setLogger(logger) {
        if (typeof logger.info !== 'function' ||
            typeof logger.error !== 'function' ||
            typeof logger.debug !== 'function' ||
            typeof logger.warn !== 'function') {
            throw new Error('Please specify a logger with the info, error, debug, and warn functions');
        }
        this.logger = logger.childLogger ? logger.childLogger({error: {isHumanRelated: false}}) : logger.child({error: {isHumanRelated: false}});
    }

    // Log all arguments assuming the first one is level and the second one might be an object (similar to banyan)
    private log(level: number, ...args: any[]): void {
        const properties: any[] = args && Array.isArray(args) ? args.slice() : args;

        if (typeof properties[0] === 'object')  {
            let logObj = properties[0];
            if (!logObj.data) {
                logObj.data = {};
            }
            this.setContextLog(logObj.data);
            logObj['level'] = level;
            if (this.isEnabled(levelToStr[logObj['level']], logObj)) {
                this.sendToLog(levelToStr[logObj['level']], logObj, ...properties.slice(1));
            }
            return;
        }

        properties['level'] = level;
        if (this.isEnabled(levelToStr[properties['level']], properties)) {
            this.sendToLog(levelToStr[properties['level']], properties);
        }
        return;
    }

    setContextLog(object) {
        object[this.amorphicContext] = { ...this.context };
    }

    getContextLog(object) {
        if (!object[this.amorphicContext]) {
            this.setContextLog(object);
        }
        return object[this.amorphicContext];
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
    // Parse log levels such as warn.activity
    setLevel(level) {
        var levels = level.split(';');

        for (var ix = 0; ix < levels.length; ++ix) {
            var levela = levels[ix];

            if (levela.match(/:/)) {
                if (levels[ix].match(/(.*):(.*)/)) {
                    this.granularLevels[RegExp.$1] = this.granularLevels[RegExp.$1] || {};
                    this.granularLevels[RegExp.$1] = RegExp.$2;
                }
                else {
                    this.level = levels[ix];
                }
            }
            else {
                this.level = levela;
            }
        }
    }

    // Remove any properties recorded by setContext
    clearContextProps(contextToClear) {
        for (const prop in contextToClear) {
            delete this.context[prop];
        }
    }

    // Create a new logger and copy over it's context
    createChildLogger(context, rootValues?, dataValues?): SupertypeLogger {
        let child: { [key: string]: any } = {};

        for (let prop in this) {
            child[prop] = this[prop];
        }

        child.context = context || {};

        for (let proper in this.context) {
            child.context[proper] = this.context[proper];
        }

        if (this.logger) {
            let childLogger = this.logger.childLogger(rootValues, dataValues);
            child.logger = childLogger;
        }

        return child as SupertypeLogger; // bad practice but should fix
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
     * @param rawLogData - unformatted and unprocessed version of "logObject" param
     */
    protected sendToLog(logLevel, logObject, ...rawLogData) {
        const functionName = this.sendToLog.name;
        if (this.logger) {
            let levelForLog = typeof logLevel === 'string' ? strToLevel[logLevel] : logLevel;
            switch (levelForLog) {
                case 10:
                    this.logger.warn({
                        module: SupertypeLogger.moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'trace is no longer used, logged with debug instead',
                        data: {
                            logObject: logObject
                        }
                    });
                case 20:
                    this.logger.debug(logObject, ...rawLogData);
                    return;
                case 30:
                    this.logger.info(logObject, ...rawLogData);
                    return;
                case 40:
                    this.logger.warn(logObject, ...rawLogData);
                    return;
                case 60:
                    this.logger.warn({
                        module: SupertypeLogger.moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'fatal is no longer used, logged with error instead',
                        data: {
                            logObject: logObject
                        }
                    });
                case 50:
                    this.logger.error(logObject, ...rawLogData);
                    return;
                default: 
                    this.logger.error({
                        module: SupertypeLogger.moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'invalid level used',
                        data: {
                            logLevel: logLevel,
                            logObject: logObject
                        }
                    });
                    return;
            }
        }
        console.log(this.prettyPrint(logLevel, logObject));     // eslint-disable-line no-console
    }

    prettyPrint(level, json) {
        let split = this.split(json, {time: 1, msg: 1, level: 1, name: 1});

        return this.formatDateTime(json.time ? new Date(json.time) : new Date()) + ': ' +
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

    // Logging is enabled if either the level threshold is met or the granular level matches
    private isEnabled(level, obj) {
        level = strToLevel[level];

        if (level >= strToLevel[this.level]) {
            return true;
        }

        if (this.granularLevels) {
            for (let levelr in this.granularLevels) {
                if (obj[levelr] && obj[levelr] == this.granularLevels[levelr]) {
                    return true;
                }
            }
        }
    }
}