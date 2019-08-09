'use strict';

let url = require('url');
let Logger = require('../utils/logger');
let log = Logger.log;
let getSessionCache = require('../session/getSessionCache').getSessionCache;
let establishServerSession = require('../session/establishServerSession').establishServerSession;
let displayPerformance = require('../utils/displayPerformance').displayPerformance;
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/**
 * Process JSON request message
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 * @param {unknown} sessions unknown
 * @param {unknown} controllers unknown
 */
function processMessage(req, res, sessions, nonObjTemplatelogLevel, controllers) {

    let processMessageStartTime = process.hrtime();

    let session = req.session;

    let message = req.body;
    let path = url.parse(req.originalUrl, true).query.path;
    let sessionData = getSessionCache(path, req.session.id, false, sessions);

    if (!message.sequence) {
        log(1, req.session.id, 'ignoring non-sequenced message', nonObjTemplatelogLevel);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('ignoring non-sequenced message');

        statsdUtils.computeTimingAndSend(
            processMessageStartTime,
            'amorphic.webserver.process_message.response_time',
            { result: 'failure' });

        return;
    }

    let expectedSequence = sessionData.sequence || message.sequence;
    let newPage = message.type === 'refresh' || message.sequence !== expectedSequence;
    let forceReset = message.type === 'reset';

    establishServerSession(req, path, newPage, forceReset, message.rootId, sessions, controllers,
    nonObjTemplatelogLevel)
        .then(function kk(semotus) {
            if (message.performanceLogging) {
                req.amorphicTracking.browser = message.performanceLogging;
            }

            let callContext = message.type;

            if (message.type === 'call') {
                callContext += '.' + message.id + '[' + message.name + ']';
            }

            let context = semotus.objectTemplate.logger.setContextProps({
                app: path,
                message: callContext,
                sequence: message.sequence,
                expectedSequence: sessionData.sequence,
                session: req.session.id,
                ipaddress: (String(req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') ||
            'unknown'
            });

            ++sessionData.sequence;

            let ourObjectTemplate = semotus.objectTemplate;
            let remoteSessionId = req.session.id;
        
            let startMessageProcessing;

        // If we expired just return a message telling the client to reset itself
            if (semotus.newSession || newPage || forceReset) {
                if (semotus.newSession) {
                    ourObjectTemplate.logger.info({
                        component: 'amorphic',
                        module: 'processMessage',
                        activity: 'reset'
                    }, remoteSessionId,
                    'Force reset on ' + message.type + ' ' + 'new session' + ' [' + message.sequence + ']');
                }
                else {
                    ourObjectTemplate.logger.info({component: 'amorphic', module: 'processMessage', activity: 'reset'},
                    remoteSessionId, 'Force reset on ' + message.type + ' ' +  ' [' + message.sequence + ']');
                }

                semotus.save(path, session, req);
                startMessageProcessing = process.hrtime();

                let outbound = semotus.getMessage();

                outbound.ver = semotus.appVersion;
                ourObjectTemplate.logger.clearContextProps(context);
                res.end(JSON.stringify(outbound));  // return a sync message assuming no queued messages

                for (let prop in ourObjectTemplate.logger.context) {
                    req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
                }

                req.amorphicTracking.addServerTask({name: 'Reset Processing'}, startMessageProcessing);
                sessionData.sequence = message.sequence + 1;
                displayPerformance(req);

                statsdUtils.computeTimingAndSend(
                    processMessageStartTime,
                    'amorphic.webserver.process_message.response_time',
                    { result: 'success' });

                return;
            }

        // When Semotus sends a message it will either be a response or
        // a callback to the client.  In either case return a response and prevent
        // any further messages from being generated as these will get handled on
        // the next call into the server
            startMessageProcessing = process.hrtime();

            let sendMessage = function surndMessage(message) {
                ourObjectTemplate.setSession(remoteSessionId);
                ourObjectTemplate.enableSendMessage(false);
                req.amorphicTracking.addServerTask({name: 'Request Processing'}, startMessageProcessing);
                semotus.save(path, session, req);
                message.ver = semotus.appVersion;
                message.sessionExpired = ourObjectTemplate.sessionExpired;

                let respstr = JSON.stringify(message);

                for (let prop in ourObjectTemplate.logger.context) {
                    req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
                }

                ourObjectTemplate.logger.clearContextProps(context);

                res.end(respstr);
                displayPerformance(req);

                statsdUtils.computeTimingAndSend(
                    processMessageStartTime,
                    'amorphic.webserver.process_message.response_time',
                    { result: 'success' });
            };

            ourObjectTemplate.incomingIP = (String(req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

            // Enable the sending of the message in the response
            ourObjectTemplate.enableSendMessage(true, sendMessage);

            try {
                ourObjectTemplate.processMessage(message, null, semotus.restoreSession);
            }
            catch (error) {
                ourObjectTemplate.logger.info({
                    component: 'amorphic',
                    module: 'processMessage',
                    activity: 'error'
                }, error.message + error.stack);

                res.writeHead(500, {'Content-Type': 'text/plain'});
                ourObjectTemplate.logger.clearContextProps(context);
                res.end(error.toString());

                statsdUtils.computeTimingAndSend(
                    processMessageStartTime,
                    'amorphic.webserver.process_message.response_time',
                    { result: 'failure' });
            }

        }).catch(function failure(error) {
            log(0, req.session.id, error.message + error.stack, nonObjTemplatelogLevel);
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end(error.toString());

            statsdUtils.computeTimingAndSend(
                processMessageStartTime,
                'amorphic.webserver.process_message.response_time',
                { result: 'failure' });
        }).done();
}

module.exports = {
    processMessage: processMessage
};
