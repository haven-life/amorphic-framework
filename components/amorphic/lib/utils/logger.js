'use strict';
let os = require('os');
let SupertypeSession = require('@haventech/supertype').SupertypeSession;
const path = require('path');

const moduleName = `${path.basename(__dirname)}/${path.basename(__filename)}`;

//TODO: Switch these over to be logs.

// TODO: Switch everything over to be bunyan.
// Logging for rare situations where we don't have an objectTemplate
/**
 * Purpose unknown
 * NOTE: ONLY USED IN AMORPHIC!
 * @param {unknown} level unknown
 * @param {unknown} sessionId unknown
 * @param {unknown} data unknown
 * @param {unknown} logLevel unknown
 */
function log(level, sessionId, logObjectParam, logLevel) {
    if (level > logLevel) {
        return;
    }

    let t = new Date();

    // TODO: Why aren't we using moment for this?
    let time = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate() + ' ' +
    t.toTimeString().replace(/ .*/, '') + ':' + t.getMilliseconds();

    let logObject = {};
    if (typeof data === 'string') {
        logObject.data = {};
        logObject.context = {};
        logObject.message = (time + '(' + sessionId + ') ' + 'Semotus:' + logObjectParam);
        logObject.data.amorphicGeneratedTime = time;
        logObject.context.sessionId = sessionId;
    }
    else {
        logObject = logObjectParam;
        logObject.data ? logObject.data.amorphicGeneratedTime = time : logObject.data = { amorphicGeneratedTime: time };
        logObject.context ? logObject.context.sessionId = sessionId : logObject.context = { sessionId: sessionId };
    }

    logMessage(level, logObject);
}


/**
 * Writing a function to consolidate our logMessage statements so they can be easily replaced later
 * NOTE: Default function for sendToLog that is passed to us as the log function to use.
 * @param {String} message A message to be printed to the console.
 */
function logMessage(...args) {
    const functionName = logMessage.name;
    if (typeof args[0] === 'number') {
        let level = args[0];
        switch (level) {
            case 0:
                SupertypeSession.logger.error(...args.slice(1));
                return;
            case 1:
                SupertypeSession.logger.warn(...args.slice(1));
                return;
            case 2:
                SupertypeSession.logger.info(...args.slice(1));
                return;
            case 3:
                SupertypeSession.logger.debug(...args.slice(1));
                return;
            default:
                SupertypeSession.logger.error({
                    module: moduleName,
                    function: functionName,
                    category: 'request',
                    message: 'invalid level used',
                    data: {
                        level: level,
                        log: args.slice(1)
                    }
                });
                return;
        }
    } else {
        SupertypeSession.logger.warn({
            module: moduleName,
            function: functionName,
            category: 'request',
            message: 'no level specified, using info'
        });
        SupertypeSession.logger.info(...args);
    }
}

/**
 * Purpose unknown
 *
 * @param {unknown} app unknown
 * @param {unknown} context unknown
 *
 * @returns {unknown} unknown
 */
function getLoggingContext(app, context) {
    context = context || {};
    context.environment = process.env.NODE_ENV || 'local';
    context.name = app;
    context.hostname = os.hostname();
    context.pid = process.pid;

    return context;
}

/**
 * Uses the SupertypeLogger to start the context and level for logger. 
 * To specify an internal logger, use setLogger on SupertypeLogger
 *
 * @param {unknown} logger unknown
 * @param {unknown} path unknown
 * @param {unknown} context unknown
 * @param {unknown} applicationConfig unknown
 */
function setupLogger(logger, path, context, applicationConfig) {
    logger.startContext(context);
    logger.setLevel(applicationConfig[path].logLevel);
}

module.exports = {
    log: log,
    logMessage: logMessage,
    getLoggingContext: getLoggingContext,
    setupLogger: setupLogger
};
