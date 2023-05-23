'use strict';

import { processLoggingMessage } from '../routes/processLoggingMessage.js';
import { processMessage } from '../routes/processMessage.js';

/**
 * Purpose unknown
 *
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} next unknown
 */

export function router(sessions, nonObjTemplatelogLevel, controllers, req, res, next) {

    if (req.originalUrl.match(/amorphic\/xhr\?path\=/)) {
        if (req.body.type === 'logging') {
            processLoggingMessage(req, res);
        }
        else {
            processMessage(req, res, sessions, nonObjTemplatelogLevel, controllers);
        }
    }
    else {
        next();
    }
}
