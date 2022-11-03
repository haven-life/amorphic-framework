'use strict';

let SupertypeSession = require('@haventech/supertype').SupertypeSession;

/**
 * Purpose unknown
 *
 * @param {unknown} downloads unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */
function loggerApiContextMiddleware(generateContextIfMissing, req, res, next) {
    
    if (SupertypeSession.logger.clientLogger && typeof SupertypeSession.logger.clientLogger.setApiContextMiddleware === 'function') {
        if (res.locals && res.locals.__loggerRequestContext) {
            const context = res.locals.__loggerRequestContext;
            SupertypeSession.logger.clientLogger.setContextFromSourceMiddleware({generateContextIfMissing, context}, next);
            res.locals = {
                __loggerRequestContext: undefined
            };
        }
    }
    else {
        next();
    }
}

function saveCurrentLoggerContext(req, res, next) {
    if (SupertypeSession.logger.clientLogger && typeof SupertypeSession.logger.clientLogger.setApiContextMiddleware === 'function') {
        const context = SupertypeSession.logger.clientLogger.getContextFromLocalStorage();
        res.locals = {
            __loggerRequestContext: context
        };
    }
    next();
}

module.exports = {
    loggerApiContextMiddleware: loggerApiContextMiddleware,
    saveCurrentLoggerContext: saveCurrentLoggerContext
};
