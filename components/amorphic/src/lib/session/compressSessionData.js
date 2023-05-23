'use strict';

// TODO: Make a SessionUtils
import AmorphicContext from '../AmorphicContext.js';
import zlib from 'zlib';
import { StatsdHelper as statsdUtils } from '@haventech/supertype';

/*
 * Compress session data
 */
export function compressSessionData(data) {
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
