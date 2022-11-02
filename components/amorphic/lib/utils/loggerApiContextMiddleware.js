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
        SupertypeSession.logger.clientLogger.setApiContextMiddleware({generateContextIfMissing});
    }
    
    next();
}

module.exports = {
    loggerApiContextMiddleware: loggerApiContextMiddleware
};
