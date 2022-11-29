'use strict';

// Internal modules
const AmorphicContext = require('./AmorphicContext');
const logMessage = require('./utils/logger').logMessage;
const SupertypeSession = require('@haventech/supertype').SupertypeSession;

// Npm modules
const persistor = require('@haventech/persistor');
const superType = require('@haventech/supertype').default;

const moduleName = startPersistorMode.name;

/**
 * Use this to bootstrap persistor in a "single" app.
 *
 * @param {Object} dbConfig - The db config object.
 * @param {object} schema - The db schema.
 * @param {object} logger - bunyan logger
 *
 * @returns {void} Promise that resolves when persistor is bootstrapped.
 */
function startPersistorMode(dbConfig, schema, logger) {
    SupertypeSession.logger.setLogger(logger);
    return setUpInjectObjectTemplate(dbConfig, schema)
        .then(loadTSTemplates.bind(this))
        .then((baseTemplate) => finishDaemonIfNeeded(baseTemplate));
}

/**
 * Sets up the injectObjectTemplate function used when loading templates to make them PersistableSemotable or
 *   simply Persistable.
 *
 * @param {Object} dbConfig - The db config object.
 * @param {String} schema - The app schema.
 *
 * @returns {Function} A bound function to be used when loading templates.
 */
function setUpInjectObjectTemplate(dbConfig, schema) {
    const amorphicOptions = AmorphicContext.amorphicOptions || {};
    const knex = require('knex')({
        client: dbConfig.dbType,
        debug: dbConfig.knexDebug,
        connection: {
            host:       dbConfig.dbPath,
            database:   dbConfig.dbName,
            user:       dbConfig.dbUser,
            password:   dbConfig.dbPassword,
            port:       dbConfig.dbPort,
            application_name: dbConfig.appName
        },
        pool: {
            min: 0,
            max: dbConfig.dbConnections
        },
        acquireConnectionTimeout: dbConfig.dbConnectionTimeout
    });


    return Promise.resolve(knex)
        .then(returnBoundInjectTemplate.bind(this, amorphicOptions, schema));
}


/**
 * Returns a bound version of injectObjectTemplate.  Needed because...
 *
 * @param {Object} amorphicOptions - unknown
 * @param {String} schema - The app schema.
 * @param {Object} knex - A connection to the database.
 *
 * @returns {Function} A bound version of injectObjectTemplate.
 */
function returnBoundInjectTemplate(amorphicOptions, schema, knex) {
    return injectObjectTemplate.bind(null, amorphicOptions, schema, knex);
}

/**
 * Used to add inject props during get/load templates.
 *
 * @param {Object} amorphicOptions - unknown
 * @param {String} schema - The app schema.
 * @param {Object} knex - The db connection.
 * @param {Object} objectTemplate - Object template passed in later.
 */
function injectObjectTemplate(amorphicOptions, schema, knex, objectTemplate) {
    objectTemplate.setDB(knex, 'knex');
    objectTemplate.setSchema(schema);
    objectTemplate.logLevel = 1;
    objectTemplate.__conflictMode__ = amorphicOptions.conflictMode;
}

/**
 * Used to add inject props during get/load templates.
 *
 * @param {Function} initObjectTemplateFunc - A bound version of injectObjectTemplate.
 *
 * @returns {[Object, Object]}
 */
function loadTSTemplates(initObjectTemplateFunc) {
    const baseTemplate = buildBaseTemplate();

    // Inject into it any db or persist attributes needed for application
    initObjectTemplateFunc(baseTemplate);

    require('../index.js').bindDecorators(baseTemplate);

    checkTypes(baseTemplate.getClasses());
    baseTemplate.performInjections();

    return baseTemplate;
}

/**
 * Make sure there are no null types
 *
 * @param {object} classes - amorphic dictionary from getClasses()
 */
function checkTypes(classes) {
    const functionName = checkTypes.name;
    var classCount = 0, nullType = 0, nullOf = 0, propCount = 0;
    for (var classKey in classes) {
        ++classCount;
        for (var definePropertyKey in classes[classKey].amorphicProperties) {
            var defineProperty = classes[classKey].amorphicProperties[definePropertyKey];
            if (!defineProperty.type) {
                ++nullType;
                logMessage(1, {
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Warning: ' + classKey + '.' + definePropertyKey + ' has no type'
                });
            }
            if (defineProperty instanceof Array && !defineProperty.of) {
                logMessage(1, {
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Warning: ' + classKey + '.' + definePropertyKey + ' has no of'
                });
                ++nullOf;
            }
            ++propCount;
        }
    }
    logMessage(2, {
        module: moduleName,
        function: functionName,
        category: 'milestone',
        message: `${classCount} classes loaded with ${propCount} props (${nullType} null types, ${nullOf} null ofs)`
    });
}

/**
 * Build the base template.
 *
 * @returns {Object} The base template object.
 */
function buildBaseTemplate() {
    return persistor(null, null, superType);
}

/**
 * Start Deamon if necessary.
 *
 * @param {Object} baseTemplate - unknown
 */
function finishDaemonIfNeeded(baseTemplate) {
    const functionName = finishDaemonIfNeeded.name;
    startDaemon(baseTemplate);
    logMessage(2, {
        module: moduleName,
        function: functionName,
        category: 'milestone',
        message: 'Amorphic bootstrapped started in persistor mode'
    });
}

/**
 * Start an app in daemon mode.
 *
 * @param {Object} persistableTemplate - The base persistor template for the app. (the objectTemplate injected
 *   into all the files)
 */
function startDaemon(persistableTemplate) {
    // With a brand new controller we don't want old object to persist id mappings
    if (persistableTemplate.objectMap) {
        persistableTemplate.objectMap = {};
    }
}

module.exports.startPersistorMode = startPersistorMode;
module.exports.setUpInjectObjectTemplate = setUpInjectObjectTemplate;
