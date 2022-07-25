'use strict';

let getSessionCache = require('./getSessionCache').getSessionCache;
let getObjectTemplate = require('../utils/getObjectTemplate');
let decompressSessionData = require('./decompressSessionData').decompressSessionData;
let statsdUtils = require('@haventech/supertype').StatsdHelper;

/**
 * Purpose unknown
 *
 * @param {String} path - The app name.
 * @param {unknown} session unknown
 * @param {unknown} controller unknown
 * @param {unknown} sessions unknown
 *
 * @returns {unknown} unknown
 */
function restoreSession(path, session, controller, sessions) {
    const moduleName = 'amorphic';
    const functionName = restoreSession.name;
    let restoreSessionTime = process.hrtime();

    let ourObjectTemplate = getObjectTemplate(controller);

    ourObjectTemplate.withoutChangeTracking(function callBack() {
        let sessionData = getSessionCache(path, ourObjectTemplate.controller.__sessionId, true, sessions);
        // Will return in exising controller object because createEmptyObject does so
        let unserialized = session.semotus.controllers[path];

        controller = ourObjectTemplate.fromJSON(
            decompressSessionData(unserialized.controller),
            controller.__template__
        );

        if (unserialized.serializationTimeStamp !== sessionData.serializationTimeStamp) {
            ourObjectTemplate.logger.warn({
                module: moduleName,
                function: functionName, 
                category: 'milestone',
                message: 'Session data not as saved',
                data: {
                    activity: 'restore',
                    savedAs: sessionData.serializationTimeStamp,
                    foundToBe: unserialized.serializationTimeStamp
                }
            });
        }

        if (session.semotus.objectMap && session.semotus.objectMap[path]) {
            ourObjectTemplate.objectMap = session.semotus.objectMap[path];
        }

        ourObjectTemplate.logger.info({
            module: moduleName,
            function: functionName, 
            category: 'milestone',
            data: {
                activity: 'restoring'
            }
        });
        ourObjectTemplate.syncSession();  // Clean tracking of changes
    });

    statsdUtils.computeTimingAndSend(
        restoreSessionTime,
        'amorphic.session.restore_session_cache.response_time');

    return controller;
}

module.exports = {
    restoreSession: restoreSession
};
