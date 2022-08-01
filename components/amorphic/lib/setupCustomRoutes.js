'use strict';

let SupertypeSession = require('@haventech/supertype').SupertypeSession;

const fs = require('fs');

function setupCustomRoutes(filePath, router) {
    const moduleName = 'amorphic';
    const functionName = setupCustomRoutes.name;
    const routerFilePath = `${filePath}/routers/index.js`;

    let routers;

    if(fs.existsSync(routerFilePath)) {
        routers = require(routerFilePath);

        const exportedRouterFunctions = Object.keys(routers);

        if(exportedRouterFunctions.length === 0) {
            SupertypeSession.logger.warn({
                module: moduleName,
                function: functionName,
                category: 'milestone',
                message: 'A custom router file was defined, but no exported functions were found. Using default amorphic routes'
            });
            return;
        }

        // iterate through all exported router functions and execute.
        for (const routerFunction of exportedRouterFunctions) {

            if (typeof routers[routerFunction] === 'function') {
                SupertypeSession.logger.debug({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Evaluating router: ' + routerFunction
                });
                routers[routerFunction](router);
            }
        }

        return router;
    } else {
        SupertypeSession.logger.info({
            module: moduleName,
            function: functionName,
            category: 'milestone',
            message: 'No custom routes found to process.'
        });
        return router;
    }
}

module.exports = {
    setupCustomRoutes: setupCustomRoutes
};