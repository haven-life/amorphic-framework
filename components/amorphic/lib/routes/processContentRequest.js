'use strict';

let url = require('url');
let establishServerSession = require('../session/establishServerSession').establishServerSession;
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 */
function processContentRequest(req, res, sessions, controllers, nonObjTemplatelogLevel) {
    let processContentRequestTime = process.hrtime();

    let path = url.parse(req.originalUrl, true).query.path;

    establishServerSession(req, path, false, false, null, sessions, controllers,
        nonObjTemplatelogLevel).then(function zz(semotus) {
            if (typeof(semotus.objectTemplate.controller.onContentRequest) === 'function') {
                semotus.objectTemplate.controller.onContentRequest(req, res);

                statsdUtils.computeTimingAndSend(
                    processContentRequestTime,
                    'amorphic.webserver.process_content_request.response_time',
                    { result: 'success' });
            }
        });
}

module.exports = {
    processContentRequest: processContentRequest
};
