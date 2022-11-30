'use strict';

let SupertypeSession = require('@haventech/supertype').SupertypeSession;
const moduleName = `amorphic/lib/utils/LoggerApiContextProcessor`;
import { AmorphicUtils } from './AmorphicUtils';

export class LoggerApiContextProcessor {

    public static applyloggerApiContextMiddleware(generateContextIfMissing: boolean, req, res, next) {
        const clientLogger = SupertypeSession.logger.clientLogger;
        if (clientLogger && typeof clientLogger.setApiContextMiddleware === 'function' &&
            res && res.locals && res.locals.__loggerRequestContext) {
            const context = res.locals.__loggerRequestContext;
            if (context) {
                clientLogger.setContextFromSourceMiddleware({generateContextIfMissing, context}, next);
                SupertypeSession.logger.debug({
                    module: moduleName,
                    function: 'applyloggerApiContextMiddleware',
                    category: 'milestone',
                    message: `retreive and propagete logger's context object`,
                    data: {
                        loggerContext: context,
                        req: req.body && req.body.loggingContext && req.body.loggingContext.requestID
                    }
                });
                delete res.locals.__loggerRequestContext;
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
        if (clientLogger && typeof clientLogger.setApiContextMiddleware === 'function' &&
            res && res.locals && Object.keys(res.locals).length >= 0) {
            const context = clientLogger.getContextFromLocalStorage() ? 
                clientLogger.getContextFromLocalStorage() : undefined;
            res.locals = {
                __loggerRequestContext: context
            };
            
            SupertypeSession.logger.debug({
                module: moduleName,
                function: 'saveCurrentLoggerContext',
                category: 'milestone',
                message: `save current Logger's context object`,
                data: {
                    context: res.locals.__loggerRequestContext,
                    req: req.body && req.body.loggingContext && req.body.loggingContext.requestID
                }
            });
        }
        next();
    }

    public static saveCurrentRequestContext(req, res, next) {
        let context = req && req.body && req.body.loggingContext;
        const sessionId = req.session && req.session.id;
        const hasContext = context && Object.keys(context).length >= 0;
        const ipaddress = AmorphicUtils.getIpAddressFromRequest(req);
        if (hasContext) {
            context.session = sessionId;
            context.ipaddress = ipaddress;
        }
        else {
            context = { session: sessionId, ipaddress }
        }

        if (context && Object.keys(context).length > 0) {
            SupertypeSession.logger.setContextProps(context);
        }
        SupertypeSession.logger.debug({
            module: moduleName,
            function: 'saveCurrentRequestContext',
            category: 'milestone',
            message: `save request's logging context`,
            data: {
                context
            }
        });
        next();
    }

    public static clearCurrentSavedContext(req, res, next) {
        const context = SupertypeSession.logger && SupertypeSession.logger.context;
        if (context) {
            SupertypeSession.logger.clearContextProps(context);
        }
        SupertypeSession.logger.debug({
            module: moduleName,
            function: 'clearCurrentSavedContext',
            category: 'milestone',
            message: `clear any existing context`,
            data: {
                context
            }
        });
        next();
    }
}