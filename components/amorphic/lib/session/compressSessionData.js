'use strict';

// TODO: Make a SessionUtils
let AmorphicContext = require('../AmorphicContext');
let zlib = require('zlib');
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/*
 * Compress session data
 */
function compressSessionData(data) {
    let compressSessionDataStartTime = process.hrtime();

    let amorphicOptions = AmorphicContext.amorphicOptions;

    if (amorphicOptions.compressSession) {
        try {
            let sessionData = zlib.deflateSync(data);

            statsdUtils.computeTimingAndSend(
                compressSessionDataStartTime,
                'amorphic.session.compress_session_data.response_time',
                { result: 'success' });

            return sessionData;
        } catch (e) {
            statsdUtils.computeTimingAndSend(
                compressSessionDataStartTime,
                'amorphic.session.compress_session_data.response_time',
                { result: 'failure' });

            throw e;
        }
    }

    return data;
}

module.exports = {
    compressSessionData: compressSessionData
};
