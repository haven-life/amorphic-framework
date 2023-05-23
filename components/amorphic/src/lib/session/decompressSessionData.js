'use strict';

import AmorphicContext from '../AmorphicContext.js';
import zlib from 'zlib';
import { StatsdHelper as statsdUtils } from '@haventech/supertype';

/**
 * Purpose unknown
 *
 * @param {unknown} objData unknown
 *
 * @returns {unknown} unknown
 */
export function decompressSessionData(objData) {
    let decompressSessionDataStartTime = process.hrtime();

    let amorphicOptions = AmorphicContext.amorphicOptions;
    if (amorphicOptions.compressSession && objData.data) {
        try {
            let buffer = new Buffer(objData.data);

            let decompressedData = zlib.inflateSync(buffer);

            statsdUtils.computeTimingAndSend(
                decompressSessionDataStartTime,
                'amorphic.session.decompress_session_data.response_time',
                { result: 'success' });

            return decompressedData;

        } catch (e) {
            statsdUtils.computeTimingAndSend(
                decompressSessionDataStartTime,
                'amorphic.session.decompress_session_data.response_time',
                { result: 'failure' });

            throw e;
        }
    }

    return objData;
}
