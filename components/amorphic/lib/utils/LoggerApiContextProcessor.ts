'use strict';

let SupertypeSession = require('@haventech/supertype').SupertypeSession;
const moduleName = `amorphic/lib/utils/LoggerApiContextProcessor`;

export class LoggerApiContextProcessor {

    public static applyloggerApiContextMiddleware(generateContextIfMissing, req, res, next) {
        const clientLogger = SupertypeSession.logger.clientLogger;
        if (clientLogger && typeof clientLogger.setApiContextMiddleware === 'function' && res.locals && res.locals.__loggerRequestContext) {
            const context = res.locals.__loggerRequestContext;
            if (context) {
                SupertypeSession.logger.clientLogger.setContextFromSourceMiddleware({generateContextIfMissing, context}, next);
                SupertypeSession.logger.clientLogger.debug({
                    module: moduleName,
                    function: 'applyloggerApiContextMiddleware',
                    category: 'milestone',
                    data: {
                        loggerContext: context,
                        req: req.body && req.body.loggingContext && req.body.loggingContext.requestID
                    }
                });
            }
            else {
                next();
            }
        }
        else {
            next();
        }
    }

    public static saveCurrentLoggerContext(req, res, next) {
        const clientLogger = SupertypeSession.logger.clientLogger;
        if (clientLogger && typeof clientLogger.setApiContextMiddleware === 'function') {
            const context = clientLogger.getContextFromLocalStorage() ? 
                clientLogger.getContextFromLocalStorage() : undefined;
            res.locals = {
                __loggerRequestContext: context
            };
            
            SupertypeSession.logger.clientLogger.debug({
                module: moduleName,
                function: 'saveCurrentLoggerContext',
                category: 'milestone',
                data: {
                    context: res.locals.__loggerRequestContext,
                    req: req.body && req.body.loggingContext && req.body.loggingContext.requestID
                }
            });
        }
        next();
    }

    public static saveCurrentRequestContext(req, res, next) {
        const context = req && req.body && req.body.loggingContext;
        if (context) {
            SupertypeSession.logger.setContextProps(context);
        }
        SupertypeSession.logger.clientLogger.debug({
            module: moduleName,
            function: 'saveCurrentRequestContext',
            category: 'milestone',
            data: {
                context
            }
        });
        next();
    }
}