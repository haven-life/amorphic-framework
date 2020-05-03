let getSessionCache = require('../session/getSessionCache').getSessionCache;
let displayPerformance = require('../utils/displayPerformance').displayPerformance;
import * as url from 'url';
import {establishServerSession} from '../session/establishServerSession';
import * as Logger from '../utils/logger';
let log = Logger.log;
import {StatsdHelper} from '@havenlife/supertype';
import {ContinuedSessionRet} from '../types/AmorphicTypes'
import {Request, Response} from 'express';
import { nonObjTemplatelogLevel} from '../types/Constants';


/**
 * Process JSON request message, 99% communication in amorphic goes through this pathway
 *
 * @param {unknown} req unknown
 * @param {unknown} res unknown
 */
export async function processMessage(req: Request, res: Response) {

    let processMessageStartTime = process.hrtime();

    let session = req.session;

    let message = req.body;
    let path = url.parse(req.originalUrl, true).query.path as string;

    if (!message.sequence) {
        log(1, session.id, 'ignoring non-sequenced message', nonObjTemplatelogLevel);
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.end('ignoring non-sequenced message');

        StatsdHelper.computeTimingAndSend(
            processMessageStartTime,
            'amorphic.webserver.process_message.response_time',
            {result: 'failure'});

        return;
    }
    else {

        let expectedSequence = session.sequence || message.sequence;
        let newPage = message.type === 'refresh' || message.sequence !== expectedSequence;
        let forceReset = message.type === 'reset';

        try {
            // This should NEVER be the first spot we're hitting the session.
            const amorphicSession: ContinuedSessionRet = await establishServerSession(req, path, newPage, forceReset, message.rootId);
            if (message.performanceLogging) {
                // @ts-ignore
                req.amorphicTracking.browser = message.performanceLogging;
            }

            let callContext = message.type;

            if (message.type === 'call') {
                callContext += '.' + message.id + '[' + message.name + ']';
            }

            let context = amorphicSession.objectTemplate.logger.setContextProps({
                app: path,
                message: callContext,
                sequence: message.sequence,
                expectedSequence: session.sequence,
                session: session.id,
                ipaddress: (String(req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') ||
                    'unknown'
            });

            ++session.sequence; // @TODO: may be redundant with other line here

            let ourObjectTemplate = amorphicSession.objectTemplate;
            let remoteSessionId = session.id;

            let startMessageProcessing;
            // If we expired just return a message telling the client to reset itself
            if (amorphicSession.newSession || newPage || forceReset) {
                if (amorphicSession.newSession) {
                    ourObjectTemplate.logger.info({
                            component: 'amorphic',
                            module: 'processMessage',
                            activity: 'reset'
                        }, remoteSessionId,
                        'Force reset on ' + message.type + ' ' + 'new session' + ' [' + message.sequence + ']');
                } else {
                    ourObjectTemplate.logger.info({component: 'amorphic', module: 'processMessage', activity: 'reset'},
                        remoteSessionId, 'Force reset on ' + message.type + ' ' + ' [' + message.sequence + ']');
                }

                amorphicSession.save(path, session, req);
                startMessageProcessing = process.hrtime();

                let outbound = amorphicSession.getMessage();

                outbound.ver = amorphicSession.appVersion;
                ourObjectTemplate.logger.clearContextProps(context);
                res.end(JSON.stringify(outbound));  // return a sync message assuming no queued messages

                for (let prop in ourObjectTemplate.logger.context) {
                    // @ts-ignore
                    req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
                }

                // @ts-ignore
                req.amorphicTracking.addServerTask({name: 'Reset Processing'}, startMessageProcessing);
                session.sequence = message.sequence + 1; //@TODO: this _may_ be redundant
                displayPerformance(req);

                StatsdHelper.computeTimingAndSend(
                    processMessageStartTime,
                    'amorphic.webserver.process_message.response_time',
                    {result: 'success'});

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
                // @ts-ignore
                req.amorphicTracking.addServerTask({name: 'Request Processing'}, startMessageProcessing);
                amorphicSession.save(path, session, req);
                message.ver = amorphicSession.appVersion;
                message.sessionExpired = ourObjectTemplate.sessionExpired;

                let respstr = JSON.stringify(message);

                for (let prop in ourObjectTemplate.logger.context) {
                    // @ts-ignore
                    req.amorphicTracking.loggingContext[prop] = ourObjectTemplate.logger.context[prop];
                }

                ourObjectTemplate.logger.clearContextProps(context);

                res.end(respstr);
                displayPerformance(req);

                StatsdHelper.computeTimingAndSend(
                    processMessageStartTime,
                    'amorphic.webserver.process_message.response_time',
                    {result: 'success'});
            };

            ourObjectTemplate.incomingIP = (String(req.headers['x-forwarded-for'] ||
                req.connection.remoteAddress)).split(',')[0].replace(/(.*)[:](.*)/, '$2') || 'unknown';

            // Enable the sending of the message in the response
            ourObjectTemplate.enableSendMessage(true, sendMessage);

            try {
                ourObjectTemplate.processMessage(message, null, amorphicSession.restoreSession);
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

                StatsdHelper.computeTimingAndSend(
                    processMessageStartTime,
                    'amorphic.webserver.process_message.response_time',
                    {result: 'failure'});
            }
        } catch (error) {
            log(0, session.id, error.message + error.stack, nonObjTemplatelogLevel);
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end(error.toString());

            StatsdHelper.computeTimingAndSend(
                processMessageStartTime,
                'amorphic.webserver.process_message.response_time',
                {result: 'failure'});
        }
    }
}
