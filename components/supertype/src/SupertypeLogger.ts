const levelToStr = { 60: 'fatal', 50: 'error', 40: 'warn', 30: 'info', 20: 'debug', 10: 'trace' };
const strToLevel = { 'fatal': 60, 'error': 50, 'warn': 40, 'info': 30, 'debug': 20, 'trace': 10 };

export class SupertypeLogger {
    static moduleName: string = SupertypeLogger.name;
    private _amorphicContext = '__amorphicContext';
    context: any;
    granularLevels: any;
    level: any;
    private _clientLogger: any;

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

    get clientLogger() {
        return this._clientLogger;
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
        if (typeof logger.childLogger === 'function') {
            this._clientLogger = logger.childLogger({error: {isHumanRelated: false}});
            return;
        }
        if (typeof logger.child === 'function') {
            this._clientLogger = logger.child();
            return;
        }
        this._clientLogger = logger;
    }

    // Log all arguments assuming the first one is level and the second one might be an object (similar to banyan)
    private log(level: number, ...args: any[]): void {
        const properties: any[] = args && Array.isArray(args) ? args.slice() : args;

        if (typeof properties[0] === 'object')  {
            let logObj = properties[0];
            if (!logObj.data) {
                logObj.data = {};
            }
            if (!logObj.context) {
                logObj.context = {};
            }

            this.setLogsAmorphicContext(logObj.data);
            this.setLogsSessionId(logObj);

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

    private setLogsSessionId(logObj: any) {
        if (logObj.data?.__amorphicContext?.session) {
            logObj.context.sessionId = logObj.data.__amorphicContext.session;
            delete logObj.data.__amorphicContext.session;
        }
    }

    private setLogsAmorphicContext(object) {
        if (this.context && Object.keys(this.context).length > 0) {
            object[this._amorphicContext] = { ...this.context };
        }
    }

    getAmorphicContext(): any {
        return { __amorphicContext: { ...this.context } };
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
        if (this._clientLogger) {
            let childLogger;
            if (this._clientLogger.childLogger === 'function') {
                childLogger = this._clientLogger.childLogger(rootValues, dataValues);
                child = childLogger;
            }
            else if (this._clientLogger.child === 'function') {
                childLogger = this._clientLogger.child({...rootValues, data: {dataValues}});
                child = childLogger;
            }
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

    private deleteEmptyLogProperties(logObject: any) {
        const keys = ['context', 'data'];
        keys.forEach((key) => {
            if (logObject[key] && Object.keys(logObject[key]).length < 1) {
                delete logObject[key];
            }
        })
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
        this.deleteEmptyLogProperties(logObject);
        if (this._clientLogger) {
            let levelForLog = typeof logLevel === 'string' ? strToLevel[logLevel] : logLevel;
            switch (levelForLog) {
                case 10:
                case 20:
                    this._clientLogger.debug(logObject, ...rawLogData);
                    return;
                case 30:
                    this._clientLogger.info(logObject, ...rawLogData);
                    return;
                case 40:
                    this._clientLogger.warn(logObject, ...rawLogData);
                    return;
                case 60:
                case 50:
                    this._clientLogger.error(logObject, ...rawLogData);
                    return;
                default: 
                    this._clientLogger.error({
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