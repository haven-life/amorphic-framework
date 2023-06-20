'use strict';

import * as Logger from '../utils/logger.js';
let logMessage = Logger.logMessage;
import formidable from 'formidable';
import fs from 'fs';
import { StatsdHelper as statsdUtils } from '@haventech/supertype';

/**
 * Purpose unknown
 *
 * @param {unknown} req unknown
 * @param {unknown} resp unknown
 * @param {unknown} next unknown
 * @param {unknown} downloads unknown
 */
export function processFile(req, resp, next, downloads) {
    const moduleName = `amorphic/lib/routes/processFile`;
    const functionName = processFile.name;
    let processFileTime = process.hrtime();

    if (!downloads) {
        logMessage(2, {
            module: moduleName,
            function: functionName,
            category: 'milestone',
            message: 'no download directory'
        });
        next();

        return;
    }

    let form = new formidable.IncomingForm();
    form.uploadDir = downloads;

    let callbackExecuted = false;

    /**
     * in error state, due to the event emitter pattern being used in our form library,
     * this gets called twice => once on "error" and once more on "end".
     *
     * to make sure that we haven't already tried to execute this code before if we're in an error
     * state, keep a boolean switch saying whether this code has been hit yet or not.
     *
     * we don't need to worry about this issue in a success condition.
     */
    form.parse(req, function ee(err, _fields, files) {
        // we've already run this callback once - don't run a second time
        if (callbackExecuted) {
            return;
        }

        // there was an error attempting to parse the form. log it out, and send back an error response.
        if (err) {
            logMessage(0, {
                module: moduleName,
                function: functionName,
                category: 'milestone',
                error: err
            });
            resp.writeHead(500, {'Content-Type': 'text/plain'});
            resp.end('unable to parse form');
            statsdUtils.computeTimingAndSend(
                processFileTime,
                'amorphic.webserver.process_file.response_time',
                { result: 'there was an error wp' }
            );

            callbackExecuted = true;

            return;
        }

        try {
            let file = files.file.path;
            logMessage(2, {
                module: moduleName,
                function: functionName,
                category: 'milestone',
                data: {
                    file: file
                }
            });

            setTimeout(function yz() {
                fs.unlink(file, function zy(err) {
                    if (err) {
                        logMessage(0, {
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            error: err
                        });
                    }
                    else {
                        logMessage(2, {
                            module: moduleName,
                            function: functionName,
                            category: 'milestone',
                            message: file + ' deleted'
                        });
                    }
                });
            }, 60000);

            let fileName = files.file.name;
            req.session.file = file;
            resp.writeHead(200, {'content-type': 'text/html'});
            resp.end('<html><body><script>parent.amorphic.prepareFileUpload(\'package\');' +
                'parent.amorphic.uploadFunction.call(null, "' +  fileName + '"' + ')</script></body></html>');
            statsdUtils.computeTimingAndSend(
                processFileTime,
                'amorphic.webserver.process_file.response_time',
                { result: 'success' });
        } catch (err) {
            resp.writeHead(400, {'Content-Type': 'text/plain'});
            resp.end('Invalid request parameters');
            logMessage(0, {
                module: moduleName,
                function: functionName,
                category: 'milestone',
                error: err
            });
            statsdUtils.computeTimingAndSend(
                processFileTime,
                'amorphic.webserver.process_file.response_time',
                { result: 'Invalid request parameters, file or path params cannot be blank' }
            );
        }
    });
}
