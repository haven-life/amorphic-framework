'use strict';

let SupertypeSession = require('@haventech/supertype').SupertypeSession;
const path = require('path');

const moduleName = `${path.basename(__dirname)}/${path.basename(__filename)}`;

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 */
function displayPerformance(req) {
    const functionName = displayPerformance.name;
    SupertypeSession.logger.setContextProps(req.amorphicTracking.loggingContext);

    let diff = process.hrtime(req.amorphicTracking.startTime);
    let totalTime = (diff[0] * 1e9 + diff[1]) / 1000000;
    let taskTime = 0;

    req.amorphicTracking.serverTasks.forEach(function d(task) {
        taskTime += task.time;
    });

    SupertypeSession.logger.info({
        module: moduleName,
        function: functionName,
        category: 'milestone',
        message: 'Request Performance',
        data: {
            duration: totalTime,
            browserPerformance: req.amorphicTracking.browser,
            serverTasks: req.amorphicTracking.serverTasks,
            unaccounted: totalTime - taskTime
        }
    });
}

module.exports = {
    displayPerformance: displayPerformance
};
