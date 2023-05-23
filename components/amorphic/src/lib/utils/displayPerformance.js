'use strict';

import { SupertypeSession } from '@haventech/supertype';

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 */
export function displayPerformance(req) {
    const moduleName = `amorphic/lib/utils/displayPerformance`;
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
