'use strict';

let AmorphicContext = require('../AmorphicContext');
let Logger = require('../utils/logger');
let getLoggingContext = Logger.getLoggingContext;
let getController = require('../getController').getController;
let getServerConfigString = require('../utils/getServerConfigString').getServerConfigString;
let saveSession = require('./saveSession').saveSession;
let restoreSession = require('./restoreSession').restoreSession;
let getSessionCache = require('./getSessionCache').getSessionCache;
let getObjectTemplate = require('../utils/getObjectTemplate');
let Bluebird = require('bluebird');
let statsdUtils = require('@haventech/supertype').StatsdHelper;

/**
 * Continues an already establised session.
 *
 * @param {Object} req - Express request object.
 * @param {String} controllerPath - The path to the main controller js file.
 * @param {Function} initObjectTemplate - Function that injects properties and functions onto each object template.
 * @param {String} path - The app name.
 * @param {unknown} appVersion unknown
 * @param {unknown} sessionExpiration unknown
 * @param {unknown} session unknown
 * @param {unknown} sessionStore unknown
 * @param {unknown} newControllerId unknown
 * @param {unknown} objectCacheExpiration unknown
 * @param {unknown} newPage unknown
 * @param {unknown} controllers unknown
 * @param {unknown} sessions unknown
 * @param {unknown} reset unknown
 *
 * @returns {Object} unknown
 */
function establishContinuedServerSession(req, controllerPath, initObjectTemplate, path, appVersion,
                                         sessionExpiration, session, sessionStore,
                                         newControllerId, objectCacheExpiration, newPage,
                                         controllers, nonObjTemplatelogLevel, sessions, reset, res) {
    let establishContinuedServerSessionTime = process.hrtime();

    let applicationConfig = AmorphicContext.applicationConfig;
    let applicationPersistorProps = AmorphicContext.applicationPersistorProps;

    let config = applicationConfig[path];

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

    controller = getController(path, controllerPath, initObjectTemplate, session, objectCacheExpiration, sessionStore, newPage, shouldReset, newControllerId, req, controllers, nonObjTemplatelogLevel, sessions);

    let sessionData = getSessionCache(path, req.session.id, true, sessions);
    let ourObjectTemplate = getObjectTemplate(controller);

    ourObjectTemplate.memSession = sessionData;
    ourObjectTemplate.reqSession = req.session;
    controller.__request = req;

    // getter for the response object, adding it directly on the controller results in circular reference issues
    controller.__getResponseObj = function __getResponseObj() {
        return res;
    };
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
            saveSession(path, session, controller, req, sessions);
        },

        restoreSession: function rastaSess() {
            return restoreSession(path, session, controller, sessions);
        },

        getPersistorProps: function getPersistorProps() {
            return applicationPersistorProps[path] || (this.getPersistorProps ? this.getPersistorProps() : {});
        }
    };

    if (newPage) {
        saveSession(path, session, controller, req, sessions);
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
