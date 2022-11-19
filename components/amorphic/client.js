/* Copyright 2012-2013 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

RemoteObjectTemplate._injectIntoTemplate = function (template) {
    // Add persistors to foreign key references
    var schema = amorphic.schema[template.__name__] || {};

    template._injectProperties = function () {
        var props = template.getProperties();
        for (var prop in props) {

            var defineProperty = props[prop];

            if (defineProperty.autoFetch || schema[prop]) {
                (function () {
                    var closureProp = prop;
                    var closureDefineProperty = defineProperty;

                    if (!props[closureProp + 'Persistor']) {
                        template.createProperty(closureProp + 'Persistor', {type: Object, toServer: false,
                            value:{isFetched: !defineProperty.autoFetch, isFetching: false}});
                    }

                    if (!template.prototype[closureProp + 'Fetch']) {
                        template.createProperty(closureProp + 'Fetch', {on: 'server', body: function () {}});
                    }

                    if (!template.prototype[closureProp + 'Get']) {
                        template.createProperty(closureProp + 'Get', {on: 'client', body: function () {
                            var persistor = this[closureProp + 'Persistor'];

                            if ((persistor.isFetched == false) && !persistor.isFetching) {
                                persistor.isFetching = true;

                                if (closureDefineProperty.type == Array) {
                                    this[closureProp] = [];
                                }

                                this[closureProp + 'Fetch'].call(this);
                            }

                            return this[closureProp];
                        }});
                    }
                })();
            }
        }
    };
    if (template.defineProperties)        {
        template._injectProperties();
    }
};

const amorphicModule = {exports: {}};
const moduleName = 'AmorphicClient';

amorphic = // Needs to be global to make mocha tests work
{
    performanceLogging: {
        start: (new Date()).getTime(),
        tasks: [],

        addCompletedTask: function (taskName) {
            this.tasks.push({name: taskName, time: (new Date()).getTime()});
        },

        getData: function () {
            var data = {start: this.start, duration: (new Date()).getTime() - this.start, tasks: []};

            if (this.tasks.length === 0) {
                return null;
            }

            var start = this.start;

            for (var ix = 0; ix < this.tasks.length; ++ix) {
                data.tasks.push({name: this.tasks[ix].name, duration: this.tasks[ix].time - start});
                start = this.tasks[ix].time;
            }

            this.startTasks();

            return data;
        },

        startTasks: function (time) {
            this.start = time || (new Date()).getTime();
            this.tasks = [];
        }
    },

    initializationData: {},
    lastServerInteraction: (new Date()).getTime(),

    setInitialMessage: function (message) {
        this.initializationData = message;
    },

    setConfig: function (config) {
        this.config = config;

        RemoteObjectTemplate.config = {nconf: {get: get}};

        function get (key) {
            return config[key];
        }
    },

    setSchema: function (schema) {
        this.schema = schema;
    },

    setApplication: function(app) {
        this.app = app;
    },

    maxAlerts: 5,
    shutdown: false,
    sequence: 1,
    logLevel: 1,
    rootId: null,
    config: {},
    schema: {},
    sessionExpiration: 0,
    activityHeartbeatInterval: 20000,
    logoutTimer: null,
    session: (new Date()).getTime(),
    state: 'live',
    app: 'generic',
    sessionId: 0,
    loggingContext: {},
    storedUID: 0,

    /**
     * expire the user's session
     */
    logoutFunction: function logoutUser() {
        const functionName = logoutUser.name;
        if (this.state === 'live') {
            // check to see if the consuming app has defined logout functionality to use
            if (this.controller.publicExpireSession && typeof this.controller.publicExpireSession === 'function') {
                this.controller.publicExpireSession();
            }
            // consuming app has NOT specified logout behavior. use our default.
            else {
                RemoteObjectTemplate.logger.info({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Server session ready to expire, resetting controller to be offline'
                });
                this.expireController();
            }
        }
    },

        /**
         * start a session with the server and process any initial messages
         *
         * @param url - of the semotus message handler (usually /semotus)
         * @param rootCallback - callback that will passed the root object
         * @param renderCallback - callback to render UI changes upon receipt of message
         *
         */
    establishClientSession: function(controllerTemplate, appVersion, bindController, refresh, reload, offline) {
        this.performanceLogging.addCompletedTask('Starting establishClientSession');
        this.setCookie('session' + this.app, this.session, 0);

            // Initialize object
        if (appVersion == '0') {
            appVersion = null;
        }

        this.url = this.initializationData.url;
        this.sessionExpiration = this.initializationData.message.sessionExpiration;
        this.bindController = bindController;
        this.appVersion = appVersion;
        this.reload = reload;
        this.offline = offline;
        this.refresh = refresh;
        this.sequence = 1;

        this.importTemplates();
        this.performanceLogging.addCompletedTask('Templates Compiled in browser');

            // Grab the controller template which is not visible until after importTemplates
        this.controllerTemplate = window[controllerTemplate];

        if (!this.controllerTemplate) {
            alert("Can't find " + controllerTemplate);

            return;
        }

        this.sendLoggingMessage = function (level, data) {
            var message = {type: 'logging', loggingLevel: level, loggingContext: this.loggingContext, loggingData: data};
            this.loggingContext = {};
            this._post(self.url, message);
        };

        RemoteObjectTemplate.logger.sendToLog = function (level, data) {
            var output = RemoteObjectTemplate.logger.prettyPrint(level, data);

            var component = data.component;

            console.log(output);

            var levelStatus = level === 'error' || level === 'fatal';
            var clientOverride = component && component === 'browser';

            if ( levelStatus || clientOverride) {
                this.sendLoggingMessage(level, data);

                if (this.controller && typeof(this.controller.displayError) === 'function') {
                    this.controller.displayError(output);
                }
            }
        }.bind(this);

        this.setContextProps = RemoteObjectTemplate.logger.setContextProps;

            /**
             * Send message to server and process response
             *
             * @param message
             */
        var self = this;

        this.sendMessage = function (message) {
            const functionName = 'establishClientSession/sendMessage';
            message.sequence = self.sequence++;
            message.loggingContext = self.loggingContext;
            message.performanceLogging = self.performanceLogging.getData();
            self.loggingContext = {};

                // Sending rootId will reset the server
            if (self.rootId) {
                message.rootId = self.rootId;
                self.rootId = null;
                RemoteObjectTemplate.logger.info({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Forcing new controller on server',
                    data: {
                        rootId: message.rootId
                    }
                });
            }
            if (self.logLevel > 0) {
                RemoteObjectTemplate.logger.info({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'sending ' + message.type + ' ' + message.name
                });
            }

            self.lastServerInteraction = (new Date()).getTime();

                // Post xhr to server
            RemoteObjectTemplate.enableSendMessage(false);  // Queue stuff while we are out to the server

            self._post(self.url, message, function (request) { // Success
                RemoteObjectTemplate.enableSendMessage(true, this.sendMessage); // Re-enable sending

                var message = JSON.parse(request.responseText);

                if (self.logLevel > 0) {
                    RemoteObjectTemplate.logger.info({
                        module: moduleName,
                        function: `${functionName}/_post`,
                        category: 'milestone',
                        message: 'receiving ' + message.type + ' ' + message.name + ' serverAppVersion=' + message.ver +
                                 'executionTime=' + ((new Date()).getTime() - self.lastServerInteraction) +
                                 'ms messageSize=' + Math.round(request.responseText.length / 1000) + 'K'
                    });
                }

                    // If app version in message not uptodate
                if (self.appVersion && message.ver != self.appVersion) {
                    RemoteObjectTemplate.logger.info({
                        module: moduleName,
                        function: `${functionName}/_post`,
                        category: 'milestone',
                        message: 'Application version ' + self.appVersion + ' out of date - ' + message.ver + ' is available - reloading in 5 seconds'
                    });

                    self.shutdown = true;
                    self.reload();

                    return;
                }

                if (message.type == 'pinged') {
                    return;
                }

                if (message.sessionExpired) {
                    RemoteObjectTemplate.clearPendingCalls();
                }

                    // Handle resets and refreshes
                if (message.newSession || message.type == 'refresh') {
                    self._reset(message);
                }
                else {
                    var hasChanges = RemoteObjectTemplate.processMessage(message);
                    new Promise((resolve) => {
                        setTimeout(() => {
                            self.refresh(hasChanges);
                            resolve();
                        }, 50);
                    });
                }

                if (message.sync === false) {
                    self.refreshSession();
                }

            }, function (err) { // Failure of the wire
                RemoteObjectTemplate.enableSendMessage(true, this.sendMessage); // Re-enable sending

                if (typeof(self.offline) === 'function') {
                    self.offline.call();
                }
                else if (--self.maxAlerts > 0) {
                    alert('Error on server: ' + err);
                }
            });
        };

            // Kick everything off by processing initial message
        this._reset(this.initializationData.message, appVersion, reload);
        this.performanceLogging.addCompletedTask('Initial Message Processed on Browser');

            // Manage events for session expiration
        this.addEvent(document.body, 'click', function() {
            self._windowActivity(); self.activity = true;
        });

        this.addEvent(document.body, 'mousemove', function() {
            self._windowActivity(); self.activity = true;
        });

        this.addEvent(window, 'focus', function () {
            self._windowActivity();
        });

        /*
            there will always be a countdown working towards executing user logout. we will check every x seconds
            if there has been activity. if there is, reset this countdown. if not, logout executes.

            NO ACTIVITY?
            if no activity after `sessionExpiration` amount of time, the logout callback will execute.
            this can either be our definition of logout, or the consuming app's overridden version of logout.

            YES ACTIVITY?
            if there is activity before the session expires, and reset the timer to start counting down again.
         */
        setInterval(function checkActivityHeartbeat() {
            if (self.activity) {
                clearTimeout(self.logoutTimer);

                self.logoutTimer = setTimeout(self.logoutFunction.bind(self), self.sessionExpiration);
                self.activity = false;
            }
        }, self.activityHeartbeatInterval);

        setInterval(function () {
            self._zombieCheck();
        }, 50);
    },

    // For file uploads we use an iFrame
    prepareFileUpload: function(id) {
        var iFrame = document.getElementById(id);
        var iFrameDoc = iFrame.contentWindow.document;
        var content = document.getElementById(id + '_content').value;
        iFrameDoc.open();
        iFrameDoc.write(content.replace(/__url__/, this.url + '&file=yes'));
        iFrameDoc.close();
    },

        // When a zombie gets focus it wakes up.  Pushing it's cookie makes other live windows into zombies
    _windowActivity: function () {
        if (this.state == 'zombie') {
            this.expireController();  // Toss anything that might have happened

            RemoteObjectTemplate.enableSendMessage(true, this.sendMessage); // Re-enable sending

            this.state = 'live';
            this.rootId = null;  // Cancel forcing our controller on server
            this.refreshSession();

            RemoteObjectTemplate.logger.info({
                module: moduleName,
                function: '_windowActivity',
                category: 'milestone',
                message: 'Getting live again - fetching state from server'
            });
        }

        this.setCookie('session' + this.app, this.session, 0);
    },

        // Anytime we see some other windows session has been stored we become a zombie
    _zombieCheck: function () {
        if (RemoteObjectTemplate.getPendingCallCount() == 0 && this.getCookie('session' + this.app) != this.session) {

            if (this.state != 'zombie') {
                this.state = 'zombie';
                this.expireController();

                RemoteObjectTemplate.logger.info({
                    module: moduleName,
                    function: '_zombieCheck',
                    category: 'milestone',
                    message: 'Another browser took over, entering zombie state'
                });
                RemoteObjectTemplate.enableSendMessage(false);  // Queue stuff as a zombie we will toss it later
            }
        }
    },

    expireController: function () {
            // Create new controller
        if (this.sessionId) {
            RemoteObjectTemplate.deleteSession(this.sessionId);
        }

        this.sessionId = RemoteObjectTemplate.createSession('client', this.sendMessage);
        this.controller = new (this.controllerTemplate)();
        this.rootId = this.controller.__id__;  // Force it to be sent as reset on next message

        RemoteObjectTemplate.controller = this.controller;
        RemoteObjectTemplate.syncSession(); // Start tracking changes post init

        this.bindController.call(null, this.controller, this.sessionExpiration); // rebind to app
    },

    pingSession: function () {
        this.sendMessage({type: 'ping'});
    },

    resetSession: function () {
        this.sendMessage({type: 'reset'});
    },

    refreshSession: function () {
        this.sendMessage({type: 'refresh'});
    },

    setNewController: function (controller, expiration) {
        this.rootId = controller.__id__;
        this.bindController.call(null, controller, expiration);
    },

    generateUID: function () {
        // shamelessly taken from https://stackoverflow.com/questions/8012002/create-a-unique-number-with-javascript-time/28918947
        this.storedUID = new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
        return this.storedUID;
    },

    _reset: function (message, appVersion, reload) {
        if (this.sessionId) {
            RemoteObjectTemplate.deleteSession(this.sessionId);
        }

        this.sessionId = RemoteObjectTemplate.createSession('client', this.sendMessage);
        RemoteObjectTemplate.setMinimumSequence(message.startingSequence);

        if (message.rootId) {
            this.controller = RemoteObjectTemplate._createEmptyObject(this.controllerTemplate, message.rootId);
        }
        else {
            this.controller = new (this.controllerTemplate)();
            this.rootId = this.controller.__id__;
        }

        RemoteObjectTemplate.controller = this.controller;

        if (appVersion && message.ver != appVersion) {
            RemoteObjectTemplate.logger.info({
                module: moduleName,
                function: '_reset',
                category: 'milestone',
                message: 'Application version ' + appVersion + ' out of date - ' + message.ver + ' is available - reloading in 5 seconds'
            });

            this.shutdown = true;
            this.bindController.call(null, this.controller, message.sessionExpiration);
            reload();

            return;
        }

        RemoteObjectTemplate.syncSession();
        RemoteObjectTemplate.processMessage(message);

        this.bindController.call(null, this.controller, message.sessionExpiration);
    },

    _post: function (url, message, success, failure, retries, retryInterval) {

        // Add request ID for every post call into the messages loggingContext
        message.loggingContext.requestID = this.generateUID();
        success = success || function () {};
        failure = failure || function () {};
        retries = retries || 30;
        retryInterval = retryInterval || 2000;

        if (this.shutdown) {
            return;
        }

        var request = this.getxhr();
        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/json');

        var self = this;

        function isRetriableErrorStatus(status) {
            const errorStatuses = new Set([500, 502, 503, 504, 0]);

            return errorStatuses.has(status);
        }

        request.onreadystatechange = function () {
            const functionName = 'request.onreadystatechange';
            if (request.readyState != 4) {
                return;
            }

            try {
                var status = request.status;
                var statusText = request.statusText;
            }
            catch (e) {
                var status = 666;
                var statusText = 'unknown';
            }

            if (status === 200) {
                if (this.logLevel > 0) {
                    RemoteObjectTemplate.logger.info({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'Got response for: ' + message.type + ' ' + message.name
                    });
                }

                success.call(this, request);
            }
            else {
                RemoteObjectTemplate.logger.error({
                    module: moduleName,
                    function: functionName,
                    category: 'milestone',
                    message: 'Error: ' + message.type + ' ' + message.name + ' status: ' + status + ' - ' + statusText
                });

                if (isRetriableErrorStatus(status) && --retries) {
                    RemoteObjectTemplate.logger.error({
                        module: moduleName,
                        function: functionName,
                        category: 'milestone',
                        message: 'temporary error retrying in ' + retryInterval / 1000 + ' seconds'
                    });

                    setTimeout(function () {
                        return self._post(url, message, success, failure, retries, retryInterval);
                    }, retryInterval);
                }
                else {
                    failure.call(this, status + ' - ' + statusText);
                }
            }
        };

        try {
            request.send(JSON.stringify(message));
        }
        catch (e) {
            throw 'xhr error ' + e.message + ' on ' + url;
        }
    },

    getxhr: function() {
        try {
            return new XMLHttpRequest();
        }
        catch (e) {
            try {
                return new ActiveXObject('Msxml2.XMLHTTP');
            }
            catch (e2) {
                try {
                    return new ActiveXObject('Microsoft.XMLHTTP');
                }
                catch (e3) {
                    throw 'No support for XMLHTTP';
                }
            }
        }
    },

        /**
         * Import templates by calling each property of exports, dividing them into two rounds
         * and starting with the non _mixin
         */
    importTemplates: function () {

        RemoteObjectTemplate.lazyTemplateLoad = this.config.lazyTemplateLoad;

            // Graph of mixins so we can process them at the end
        var mixinGraph = {};

        if (amorphicModule.exports.objectTemplateInitialize) {
            amorphicModule.exports.objectTemplateInitialize(RemoteObjectTemplate);
        }

        var objectTemplateSubClass = Object.create(RemoteObjectTemplate);
        var currentContext = {pass: 1};


        if (this.config.templateMode == 'typescript') {
        }
        else if (this.config.templateMode == 'auto') {

            var deferredExtends = [];
            RemoteObjectTemplate.__statics__ = {};

            usesV2ReturnPass1.prototype.mixin = function () {};

            usesV2ReturnPass1.prototype.extend = function(name) {
                this.extendedName = name;
                deferredExtends.push(this);

                return new usesV2ReturnPass1(name);
            };

            usesV2ReturnPass1.prototype.doExtend = function(futureTemplates) {
                if (!RemoteObjectTemplate.__dictionary__[this.baseName]) {
                    if (futureTemplates[this.baseName]) {
                        futureTemplates[this.baseName].doExtend(futureTemplates);
                    }

                    if (!RemoteObjectTemplate.__dictionary__[this.baseName]) {
                        throw Error('Attempt to extend ' + this.baseName + ' which was never defined; extendedName=' + this.extendedName);
                    }
                }

                if (!RemoteObjectTemplate.__dictionary__[this.extendedName]) {
                    var template = RemoteObjectTemplate.__dictionary__[this.baseName].extend(this.extendedName, {});
                }
            };

            for (var exp in amorphicModule.exports || {}) {
                if (!exp.match(/_mixins/)) {
                    objectTemplateSubClass.create = function (name) {
                        var template = RemoteObjectTemplate.create(name, {});
                        var originalExtend = template.extend;

                        template.extend = function (name, props)  {
                            var template = RemoteObjectTemplate.__dictionary__[name];

                            if (template) {
                                template.mixin(props);
                            }
                            else {
                                template = originalExtend.call(this, name, props);
                            }

                            return template;
                        };

                        var originalMixin = template.mixin;

                        template.mixin = function () {
                            if (currentContext.pass === 2) {
                                if (arguments[0] && arguments[0].isObjectTemplate) {
                                    scheduleDeferredMixinProcessing(template, arguments[0]);
                                }
                                else {
                                    originalMixin.apply(template, arguments);
                                }
                            }
                        };

                        return template;
                    };

                    var initializerReturnValues = (amorphicModule.exports[exp])(objectTemplateSubClass, usesV2Pass1);

                    recordStatics(initializerReturnValues);
                }
            }

                // Extended classes can't be processed until now when we know we have all the base classes defined
            var futureTemplates = {};

            for (var ix = 0; ix < deferredExtends.length; ++ix) {
                futureTemplates[deferredExtends[ix].extendedName] = deferredExtends[ix];
            }

            for (var ix = 0; ix < deferredExtends.length; ++ix) {
                deferredExtends[ix].doExtend(futureTemplates);
            }

            currentContext.pass = 2;

            var objectTemplateSubClass = Object.create(RemoteObjectTemplate);

            for (var exp in amorphicModule.exports) {
                objectTemplateSubClass.create = function (name, props) {
                    if (RemoteObjectTemplate.__dictionary__[name.name || name]) {
                        RemoteObjectTemplate.__dictionary__[name.name || name].mixin(props);
                    }
                    else {
                        RemoteObjectTemplate.create(name, props);
                    }

                    return RemoteObjectTemplate.__dictionary__[name.name || name];
                };

                var initializerReturnValues;

                if (this.config && this.config.modules) {
                    initializerReturnValues = (amorphicModule.exports[exp])(objectTemplateSubClass, usesV2Pass2, this.config.modules[exp.replace(/_mixins/, '')]);
                }
                else {
                    initializerReturnValues = (amorphicModule.exports[exp])(objectTemplateSubClass, usesV2Pass2, null);
                }

                recordStatics(initializerReturnValues);
            }

            processDeferredMixins();

            for (var name in RemoteObjectTemplate.__dictionary__) {
                window[name] = RemoteObjectTemplate.__dictionary__[name];
            }

            for (var name in RemoteObjectTemplate.__statics__) {
                window[name] = RemoteObjectTemplate.__statics__[name];
            }
        }
        else {
            var requires = {};

            for (var exp in amorphicModule.exports || {}) {
                if (!exp.match(/_mixins/)) {
                    var templates = (amorphicModule.exports[exp])(RemoteObjectTemplate, function () {
                        return window;
                    });

                    requires[exp] = templates;

                    for (var template in  templates) {
                        window[template] = templates[template];
                    }
                }
            }

            var templates = flatten(requires);

            for (var exp in amorphicModule.exports) {
                if (exp.match(/_mixins/)) {

                    if (this.config) {
                        templates = (amorphicModule.exports[exp])(RemoteObjectTemplate, requires, this.config.modules[exp.replace(/_mixins/, '')], templates);
                    }
                    else {
                        templates = (amorphicModule.exports[exp])(RemoteObjectTemplate, requires, null, templates);
                    }

                    for (var template in  templates) {
                        window[template] = templates[template];
                    }
                }
            }
        }

        RemoteObjectTemplate.performInjections();

        function flatten (requires) {
            var classes = {};

            for (var f in requires) {
                for (var c in requires[f]) {
                    classes[c] = requires[f][c];
                }
            }

            return classes;
        }

        function usesV2Pass1 (file, templateName, options) {
            var templateName = templateName || file.replace(/\.js$/, '').replace(/.*?[\/\\](\w)$/, '$1');
            var staticTemplate = RemoteObjectTemplate.__statics__[templateName];

            return staticTemplate || new usesV2ReturnPass1(templateName);
        }

        function usesV2Pass2 (file, templateName, options) {
            var templateName = templateName || file.replace(/\.js$/, '').replace(/.*?[\/\\](\w)$/, '$1');

            return RemoteObjectTemplate.__dictionary__[templateName] || RemoteObjectTemplate.__statics__[templateName];
        }

            // An object for creating request to extend classes to be done at thend of V2 pass1
        function usesV2ReturnPass1 (base) {
            this.baseName = base;
        }
        function scheduleDeferredMixinProcessing(template, mixinTemplate) {
            mixinGraph[template.__name__] =  mixinGraph[template.__name__] || {};
            mixinGraph[template.__name__][mixinTemplate.__name__] = true;
        }

        function processDeferredMixins() {

                // Go through each template that needs a mixin
            for (var rootMixin in mixinGraph) {
                processRootMixin(mixinGraph[rootMixin], rootMixin);
            }

            function processRootMixin(rootMixin, rootMixinTemplateName) {

                    // Go through each of the templates that needs to be mixed in
                for (var childMixin in rootMixin) {
                    processChildMixin(childMixin);
                }

                function processChildMixin(childMixinTemplateName) {

                        // that template that needs to be mixed in also needs mixins, process them first
                    if (mixinGraph[childMixinTemplateName]) {
                        processRootMixin(mixinGraph[childMixinTemplateName], childMixinTemplateName);
                        mixinGraph[childMixinTemplateName] = {};  // Make sure we don't process twice
                    }
                        // Now we can safely do the mixin
                    RemoteObjectTemplate.mixin(RemoteObjectTemplate.__dictionary__[rootMixinTemplateName],
                            RemoteObjectTemplate.__dictionary__[childMixinTemplateName]);
                }
            }
        }

        function recordStatics(initializerReturnValues) {
            for (var returnVariable in initializerReturnValues)                    {
                if (!RemoteObjectTemplate.__dictionary__[returnVariable]) {
                    if (RemoteObjectTemplate.__statics__[returnVariable]) {
                        var staticProps = Object.getOwnPropertyNames(RemoteObjectTemplate.__statics__[returnVariable]);
                        for (var sx = 0; sx < staticProps.length; ++sx) {
                            RemoteObjectTemplate.__statics__[returnVariable][staticProps[sx]] =
                                    initializerReturnValues[returnVariable][staticProps[sx]];
                        }
                    }
                    else {
                        RemoteObjectTemplate.__statics__[returnVariable] = initializerReturnValues[returnVariable];
                    }
                }
            }
        }

    },

    addEvent: function (elem, evName, evFunc) {
        if (elem.attachEvent) {
            elem.attachEvent('on' + evName, function() {
                evFunc.call(elem);
            });
        }
        else {
            elem.addEventListener(evName, evFunc, false);
        }
    },

    getCookie: function (str) {
        return this.getCookieJar()[str] || '';
    },

    setCookie: function (cookie, value, length) {
        var now = new Date();

        now.setDate(now.getDate() + (length ? length : 30));
        let cookieValue = cookie + '=' + value + '; expires=' + now.toUTCString() + '; path=/;';
        if (this.config.sameSiteCookie) {
            cookieValue += `sameSite=${this.config.sameSiteCookie};`
        }
        if (this.config.secureCookie) {
            cookieValue += `Secure;`
        }

        document.cookie = cookieValue;
    },

    getCookieJar: function () {
        var cookies = document.cookie.split(';');
        var jar = new Object();

        for (var i = 0; i < cookies.length; ++i) {
            if (cookies[i].match(/[ ]*(.*?)=(.*)/)) {
                jar[RegExp.$1] = RegExp.$2;
            }
        }

        return jar;
    }
};
