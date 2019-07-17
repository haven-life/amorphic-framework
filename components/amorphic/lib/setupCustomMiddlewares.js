'use strict';

const fs = require('fs');

function setupCustomMiddlewares(filePath, router) {
    const middlewareFilePath = `${filePath}/middlewares/index.js`;

    let middlewares;

    if(fs.existsSync(middlewareFilePath)) {
        middlewares = require(middlewareFilePath);

        const exportedMiddlewareFunctions = Object.keys(middlewares);

        if(exportedMiddlewareFunctions.length === 0) {
            console.warn('A custom middlewares file was defined, but no exported functions were found. Using default amorphic middlwares');
            return;
        }

        // iterate through all exported middleware functions and execute.
        for (const middlewareFunction of exportedMiddlewareFunctions) {
            if (typeof middlewares[middlewareFunction] === 'function') {
                console.debug('Evaluating middleware: ' + middlewareFunction);
                middlewares[middlewareFunction](router);
            }
        }

        return router;
    } else {
        console.info('No custom middlewares found to process.');
        return router;
    }
}

module.exports = {
    setupCustomMiddlewares: setupCustomMiddlewares
};