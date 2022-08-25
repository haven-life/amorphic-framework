'use strict';

let SupertypeSession = require('@haventech/supertype').SupertypeSession;

const fs = require('fs');

const moduleName = `amorphic/lib/setupCustomMiddlewares`;

function setupCustomMiddlewares(filePath, router) {
    const functionName = setupCustomMiddlewares.name;
    const middlewareFilePath = `${filePath}/middlewares/index.js`;

    let middlewares;

    if(fs.existsSync(middlewareFilePath)) {
        middlewares = require(middlewareFilePath);

        const exportedMiddlewareFunctions = Object.keys(middlewares);

        if(exportedMiddlewareFunctions.length === 0) {
            SupertypeSession.logger.warn({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                message: 'A custom middlewares file was defined, but no exported functions were found. Using default amorphic middlwares'
            });
            return;
        }

        // iterate through all exported middleware functions and execute.
        for (const middlewareFunction of exportedMiddlewareFunctions) {
            if (typeof middlewares[middlewareFunction] === 'function') {
                SupertypeSession.logger.debug({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Evaluating middleware: ' + middlewareFunction
                });
                middlewares[middlewareFunction](router);
            }
        }

        return router;
    } else {
        SupertypeSession.logger.info({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            message: 'No custom middlewares found to process.'
        });
        return router;
    }
}

module.exports = {
    setupCustomMiddlewares: setupCustomMiddlewares
};