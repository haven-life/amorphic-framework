'use strict';

let AmorphicContext = require('./AmorphicContext');
let Logger = require('./utils/logger');
let log = Logger.log;
let setupLogger = Logger.setupLogger;
let persistor = require('@havenlife/persistor');
let semotus = require('@havenlife/semotus');
let getTemplates = require('./getTemplates').getTemplates;
let decompressSessionData = require('./session/decompressSessionData').decompressSessionData;

/**
 * Create a controller template that has a unique Semotus instance that is
 * for one unique session
 *
 * @param {unknown} path - unique path for application - param
 * @param {unknown} expressSession - Express session object - param
 * @param {Boolean|String} newPage - force returning everything since this is likely a session continuation on a - param
 * new web page.
 * @param {unknown} reset - create new clean empty controller losing all data - param
 * @param {unknown} controllerId - unknown - param
 * @param {Object} req - Express request object. - param
 *
 * @returns {*}
 */
function getController(path, expressSession, newPage, reset, controllerId, req) {
    let applicationConfig = AmorphicContext.applicationConfig;
    let sessionId = expressSession.id;
    let config = AmorphicContext.getAppConfigByPath(path);
    let controllerPath = AmorphicContext.getControllerPath(path); // file path for controller objects

    let {initObjectTemplate } = config; // initObjectTemplate - Function that injects properties aka callback for dependency injection into controller - config

    // Originally cleared controller from cache if need be, but no more cache!
    if (reset) { // Hard reset makes sure we create a new controller
        expressSession.semotus.controllers[path] = null;
    }

    let matches = controllerPath.match(/(.*?)([0-9A-Za-z_]*)\.js$/);
    let prefix = matches[1];
    let prop = matches[2];

    // Create a new unique object template utility
    let persistableSemotableTemplate = persistor(null, null, semotus);
    persistableSemotableTemplate.lazyTemplateLoad = config.appConfig.lazyTemplateLoad;

    if (config.appConfig.templateMode === 'typescript') {
        injectTemplatesIntoCurrentSession(require('../index.js').amorphicStatic, persistableSemotableTemplate);
    }

    setupLogger(persistableSemotableTemplate.logger, path, expressSession.semotus.loggingContext[path], applicationConfig);

    // Inject into it any db or persist attributes needed for application
    initObjectTemplate(persistableSemotableTemplate);

    // Restore any saved objectMap
    if (expressSession.semotus.objectMap && expressSession.semotus.objectMap[path]) {
        persistableSemotableTemplate.objectMap = expressSession.semotus.objectMap[path];
    }

    // Get the controller and all of it's dependent templates which will populate a
    // key value pairs where the key is the require prefix and and the value is the
    // key value pairs of each exported template
	let ControllerTemplate = AmorphicContext.applicationTSController[path] || getTemplates(persistableSemotableTemplate, prefix, [prop + '.js'], config, path)[prop].Controller;

    if (!ControllerTemplate) {
        throw  new Error('Missing controller template in ' + prefix + prop + '.js');
    }

    ControllerTemplate.objectTemplate = persistableSemotableTemplate;

    // Setup unique object template to manage a session
    // Creates a semotus session for this given expressSession to only be used within semotus changetracking
    persistableSemotableTemplate.createSession('server', null, expressSession.id);

    let browser = ' - browser: ' + req.headers['user-agent'] + ' from: ' + (req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress);

    // Either restore the controller from the serialized string in the session or create a new one
    let controller;
    let loggingDetails;
    let loggingMessage;

    // No controller in the session
    if (!expressSession.semotus.controllers[path]) {
        if (controllerId) {
            // Since we are restoring we don't changes saved or going back to the browser
            persistableSemotableTemplate.withoutChangeTracking(function bb() {
                controller = persistableSemotableTemplate._createEmptyObject(ControllerTemplate, controllerId);
                persistableSemotableTemplate.syncSession(); // Kill changes to browser
            });
        }
        else {
            controller = new ControllerTemplate();

            if (config.appConfig.templateMode === 'typescript') {
                persistableSemotableTemplate.sessionize(controller);
            }
        }

        // With a brand new controller we don't want old object to persist id mappings
        if (persistableSemotableTemplate.objectMap || config.appConfig.keepOriginalIdForSavedObjects) {
            persistableSemotableTemplate.objectMap = {};
        }

        if (typeof(controller.serverInit) === 'function') {
            controller.serverInit();
        }

        loggingDetails = {
            component: 'amorphic',
            module: 'getController',
            activity: 'new',
            controllerId: controller.__id__,
            requestedControllerId: controllerId || 'none'
        };

        loggingMessage = newPage ? 'Creating new controller new page ' : 'Creating new controller ';
        persistableSemotableTemplate.logger.info(loggingDetails, loggingMessage + browser);
    }
    else {
        persistableSemotableTemplate.withoutChangeTracking(function cc() {
            let unserialized = expressSession.semotus.controllers[path];

            controller = persistableSemotableTemplate.fromJSON(
                decompressSessionData(unserialized.controller),
                ControllerTemplate
            );

            if (config.appConfig.templateMode === 'typescript') {
                persistableSemotableTemplate.sessionize(controller);
            }

            // Make sure no duplicate ids are issued
            let semotusSession = persistableSemotableTemplate._getSession();

            for (let obj in semotusSession.objects) {
                if (obj.match(/^server-[\w]*?-([0-9]+)/)) {
                    semotusSession.nextObjId = Math.max(semotusSession.nextObjId, RegExp.$1 + 1);
                }
            }

            persistableSemotableTemplate.logger.info({
                component: 'amorphic',
                module: 'getController',
                activity: 'restore'
            }, 'Restoring saved controller ' + (newPage ? ' new page ' : '') + browser);

            if (!newPage) { // No changes queued as a result unless we need it for init.js
                persistableSemotableTemplate.syncSession();
            }
        });
    }

    persistableSemotableTemplate.controller = controller;
    controller.__sessionId = sessionId;

    return controller;
}

function injectTemplatesIntoCurrentSession(source, destination) {
    for (var templateName in source.__dictionary__) {
        destination.__dictionary__[templateName] = source.__dictionary__[templateName];
    }
}

module.exports = {
    getController: getController
};
