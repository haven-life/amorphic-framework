'use strict';

let getObjectTemplate = require('../utils/getObjectTemplate');
let decompressSessionData = require('./decompressSessionData').decompressSessionData;
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

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
function restoreSession(path, session, controller) {
    let restoreSessionTime = process.hrtime();

    let ourObjectTemplate = getObjectTemplate(controller);

    ourObjectTemplate.withoutChangeTracking(function callBack() {
        // Will return in exising controller object because createEmptyObject does so
        let unserialized = session.semotus.controllers[path];

        controller = ourObjectTemplate.fromJSON(
            decompressSessionData(unserialized.controller),
            controller.__template__
        );

        if (session.semotus.objectMap && session.semotus.objectMap[path]) {
            ourObjectTemplate.objectMap = session.semotus.objectMap[path];
        }

        ourObjectTemplate.logger.info({component: 'amorphic', module: 'restoreSession', activity: 'restoring'});
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
