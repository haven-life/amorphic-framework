const levelToStr = { 60: 'fatal', 50: 'error', 40: 'warn', 30: 'info', 20: 'debug', 10: 'trace' };
const strToLevel = { 'fatal': 60, 'error': 50, 'warn': 40, 'info': 30, 'debug': 20, 'trace': 10 };

function isObject(obj) {
    return obj != null
        && typeof (obj) === 'object'
        && !(obj instanceof Array)
        && !(obj instanceof Date)
        && !(obj instanceof Error);
}

type LoggerFunction = (logLevel: string, logObject: any, ...rawLogData) => void;

type LogObject = {
    level: string | number;
    time: string;
    msg: string;
    module?: any;
    activity?: any;
    __amorphicContext: any;
};

export class SupertypeLogger {
    context: any;
    granularLevels: any;
    level: any;

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
     * @param {(level: string, data: any) => void} loggerFunction
     */
    setLogger(loggerFunction: LoggerFunction) {
        this.sendToLog = loggerFunction;
    }

    // Log all arguments assuming the first one is level and the second one might be an object (similar to banyan)
    private log(level: number, ...data: any[]): void {
        let msg = '';
        const obj: LogObject = {
            time: (new Date()).toISOString(),
            msg: '',
            level: 'info', //default info
            __amorphicContext: {}
        };

        const amorphicContext = {};
        // Copy amorphic context into the data
        for (const prop in this.context) {
            obj[prop] = this.context[prop];
            amorphicContext[prop] = this.context[prop];
        }

        obj.level = level;
        obj.__amorphicContext = amorphicContext;

        data.forEach((arg, index) => {
            if (index === 0 && isObject(arg)) {
                for (const proper in arg) {
                    obj[proper] = arg[proper];
                }
            }
            else {
                msg += `${arg} `;
            }
        });

        if (obj.msg.length) {
            obj.msg += ' ';
        }

        if (msg.length) {
            if (obj.module && obj.activity) {
                obj.msg += `${obj.module}[${obj.activity}] - `;
            }

            obj.msg += msg;
        }
        else if (obj.module && obj.activity) {
            obj.msg += `${obj.module}[${obj.activity}]`;
        }

        if (this.isEnabled(levelToStr[obj.level], obj)) {
            this.sendToLog(levelToStr[obj.level], obj, ...data);
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
    createChildLogger(context): SupertypeLogger {
        let child: { [key: string]: any } = {};

        for (let prop in this) {
            child[prop] = this[prop];
        }

        child.context = context || {};

        for (let proper in this.context) {
            child.context[proper] = this.context[proper];
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
        console.log(this.prettyPrint(logLevel, logObject));     // eslint-disable-line no-console
    }

    prettyPrint(level, json) {
        let split = this.split(json, {time: 1, msg: 1, level: 1, name: 1});

        return this.formatDateTime(new Date(json.time)) + ': ' +
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