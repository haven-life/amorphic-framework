'use strict';

let AmorphicContext = require('../AmorphicContext');
let Logger = require('../utils/logger');
let getLoggingContext = Logger.getLoggingContext;
let getController = require('../getController').getController;
let getServerConfigString = require('../utils/getServerConfigString').getServerConfigString;
let saveSession = require('./saveSession').saveSession;
let restoreSession = require('./restoreSession').restoreSession;
let getObjectTemplate = require('../utils/getObjectTemplate');
let Bluebird = require('bluebird');
let statsdUtils = require('@havenlife/supertype').StatsdHelper;

/**
 * Continues an already establised session.
 *
 * @param {Object} req - Express request object.
 * @param {String} controllerPath
 * @param {String} path - The app name. - param
 * @param {unknown} session unknown - param
 * @param {unknown} newControllerId unknown - param
 * @param {unknown} newPage unknown - param
 * @param {unknown} reset unknown - param
 *
 * @returns {Object} unknown
 */
function establishContinuedServerSession(req, path, session, newControllerId, newPage, reset) {
    let establishContinuedServerSessionTime = process.hrtime();

    let applicationPersistorProps = AmorphicContext.applicationPersistorProps;
    let config = amorphicContext.getAppConfigByPath(path);

    let sessionExpiration = config.sessionExpiration;
    let appVersion = config.appVersion;

    newControllerId = newControllerId || null;
    // Create or restore the controller
    let shouldReset = false;
    let newSession = false;
    let controller;
    let ret;

    if (!session.semotus || !session.semotus.controllers[path] || reset || newControllerId) {
        shouldReset = true;
        // TODO what is newSession, why do this?
        newSession = !newControllerId;

        if (!session.semotus) {
            session.semotus = getDefaultSemotus();
        }

        if (!session.semotus.loggingContext[path]) {
            let messageContext = req.body && req.body.loggingContext;
            session.semotus.loggingContext[path] = Object.assign(getLoggingContext(path, null), messageContext);
        }
    }

    controller = getController(path, session, newPage, shouldReset, newControllerId, req);
    let ourObjectTemplate = getObjectTemplate(controller);
    ourObjectTemplate.reqSession = req.session;
    controller.__request = req;
    controller.__sessionExpiration = sessionExpiration;

    req.amorphicTracking.addServerTask({name: 'Create Controller'}, process.hrtime());

    ret = {
        appVersion: appVersion,
        newSession: newSession,
        objectTemplate: ourObjectTemplate,

        getMessage: function gotMessage() {
            let message = this.objectTemplate.getMessage(session.id, true);

            // TODO Why is newSession always true here?
            message.newSession = true;
            message.rootId = controller.__id__;
            message.startingSequence = this.objectTemplate.maxClientSequence + 100000;
            message.sessionExpiration = sessionExpiration;
            message.ver = this.appVersion;

            return message;
        },

        getServerConnectString: function yelo() {
            return JSON.stringify({
                url: '/amorphic/xhr?path=' + path,
                message: this.getMessage()
            });
        },

        getServerConfigString: function yolo() {
            return getServerConfigString(config);
        },

        save: function surve(path, session, req) {
            saveSession(path, session, controller, req);
        },

        restoreSession: function rastaSess() {
            return restoreSession(path, session, controller);
        },

        getPersistorProps: function getPersistorProps() {
            return applicationPersistorProps[path] || (this.getPersistorProps ? this.getPersistorProps() : {});
        }
    };

    if (newPage) {
        saveSession(path, session, controller, req);
    }

    return Bluebird.try(function g() {
        statsdUtils.computeTimingAndSend(
            establishContinuedServerSessionTime,
            'amorphic.session.establish_continued_server_session.response_time');

        return ret;
    });
}

function getDefaultSemotus() {
    return {
        controllers: {},
        loggingContext: {}
    };
}

module.exports = {
    establishContinuedServerSession: establishContinuedServerSession
};
