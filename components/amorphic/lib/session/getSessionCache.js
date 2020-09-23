'use strict';

let AmorphicContext = require('../AmorphicContext');
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/**
 * Manage a set of data keyed by the session id used for message sequence and serialization tracking
 * This pulls it out of the current amorphic sessions dictionary
 *
 * @param {String} path - The app name.
 * @param {unknown} sessionId unknown
 * @param {unknown} keepTimeout unknown
 * @param {unknown} sessions unknown
 *
 * @returns {*|{sequence: number, serializationTimeStamp: null, timeout: null}}
 */
// function getSessionCacheOLD(path, sessionId, keepTimeout, sessions) {
//     let getSessionCacheTime = process.hrtime();
//
//     let key = path + '-' + sessionId;
//     let session = sessions[key] || {sequence: 1, serializationTimeStamp: null, timeout: null, semotus: {}};
//     sessions[key] = session;
//
//     if (!keepTimeout) {
//         if (session.timeout) {
//             clearTimeout(session.timeout);
//         }
//
//         session.timeout = setTimeout(function jj() {
//             if (sessions[key]) {
//                 delete sessions[key];
//             }
//         }, amorphicContext.amorphicOptions.sessionExpiration);
//
//         statsdUtils.computeTimingAndSend(
//             getSessionCacheTime,
//             'amorphic.session.get_session_cache.response_time');
//     }
//
//     return session;
// }

/**
 * In a new stateless amorphic, there is no sessionCache, so we will just return a new object from the cache for this request
 *
 * @param {String} path - The app name.
 * @param {unknown} sessionId unknown
 * @param {unknown} keepTimeout unknown
 * @param {unknown} sessions unknown
 *
 * @returns {*|{sequence: number, serializationTimeStamp: null, timeout: null}}
 */
function getSessionCache(path, sessionId, keepTimeout) {
    let getSessionCacheTime = process.hrtime();

    let amorphicSession = {sequence: 1, serializationTimeStamp: null, timeout: null, semotus: {}};

    if (!keepTimeout) {
        if (amorphicSession.timeout) {
            clearTimeout(amorphicSession.timeout);
        }

        amorphicSession.timeout = setTimeout(function jj() {
        }, AmorphicContext.amorphicOptions.sessionExpiration);

        statsdUtils.computeTimingAndSend(
            getSessionCacheTime,
            'amorphic.session.get_session_cache.response_time');
    }

    return amorphicSession;
}

module.exports = {
    getSessionCache: getSessionCache
};
