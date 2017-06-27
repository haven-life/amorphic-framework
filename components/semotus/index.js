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
/*
 RemoteObjectTemplate extends ObjectTemplate to provide a synchronization mechanism for
 objects created with it's templates.  The synchronization
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['q', 'underscore', 'supertype'], factory);
    }
 else if (typeof exports === 'object') {
        module.exports = factory(require('q'), require('underscore'), require('supertype'));
    }
 else {
        root.RemoteObjectTemplate = factory(root.Q, root._, root.ObjectTemplate);
    }
}(this, function (Q, _, ObjectTemplate) {

var RemoteObjectTemplate = ObjectTemplate._createObject();

RemoteObjectTemplate._useGettersSetters = typeof(window) === 'undefined';

RemoteObjectTemplate.role = 'client';

if (typeof(window) === 'undefined') {
    RemoteObjectTemplate.role = 'server';
}

RemoteObjectTemplate.__changeTracking__ = true; // Set __changed__ when setter fires
RemoteObjectTemplate.__conflictMode__ = 'hard';

/**************************** Public Interface **********************************/

RemoteObjectTemplate.logLevel = 0;
RemoteObjectTemplate.maxClientSequence = 1;
RemoteObjectTemplate.nextObjId = 1;

/**
 * Purpose unknown
 *
 * @param {unknown} level unknown
 * @param {unknown} data unknown
 */
RemoteObjectTemplate.log = function log(level, data) {
    // OBSOLETE
    if (level > this.logLevel) {
        return;
    }

    var extraID = '';

    if (this.reqSession && this.reqSession.loggingID) {
        extraID = '-' + this.reqSession.loggingID;
    }

    var t = new Date();

    var time = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate() + ' ' + t.toTimeString().replace(/ .*/, '') + ':' + t.getMilliseconds();

    var message = (time + '(' + this.currentSession + extraID + ') ' + 'RemoteObjectTemplate:' + data);

    this.logger.info(message);
};

/**
 * Obtain a session for tracking subscriptions
 *
 * @param {unknown} role unknown
 * @param {unknown} sendMessage unknown
 * @param {unknown} sessionId unknown
 *
 * @returns {*} unknown
 */
RemoteObjectTemplate.createSession = function createSession(role, sendMessage, sessionId) {

    if (!this.sessions) {
        this.nextSubscriptionId = 0;
        this.nextSessionId = 1;
        this.sessions = {};
    }

    if (!sessionId) {
        sessionId = this.nextSessionId++;
    }

    this.setSession(sessionId);

    this.sessions[sessionId] = {
        subscriptions: {},              // Change listeners
        sendMessage: sendMessage,       // Send message callback
        sendMessageEnabled: !!sendMessage,
        remoteCalls: [],                // Remote calls queued to go out
        pendingRemoteCalls: {},         // Remote calls waiting for response
        nextPendingRemoteCallId: 1,
        nextSaveSessionId: 1,
        savedSessionId: 0,
        nextSubscriptionId: 0,
        objects: {},
        nextObjId: 1,
        dispenseNextId: null           // Force next object Id
    };

    if (role instanceof  Array) {
        for (var ix = 0; ix < role.length; ++ix) {
            this.subscribe(role[ix]);
        }

        this.role = role[1];
    }
    else {
        this.subscribe(role);
        this.role = role;
    }

    return sessionId;
};

/**
 * Remove the session from the sessions map, rejecting any outstanding promises
 *
 * @param {unknown} sessionId unknown
 */
RemoteObjectTemplate.deleteSession = function deleteSession(sessionId) {
    var session = this._getSession(sessionId);

    for (var calls in session.remoteCalls) {
        session.remoteCalls[calls].deferred.reject({code: 'reset', text: 'Session resynchronized'});
    }

    if (this.sessions[sessionId]) {
        delete this.sessions[sessionId];
    }
};

/**
 * After resynchronizing sessions we need to set a new sequence number to be used in
 * new objects to avoid conflicts with any existing ones the remote session may have
 *
 * @param {unknown} nextObjId unknown
 */
RemoteObjectTemplate.setMinimumSequence = function setMinimumSequence(nextObjId) {
    this._getSession().nextObjId = Math.max(nextObjId, this._getSession().nextObjId);
};

/**
 * Save the session data in a way that can be serialized/de-serialized
 *
 * @param {unknown} sessionId unknown
 *
 * @returns {Object} unknown
 */
RemoteObjectTemplate.saveSession = function saveSession(sessionId) {
    var session = this._getSession(sessionId);

    session.nextSaveSessionId = session.nextSaveSessionId + 1;
    session.savedSessionId = session.nextSaveSessionId;
    var objects = session.objects;
    session.objects = {};

    var str = {
        callCount: this.getPendingCallCount(sessionId), // Can't just restore on another server and carry on
        revision: session.savedSessionId,               // Used to see if our memory copy good enough
        referenced: new Date().getTime(),               // Used for reaping old sessions
        data: JSON.stringify(session)                   // All the session data
    };

    session.objects = objects;
    this.logger.debug({component: 'semotus', module: 'saveSession', activity: 'save'});

    return str;
};

/**
 * A public function to determine whether there are remote calls in progress
 *
 * @param {String} sessionId Unique identifier from which the session is fetched.
 *
 * @returns {Number} The number of remote calls pending in the session.
 */
RemoteObjectTemplate.getPendingCallCount = function getPendingCallCount(sessionId) {
    var session = this._getSession(sessionId);

    return Object.keys(session.pendingRemoteCalls).length;
};

/**
 * Restore session that was potentially serialized/de-searialized
 *
 * A revision number is used to determine whether the in-memory copy is good
 *
 * @param {unknown} sessionId - the id under which it was created with createSession
 * @param {unknown} savedSession - the POJO version of the sesion data
 * @param {unknown} sendMessage - new message function to be in effect
 *
 * @returns {Boolean} false means that messages were in flight and a reset is needed
 */
RemoteObjectTemplate.restoreSession = function restoreSession(sessionId, savedSession, sendMessage) {
    this.setSession(sessionId);
    var session = this.sessions[sessionId];
    this.logger.debug({component: 'semotus', module: 'restoreSession', activity: 'save'});

    if (session) {
        if (session.savedSessionId == savedSession.revision) {
            return true;
        }
        else {
            delete this.sessions[sessionId];
        }
    }

    this.sessions[sessionId] = JSON.parse(savedSession.data);
    this.sessions[sessionId].sendMessage = sendMessage;

    return savedSession.callCount > 0;
};

/**
 * Indicate that all changes have been accepted outside of the message
 * mechanism as would usually happen when a session is starting up
 *
 * @param {unknown} sessionId unknown
 */
RemoteObjectTemplate.syncSession = function syncSession(sessionId) {
    this._getSession(sessionId);
    this.getChanges();
    this._deleteChanges();
};

/**
 * Set the current session to a session id returned from createSession()
 * Relies on a single threaded model such as node.js
 *
 * @param {unknown} sessionId unknown
 */
RemoteObjectTemplate.setSession = function setSession(sessionId) {
    this.currentSession = sessionId;
};

/**
 * Enable/Disable sending of messages and optionally provide a new callback
 *
 * @param {unknown} value boolean to enable/disable
 * @param {unknown} messageCallback optional call back function
 * @param {unknown} sessionId optional session id
 */
RemoteObjectTemplate.enableSendMessage = function enableSendMessage(value, messageCallback, sessionId) {
    var session = this._getSession(sessionId);
    session.sendMessageEnabled = value;

    if (messageCallback) {
        session.sendMessage = messageCallback;
    }
};

/**
 * Subscribe to changes and optionally establish subscription as the
 * sole recipient of remote call messages.  Change tracking is then managed
 * by the functions that follow.
 *
 * @param {unknown} role unknown
 * @param {unknown} sendMessage and optional call back for sending messages
 *
 * @returns {*} unknown
 */
RemoteObjectTemplate.subscribe = function subscribe(role) {
    var subscriptionId = this._getSession().nextSubscriptionId++;

    this._getSession().subscriptions[subscriptionId] = {
        role: role,
        log: {
            array: {},
            change: {},
            arrayDirty: {}
        }
    };

    return subscriptionId;
};

/**
 * Process a remote call message that was created and passed to the sendMessage callback
 *
 * @param {unknown} remoteCall - key/value set containing the remote call details and pending sync chnages
 * @param {unknown} subscriptionId - unknown
 * @param {unknown} restoreSessionCallback - unknown
 *
 * @returns {unknown} unknown
 */
RemoteObjectTemplate.processMessage = function processMessage(remoteCall, subscriptionId, restoreSessionCallback) {
    if (!remoteCall) {
        return;
    }

    var hadChanges = 0;
    var session = this._getSession();
    var remoteCallId = remoteCall.remoteCallId;

    switch (remoteCall.type) {
        case 'ping':

            this.logger.info({component: 'semotus', module: 'processMessage', activity: 'ping'});
            session.sendMessage({type: 'pinged', sync: true, value: null, name: null, changes: null});
            break;

        case 'sync':

            this.logger.info({component: 'semotus', module: 'processMessage', activity: 'sync'});

            // Apply any pending changes passed along as part of the call and then either
            // Call the method, sending back the result in a response message
            // or return an error response so the caller will roll back
            if (!this._applyChanges(JSON.parse(remoteCall.changes), this.role == 'client', subscriptionId)) {
                this.logger.error({component: 'semotus', module: 'processMessage', activity: 'syncError'}, 'Could not apply changes on sync message');
                this._convertArrayReferencesToChanges();
                this._deleteChanges();
                this._processQueue();
            }

            break;

        case 'call':
            if (this.memSession && this.memSession.semotus)  {
                if (!this.memSession.semotus.callStartTime) {
                    this.memSession.semotus.callStartTime = (new Date()).getTime();
                }
                else { //TODO: Why is this not an else if clause?
                    if ((this.memSession.semotus.callStartTime + this.maxCallTime) > (new Date()).getTime()) {
                        Q.delay(5000).then(function a() {
                            this.logger.warn({component: 'semotus', module: 'processMessage', activity: 'blockingCall',
                                data: {call: remoteCall.name, sequence: remoteCall.sequence}}, remoteCall.name);
                            session.sendMessage({type: 'response', sync: false, changes: '', remoteCallId: remoteCallId});
                            this._deleteChanges();
                            this._processQueue();
                        }.bind(this));

                        break;
                    }
                }
            }

            var callContext = {retries: 0, startTime: new Date()};

            return processCall.call(this);

        case 'response':
        case 'error':
            var doProcessQueue = true;

            this.logger.info({component: 'semotus', module: 'processMessage', activity: remoteCall.type,
                data: {call: remoteCall.name, sequence: remoteCall.sequence}});

            // If we are out of sync queue up a set Root if on server.  This could occur
            // if a session is restored but their are pending calls
            if (!session.pendingRemoteCalls[remoteCallId]) {
                this.logger.error({component: 'semotus', module: 'processMessage', activity: remoteCall.type,
                    data: {call: remoteCall.name, sequence: remoteCall.sequence}},  'No remote call pending');
            }
            else {
                if (typeof(remoteCall.sync) !== 'undefined') {
                    if (remoteCall.sync) {
                        if (session.pendingRemoteCalls[remoteCallId].deferred.resolve) {
                            hadChanges = this._applyChanges(JSON.parse(remoteCall.changes), true, subscriptionId);

                            if (remoteCall.type == 'error') {
                                session.pendingRemoteCalls[remoteCallId].deferred.reject(remoteCall.value);
                            }
                            else {
                                session.pendingRemoteCalls[remoteCallId].deferred.resolve(this._fromTransport(JSON.parse(remoteCall.value)));
                            }
                        }
                    }
                    else {
                        this._rollbackChanges();
                        session.pendingRemoteCalls[remoteCallId].deferred.reject({code: 'internal_error_rollback', text:'An internal error occured'});

                        if (this.role == 'client') {// client.js in amorphic will take care of this
                            doProcessQueue = false;
                        }
                    }
                }

                delete session.pendingRemoteCalls[remoteCallId];
            }

            if (doProcessQueue) {
                this._processQueue();
            }

            return hadChanges == 2;
    }


    function logTime() {
        return ((new Date()).getTime() - callContext.startTime.getTime());
    }

    /**
     * We process the call the remote method in stages starting by letting the controller examine the
     * changes (preCallHook) and giving it a chance to refresh data if it needs to.  Then we apply any
     * changes in the messages and give the object owning the method a chance to validate that the
     * call is valid and take care of any authorization concerns.  Finally we let the controller perform
     * any post-call processing such as commiting data and then we deal with a failure or success.
     *
     * @param {unknown} forceupdate unknown
     *
     * @returns {unknown} unknown
     */
    function processCall(forceupdate) {
        return Q(forceupdate)
            .then(preCallHook.bind(this))
            .then(applyChangesAndValidateCall.bind(this))
            .then(callIfValid.bind(this))
            .then(postCallHook.bind(this))
            .then(postCallSuccess.bind(this))
            .fail(postCallFailure.bind(this));
    }

    /**
     * If there is an update conflict we want to retry after restoring the session
     *
     * @returns {*} unknown
     */
    function retryCall() {
        if (restoreSessionCallback) {
            restoreSessionCallback();
        }

        return processCall.call(this, true);
    }

    /**
     * Determine what objects changed and pass this to the preServerCall method on the controller
     *
     * @param {unknown} forceupdate unknown
     *
     * @returns {unknown} unknown
     */
    function preCallHook(forceupdate) {
        this.logger.info({component: 'semotus', module: 'processMessage', activity: 'preServerCall',
            data:{call: remoteCall.name, sequence: remoteCall.sequence}}, remoteCall.name);

        if (this.controller && this.controller['preServerCall']) {
            var changes = {};

            for (var objId in JSON.parse(remoteCall.changes)) {
                changes[this.__dictionary__[objId.replace(/[^-]*-/, '').replace(/-.*/, '')].__name__] = true;
            }

            return this.controller['preServerCall'].call(this.controller, remoteCall.changes.length > 2, changes, callContext, forceupdate);
        }
        else {
            return true;
        }
    }

    /**
     * Apply changes in the message and then validate the call.  Throw "Sync Error" if changes can't be applied
     *
     * @returns {unknown} unknown
     */
    function applyChangesAndValidateCall() {
        this.logger.info({component: 'semotus', module: 'processMessage', activity: 'call',
            data:{call: remoteCall.name, sequence: remoteCall.sequence, remoteCallId: remoteCall.id}}, remoteCall.name);

        if (this._applyChanges(JSON.parse(remoteCall.changes), this.role == 'client', subscriptionId)) {
            var obj = session.objects[remoteCall.id];

            if (!obj) {
                throw new Error('Cannot find object for remote call ' + remoteCall.id);
            }

            if (this.role == 'server' && obj['validateServerCall']) {
                return obj['validateServerCall'].call(obj, remoteCall.name, callContext);
            }
            else {
                return true;
            }
        }
        else {
            throw 'Sync Error';
        }
    }

    /**
     * If the changes could be applied and the validation was successful call the method
     *
     * @param {unknown} isValid unknown
     *
     * @returns {unknown} unknown
     */
    function callIfValid(isValid) {
        if (!isValid) {
            throw new Error(remoteCall.name + ' refused');
        }

        var obj = session.objects[remoteCall.id];
        var arguments = this._fromTransport(JSON.parse(remoteCall.arguments));

        return obj[remoteCall.name].apply(obj, arguments);
    }

    /**
     * Let the controller know that the method was completed and give it a chance to commit changes
     *
     * @param {unknown} returnValue unknown
     *
     * @returns {unknown} unknown
     */
    function postCallHook(returnValue) {
        if (this.controller && this.controller['postServerCall']) {
            return Q(this.controller['postServerCall'].call(this.controller, remoteCall.changes.length > 2, callContext))
                .then(function u() {
                    return returnValue;
                });
        }
        else {
            return returnValue;
        }
    }

    /**
     * Package up any changes resulting from the execution and send them back in the message, clearing
     * our change queue to accumulate more changes for the next call
     *
     * @param {unknown} ret unknown
     */
    function postCallSuccess(ret) {
        this.logger.info({component: 'semotus', module: 'processMessage', activity: 'postCall.success',
            data: {call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}}, remoteCall.name);

        packageChanges.call(this, {type: 'response', sync: true, value: JSON.stringify(this._toTransport(ret)),
            name: remoteCall.name,  remoteCallId: remoteCallId});
    }

    /**
     * Handle errors by returning an apropriate message.  In all cases changes sent back though they
     *
     * @param {unknown} err unknown
     *
     * @returns {unknown} unknown
     */
    function postCallFailure(err) {
        if (err == 'Sync Error') {
            this.logger.error({component: 'semotus', module: 'processMessage', activity: 'postCall.syncError',
                data: {call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}}, remoteCall.name);

            packageChanges.call(this, {type: 'response', sync: false, changes: '', remoteCallId: remoteCallId});
        }
        else if (err.message == 'Update Conflict') { // Not this may be caught in the trasport (e.g. Amorphic) and retried)
            if (callContext.retries++ < 3) {
                this.logger.warn({component: 'semotus', module: 'processMessage', activity: 'postCall.updateConflict',
                    data: {call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}}, remoteCall.name);

                return Q.delay(callContext.retries * 1000).then(retryCall.bind(this));
            }
            else {
                this.logger.error({component: 'semotus', module: 'processMessage', activity: 'postCall.updateConflict',
                    data: {call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}}, remoteCall.name);

                packageChanges.call(this, {type: 'retry', sync: false, remoteCallId: remoteCallId});
            }
        }
        else {
            if (!(err instanceof Error)) {
                this.logger.info({component: 'semotus', module: 'processMessage', activity: 'postCall.error',
                    data: {message: JSON.stringify(err), call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}}, remoteCall.name);
            }
            else {
                if (err.stack) {
                    this.logger.error({component: 'semotus', module: 'processMessage', activity: 'postCall.exception',
                            data: {message: err.message, call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}},
                        'Exception in ' + remoteCall.name + ' - ' + err.message + (' ' + err.stack));
                }
                else {
                    this.logger.error({component: 'semotus', module: 'processMessage', activity: 'postCall.exception',
                            data: {message: err.message, call: remoteCall.name, callTime: logTime(), sequence: remoteCall.sequence}},
                        'Exception in ' + remoteCall.name + ' - ' + err.message);
                }

            }

            packageChanges.call(this, {type: 'error', sync: true, value: getError.call(this, err), name: remoteCall.name, remoteCallId: remoteCallId});
        }
    }

    /**
     * Distinquish between an actual error (will throw an Error object) and a string that the application may
     * throw which is to get piped back to the caller.  For an actual error we want to log the stack trace
     *
     * @param {unknown} err unknown
     *
     * @returns {*} unknown
     */
    function getError(err) {
        if (err instanceof Error) {
            return {code: 'internal_error', text: 'An internal error occurred'};
        }
        else {
            if (typeof(err) === 'string') {
                return {message: err};
            }
            else {
                return err;
            }
        }
    }

    /**
     * Deal with changes going back to the caller
     *
     * @param {unknown} message unknown
     */
    function packageChanges(message) {
        this._convertArrayReferencesToChanges();
        message.changes = JSON.stringify(this.getChanges());

        if (this.memSession && this.memSession.semotus && this.memSession.semotus.callStartTime) {
            this.memSession.semotus.callStartTime = 0;
        }

        session.sendMessage(message);
        this._deleteChanges();
        this._processQueue();
    }
};

/**
 * Create a serialized session for amorphic recreating the session object
 * map along the way to release references to objects no longer in
 *
 * @returns {*} unknown
 */
RemoteObjectTemplate.serializeAndGarbageCollect = function serializeAndGarbageCollect() {
    var session = this._getSession();
    var idMap = {};
    var itemsBefore = count(session.objects);
    var serial =  serialize.call(this, this.controller);
    session.objects = idMap;
    var itemsAfter = count(idMap);

    this.logger.debug({component: 'semotus', module: 'serializeAndGarbageCollect', activity: 'post',
        data:  {objectsFreed: (itemsAfter - itemsBefore), sessionSizeKB: Math.floor(serial.length / 1000)}});

    return serial;

    function serialize(obj) {
        try {
            return JSON.stringify(obj, function y(key, value) {
                if (key === '__objectTemplate__' || key === 'amorphic') {
                    return null;
                }
                if (value && value.__template__ && value.__id__) {
                    if (idMap[value.__id__]) {
                        value = {__id__: value.__id__.toString()};
                    }
                    else {
                        idMap[value.__id__.toString()] = value;
                    }
                }

                return value;
            });
        }
        catch (e) {
            this.logger.error({component: 'semotus', module: 'serializeAndGarbageCollect', activity: 'post'}, 'Error serializing session ' + e.message + e.stack);
            return null;
        }
    }

    function count(idMap) {
        var ix = 0;

        _.map(idMap, function w() {
            ix++;
        });

        return ix;
    }
};

/**
 * Pick up next message (alternate interface to using a callback)
 *
 * @param {unknown} sessionId unknown
 * @param {unknown} forceMessage unknown
 *
 * @returns {*} the message or null
 */
RemoteObjectTemplate.getMessage = function getMessage(sessionId, forceMessage) {
    var session = this._getSession(sessionId);
    var message = session.remoteCalls.shift();

    if (message) {
        var remoteCallId = session.nextPendingRemoteCallId++;
        message.remoteCallId = remoteCallId;
        session.pendingRemoteCalls[remoteCallId] = message;
    }
    else if (forceMessage) {
        message = {type: 'sync', sync: true, value: null, name: null, remoteCallId: null,
            changes: JSON.stringify(this.getChanges())};
        this._deleteChanges();
    }

    return message;
};

/**
 * Clear any pending calls (needed when you expire a session)
 *
 * @param {unknown} sessionId unknown
 */
RemoteObjectTemplate.clearPendingCalls = function clearPendingCalls(sessionId) {
    var session = this._getSession(sessionId);
    session.remoteCalls = [];
};

/**
 * Pick up all messages
 *
 * @param {unknown} type unknown
 * @param {unknown} subscriptionId unknown
 *
 * @returns {[]} the messages in an array
 *
 RemoteObjectTemplate.getMessages = function(sessionId) {
    var session = this._getSession(sessionId);
    var messages = [];
    var message;
    while (message = session.remoteCalls.shift())
    {
        var remoteCallId = session.nextPendingRemoteCallId++;
        message.remoteCallId = remoteCallId;
        messages.push(message);
    }
    return messages;
}
 */
RemoteObjectTemplate.getChangeGroup = function getChangeGroup(type, subscriptionId) {
    return this._getSubscription(subscriptionId).log[type];
};

/**
 * Remove a change group from a subscription
 *
 * @param {unknown} type unknown
 * @param {unknown} subscriptionId unknown
 */
RemoteObjectTemplate.deleteChangeGroup = function deleteChangeGroup(type, subscriptionId) {
    this._getSubscription(subscriptionId).log[type] = {};
};

/**
 * Retrieve a change group from a subscription
 *
 * @param {unknown} subscriptionId unknown
 *
 * @returns {unknown} unknown
 */
RemoteObjectTemplate.getChanges = function getChanges(subscriptionId) {
    if (!this._useGettersSetters) {
        this._generateChanges();
    }

    this._convertArrayReferencesToChanges();
    var changes = this.getChangeGroup('change', subscriptionId);

    return changes;
};

/**
 * Diagnostic function to return summary of changes (lengths of change groups)
 *
 * @returns {unknown} unknown
 */
RemoteObjectTemplate.getChangeStatus = function getChangeStatus() {
    this._getSession();

    var a = 0;
    var c = 0;

    for (var subscriptionId in this.subscriptions) {
        var changes = this.getChangeGroup('change', subscriptionId);

        c += changes.length;

        var arrays = this.getChangeGroup('array', subscriptionId);

        a += arrays.length;
    }

    return a + ' arrays ' + c + ' changes ';
};

/**
 * Give an object a unique id and stash an object into the global object store
 *
 * @param {unknown} obj to be stashed
 * @param {unknown} template of object
 *
 * @returns {unknown} unknown
 *
 * @private
 */
RemoteObjectTemplate._stashObject = function stashObject(obj, template) {


    var executeInit = !!this.nextDispenseId;  // If coming from createEmptyObject

    if (!obj.__id__) {  // If this comes from a delayed sessionize call don't change the id
        var objectId = this.nextDispenseId || (this.role + '-' + template.__name__ + '-' +  this.nextObjId++);
        obj.__id__ = objectId;
    }
    this.nextDispenseId = null;

    var session =  this._getSession(undefined, true);  // May not have one if called from new
    if (!this.__transient__ && session) {
        session.objects[obj.__id__] = obj;
    }

    if (obj.__id__.match(/^client.*?-([0-9]*)$/)) {
        this.maxClientSequence = Math.max(this.maxClientSequence, RegExp.$1);
    }

    return executeInit;
};

/**
 * Place an object within the current session by
 * a) populating  the objects __objectTemplate__ property
 * b) processing any pending array references
 * c) processing any pending changes
 * d) sessionizing any referenced objects
 * e) injecting amorphicate into the object
 * @returns {*} returns the object so you can use
 */
RemoteObjectTemplate.sessionize = function(obj, referencingObj) {
    var objectTemplate = referencingObj ? referencingObj.__objectTemplate__ : this;
    if (obj.__objectTemplate__)        {
return;
}

    if (objectTemplate) {
        obj.__objectTemplate__ = objectTemplate;
        obj.amorphic = objectTemplate;
        obj.amorphicate = RemoteObjectTemplate.sessionize.bind(objectTemplate);
        this._stashObject(obj, obj.__template__, this);
        if (obj.__pendingArrayReferences__) {
            this._referencedArray(obj);
        }
        if (obj.__pendingChanges__) {
            obj.__pendingChanges__.forEach(function (params) {
                objectTemplate._changedValue.apply(objectTemplate, params);
            });
            obj.__pendingChanges__ = undefined;
        }
        if (obj.__referencedObjects__) {
            for (var id in obj.__referencedObjects__) {
                var referencedObj = obj.__referencedObjects__[id];
                objectTemplate.sessionize(referencedObj, obj);
            }
            obj.__referencedObjects__ = undefined;
        }
        return obj;
    }
 else {
        referencingObj.__referencedObjects__ = referencingObj.__referencedObjects__ || {};
        referencingObj.__referencedObjects__[obj.__id__] = obj;
    }
    return obj;
};

RemoteObjectTemplate._injectIntoObject = function injectIntoObject(obj) {
    ObjectTemplate._injectIntoObject(obj);
};

RemoteObjectTemplate._injectIntoTemplate = function injectIntoTemplate(template) {
    ObjectTemplate._injectIntoTemplate(template);
};

/**
 * Function called to wrap a function as remote call that returns a promise
 * that is wrapped such that "this" points to the object.  This is only done
 * if this is a remote function, meaning that the role established when defining
 * the template is different than the role for RemoteObjectTemplate as a whole.
 *
 * @param {unknown} propertyName - the name of the function
 * @param {unknown} propertyValue - the function to be wrapped
 * @param {unknown} role unknown
 * @param {unknown} validate unknown
 *
 * @returns {*} - the original function or a wrapper to make a remote call
 */
RemoteObjectTemplate._setupFunction = function setupFunction(propertyName, propertyValue, role, validate) {
    /** @type {RemoteObjectTemplate} */
    var objectTemplate = this;
    var self = this;

    if (!role || role == this.role) {
        return propertyValue;
    }
    else {
        // Function wrapper it self will return a promise wrapped to setup the this pointer
        // the function body will queue a remote call to the client/server
        return function b() {

            if (this.__objectTemplate__)                {
objectTemplate = this.__objectTemplate__;
}

            if (validate && this.controller) { //TODO: make this one if statement
                if (!validate.call(this.controller)) {
                    return Q.reject('validation failure');
                }
            }

            self.logger.info({component: 'semotus', module: 'setupFunction', activity: 'pre', data: {call: propertyName}});
            var deferred = Q.defer();
            objectTemplate._queueRemoteCall(this.__id__, propertyName, deferred, arguments);

            if (self.controller && self.controller.handleRemoteError) {
                deferred.promise.originalThen = deferred.promise.then;
                var handledRejection = false;

                deferred.promise.then = function c(res, rej, not) {
                    if (rej) {
                        handledRejection = true;
                    }
                    return deferred.promise.originalThen(res, rej, not);
                };

                Q.delay(0).then(function d() {
                    if (!handledRejection) {
                        return deferred.promise.then(null, function e(error) {
                            self.controller && self.controller.handleRemoteError(error);
                            return Q(true);
                        });
                    }
                });
            }
            return deferred.promise;
        };
    }
};

/**
 * Overridden method in ObjectTemplate that creates a structure initialize a property in constructor
 * and adds any getters and setters to the property so changes can be tracked
 *
 * @param {unknown} propertyName - the name of the property
 * @param {unknown} defineProperty - the property definition as passed to ObjectTemplate
 * @param {unknown} objectProperties - the property definitions that will be hand processed
 * @param {unknown} defineProperties - the property definitions to be processed by Object.defineProperty
 *
 * @private
 */
RemoteObjectTemplate._setupProperty = function setupProperty(propertyName, defineProperty, objectProperties, defineProperties) {
    //determine whether value needs to be re-initialized in constructor
    var value = null;

    if (typeof(defineProperty.value) !== 'undefined') {
        value = defineProperty.value;
    }

    if (objectProperties) {
        if (defineProperty.isVirtual) {
            objectProperties[propertyName] = {
                init:     undefined,
                type:     defineProperty.type,
                of:       defineProperty.of,
                byValue: !(typeof(value) === 'boolean' || typeof(value) === 'number' || typeof(value) === 'string' || value == null)
            };
        }
        else {
            objectProperties[propertyName] = {
                init:     value,
                type:     defineProperty.type,
                of:       defineProperty.of,
                byValue: !(typeof(value) === 'boolean' || typeof(value) === 'number' || typeof(value) === 'string' || value == null)
            };
        }
    }

    // One property for real name which will have a getter and setter
    // and another property for the actual value __propertyname
    defineProperties[propertyName] = defineProperty;
    defineProperties['__' + propertyName] = {enumerable: false, writable: true};

    // Move user getters and setters to their own property
    if (defineProperty.get && !defineProperty.userGet && !defineProperty.definePropertyProcessed) {
        defineProperty.userGet = defineProperty.get;
        delete defineProperty.get;
    }

    if (defineProperty.set && !defineProperty.userSet && !defineProperty.definePropertyProcessed) {
        defineProperty.userSet = defineProperty.set;
        delete defineProperty.set;
    }

    defineProperty.definePropertyProcessed = true;
    var userGetter = defineProperty.userGet;
    var userSetter = defineProperty.userSet;

    // In the case where there are now getters and setters, the __prop represents
    // the original value

    // Setter
    var objectTemplate = this;

    if (this._useGettersSetters && this._manageChanges(defineProperty)) {
        var createChanges = this._createChanges(defineProperty);

        defineProperty.set = (function set() {

            // use a closure to record the property name which is not passed to the setter
            var prop = propertyName;

            return function f(value) {

                var currentObjectTemplate = this.__objectTemplate__? this.__objectTemplate__ : objectTemplate;

                // Sessionize reference if it is missing an __objectTemplate__
                if (defineProperty.type  && defineProperty.type.isObjectTemplate && value && !value.__objectTemplate__) {
                    currentObjectTemplate.sessionize(value, this);
                }
                if (defineProperty.of  &&  defineProperty.of.isObjectTemplate && value instanceof Array) {
                    value.forEach(function (value) {
                        if (!value.__objectTemplate__) {
                            currentObjectTemplate.sessionize(value, this);
                        }
                    }.bind(this));
                }

                if (userSetter) {
                    value = userSetter.call(this, value);
                }

                if (!defineProperty.isVirtual && this.__id__ && createChanges && transform(this['__' + prop]) !== transform(value)) {
                    currentObjectTemplate._changedValue(this, prop, value);

                    if (currentObjectTemplate.__changeTracking__) {
                        this.__changed__ = true;
                    }
                }

                if (!defineProperty.isVirtual) {
                    this['__' + prop] = value;
                }
            };

            function transform(data) {
                try {
                    if (defineProperty.type == String || defineProperty.type == Number || !data) {
                        return data;
                    }

                    if (defineProperty.type == Date) {
                        return data.getTime();
                    }

                    if (defineProperty.type == Array) {
                        if (defineProperty.of.isObjectTemplate) {
                            if (data.length) {
                                var digest = '';

                                for (var ix = 0; ix < data.length; ++ix) {
                                    digest += data[ix].__id__;
                                }

                                return digest;
                            }
                        }
                        else {
                            return JSON.stringify(data);
                        }
                    }
                    else if (defineProperty.type.isObjectTemplate) {
                        return data.__id__;
                    }
                    else {
                        return JSON.stringify(data);
                    }
                }
                catch (e) {
                    objectTemplate.logger.error({component: 'semotus', module: 'setter', activity: 'stingify', data: {property: prop}},
                        'caught exception trying to stringify ' + prop);
                    return data;
                }
            }
        })();

        // Getter
        defineProperty.get = (function g() {
            // use closure to record property name which is not passed to the getter
            var prop = propertyName;

           return function z() {

                var currentObjectTemplate = this.__objectTemplate__? this.__objectTemplate__ : objectTemplate;

                if (!defineProperty.isVirtual && this['__' + prop] instanceof Array) {
                    currentObjectTemplate._referencedArray(this, prop, this['__' + prop]);
                }

                if (userGetter) {
                    return userGetter.call(this, this['__' + prop]);
                }
                else {
                    return this['__' + prop];
                }

            };
        })();
    }
    else if (defineProperty.userGet || defineProperty.userSet) {
        defineProperty.set = (function h() {
            // use a closure to record the property name which is not passed to the setter
            var prop = propertyName;

            return function i(value) {

                if (userSetter) {
                    value = userSetter.call(this, value);
                }

                if (!defineProperty.isVirtual) {
                    this['__' + prop] = value;
                }
            };
        })();

        defineProperty.get = (function j() {
            // Use closure to record property name which is not passed to the getter
            var prop = propertyName;

            return function k() {

                if (userGetter) {
                    if (defineProperty.isVirtual) {
                        return userGetter.call(this, undefined);
                    }

                    return userGetter.call(this, this['__' + prop]);
                }
                else {
                    return this['__' + prop];
                }
            };
        })();

        if (!defineProperty.isVirtual) {
            defineProperties['__' + propertyName] = {enumerable: false, writable: true};
        }

        delete defineProperty.value;
        delete defineProperty.writable;
    }
    else {
        if (objectProperties) {
            objectProperties['__' + propertyName] = objectProperties[propertyName];
        }
    }

    // Setters and Getters cannot have value or be writable
    if (this._useGettersSetters && this._manageChanges(defineProperty)) {
        delete defineProperty.value;
        delete defineProperty.writable;
    }
};

/**
 * Disable change tracking for duration of synchronous processing callback
 *
 * @param {unknown} cb unknown
 */
RemoteObjectTemplate.withoutChangeTracking = function withoutChangeTracking(cb) {
    var prevChangeTracking = this.__changeTracking__;
    this.__changeTracking__ = false;
    cb();
    this.__changeTracking__ = prevChangeTracking;
};

/**
 * Determine whether changes need to be created for a property
 *
 * @param {unknown} defineProperty unknown
 * @param {unknown} template unknown
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
RemoteObjectTemplate._createChanges = function createChanges(defineProperty, template) {
    template = template || {};

    return !((defineProperty.isLocal == true) ||
    (defineProperty.toServer == false && this.role == 'client') ||
    (defineProperty.toClient == false && this.role == 'server') ||
    (template.__toServer__ == false && this.role == 'client') ||
    (template.__toClient__ == false && this.role == 'server'));
};

/**
 * Determine whether changes should be accepted for a property
 *
 * @param {unknown} defineProperty unknown
 * @param {unknown} template unknown
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
RemoteObjectTemplate._acceptChanges = function acceptChanges(defineProperty, template) {
    template = template || {};
    return !((defineProperty.isLocal == true) ||
    (defineProperty.toServer == false && this.role == 'server') ||
    (defineProperty.toClient == false && this.role == 'client') ||
    (template.__toServer__ == false && this.role == 'server') ||
    (template.__toClient__ == false && this.role == 'client'));
};

/**
 * Determine whether any tracking of old values is needed
 * @param {unknown} defineProperty unknown
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
RemoteObjectTemplate._manageChanges = function manageChanges(defineProperty) {
    return !(defineProperty.isLocal == true || (defineProperty.toServer == false && defineProperty.toClient == false));
};

/**************************** Change Management Functions **********************************/

RemoteObjectTemplate._generateChanges = function generateChanges() {
    var session = this._getSession();

    for (var obj in session.objects) {
        this._logChanges(session.objects[obj]);
    }
};

/**
 * Simulate getters and setters by tracking the old value and if it
 * has changed, creating a change log.  local properties are ignored
 * and properties not to be transmitted to the other party do not
 * generate changes but still track the old value so that changes
 * can be applied from the other party
 *
 * @param {unknown} obj - object to be processed
 *
 * @private
 */
RemoteObjectTemplate._logChanges = function logChanges(obj) {
    // Go through all the properties and transfer them to newly created object
    var props = obj.__template__.getProperties();

    for (var prop in props) {
        var defineProperty = props[prop];
        var type = defineProperty.type;

        if (type && this._manageChanges(defineProperty)) {
            var createChanges = this._createChanges(defineProperty, obj.__template__);

            if (type == Array) {
                if (createChanges) {
                    if (obj['__' + prop] && !obj[prop]) {
                        // switch to null treated like a property change
                        this._changedValue(obj, prop, obj[prop]);
                    }
                    else if (obj[prop]) {
                        // switch from null like an array ref where array will be created
                        if (!obj['__' + prop]) {
                            if (obj[prop].length == 0) { // switch to empty array
                                this._changedValue(obj, prop, obj[prop]);
                            }

                            obj['__' + prop] = []; // Start from scratch
                        }

                        this._referencedArray(obj, prop, obj['__' + prop]);
                    }
                }
            }
            else {
                var currValue = this._convertValue(obj[prop]);
                var prevValue = this._convertValue(obj['__' + prop]);

                if (createChanges && currValue !== prevValue) {
                    this._changedValue(obj, prop, obj[prop]);
                }

                obj['__' + prop] = obj[prop];
            }
        }
    }
};

/**
 * Called from a setter when a value has changed. Record old and new values
 * changes are accumulated for each change subscriber.
 * The change structure in the subscription log is a key/value store
 * where the key is the object and id and the value is an array
 * - the first position in the array is the old value
 * - and the second is the new value
 * Note that objects created with RemoteObjectTemplate have and id and that
 * only the id is stored
 *
 * @param {unknown} obj the object instance
 * @param {unknown} prop the object property
 * @param {unknown} value the new value
 *
 * @private
 */
RemoteObjectTemplate._changedValue = function changedValue(obj, prop, value) {
    if (obj.__transient__ || this.__transient__ ||
        (this.role == 'client' && obj.__template__.__toServer__ == false) ||
        (this.role == 'server' && obj.__template__.__toClient__ == false)) {
        return;
    }

    var subscriptions = this._getSubscriptions();
    if (!subscriptions) {
        obj.__pendingChanges__ = obj.__pendingChanges__ || [];
        obj.__pendingChanges__.push([obj, prop, value]);
        return;
    }

    for (var subscription in subscriptions) {
        if (subscriptions[subscription] != this.processingSubscription) {
            var changeGroup = this.getChangeGroup('change', subscription);

            // Get normalized values substituting ids for ObjectTemplate objects
            var newValue = this._convertValue(value);
            var oldValue = this._convertValue(obj['__' + prop]);

            // Create a new key in the change group if needed
            if (!changeGroup[obj.__id__]) {
                changeGroup[obj.__id__] = {};
            }

            // For subsequent changes to the same element only store the new value and leave
            // the original old value intact
            if (changeGroup[obj.__id__][prop]) {
                changeGroup[obj.__id__][prop][1] = newValue;
            }
            else {
                changeGroup[obj.__id__][prop] = [oldValue, newValue];
            }
        }
    }
};

/**
 * Called from a getter when an array is referenced.  The value is tracked
 * so that it can be later determined if an actual change occurred.
 * The array change group is a key/value store where the key is the
 * array reference identifier <object-id>/<property-name> and the value
 * is the current value of the array.  Only the value at the first
 * reference is recorded.
 *
 * @param {unknown} obj the object instance
 * @param {unknown} prop the property of the object (should be an array)
 * @param {unknown} arrayRef the value returned in the reference (previous value)
 * @param {unknown} sessionId the value returned in the reference (previous value)
 *
 * @private
 */
RemoteObjectTemplate._referencedArrayWithChangeGroup = function (obj) {
 };
RemoteObjectTemplate._referencedArray = function referencedArray(obj, prop, arrayRef, sessionId) {
    if (obj.__transient__ || this.__transient__ ||
        (this.role == 'client' && obj.__template__.__toServer__ == false) ||
        (this.role == 'server' && obj.__template__.__toClient__ == false)) {
        return;
    }

    // Track this for each subscription
    var subscriptions = this._getSubscriptions(sessionId);
    if (subscriptions) { // sessionized?
        // Create the change group for array references and for dirty tracking of array references
        processSubscriptions.call(this, 'array', obj.__pendingArrayReferences__);
        if (this.__changeTracking__) {
            processSubscriptions.call(this, 'arrayDirty', obj.__pendingArrayDirtyReferences__);
        }
        obj.__pendingArrayReferences__ = undefined;
        obj.__pendingArrayDirtyReferences__ = undefined;
    }
 else {
        // Record the change group right in the object
        obj.__pendingArrayReferences__ = obj.__pendingArrayReferences__ || [];
        processChangeGroup(obj.__pendingArrayReferences__);
        obj.__pendingArrayDirtyReferences__ = obj.__pendingArrayReferences__ || [];
        processChangeGroup(obj.__pendingArrayDirtyReferences__);
    }

    // Create a change group entries either from the referenced array or from a previously saved copy of the array
    function processSubscriptions(changeType, existingChangeGroup) {
        for (var subscription in subscriptions) {
            var changeGroup = this.getChangeGroup(changeType, subscription);
            if (subscriptions[subscription] != this.processingSubscription) {
                if (existingChangeGroup) {
                    copyChangeGroup(changeGroup, existingChangeGroup);
                }
 else {
                    processChangeGroup(changeGroup);
                }
            }
        }
    }

    function copyChangeGroup(changeGroup, existingChangeGroup) {
        for (var key in existingChangeGroup) {
            changeGroup[key] = existingChangeGroup[key];
        }
    }

    function processChangeGroup(changeGroup) {
        var key = obj.__id__ + '/' + prop;

        // Only record the value on the first reference
        if (!changeGroup[key]) {
            var old = [];

            // Walk through the array and grab the reference
            if (arrayRef) {
                for (var ix = 0; ix < arrayRef.length; ++ix) {
                    var elem = arrayRef[ix];

                    if (typeof(elem) !== 'undefined' && elem != null) {
                        if (elem != null && elem.__id__) {
                            old[ix] = elem.__id__;
                        }
                        else { // values start with an = to distinguish from ids
                            old[ix] = '=' + JSON.stringify(elem);
                        }
                    }
                }
            }

            changeGroup[key] = old;
        }
    }
};

/**
 * Determine whether each array reference was an actual change or just a reference
 * If an actual change convert to a change log entry.  For arrays the changes
 * structure in the subscription log is the old and new value of the entire array
 *
 * @private
 */
RemoteObjectTemplate._convertArrayReferencesToChanges = function convertArrayReferencesToChanges() {
    var session = this._getSession();
    var subscriptions = this._getSubscriptions();

    for (var subscription in subscriptions) {
        if (subscriptions[subscription] != this.processingSubscription) {
            var changeGroup = this.getChangeGroup('change', subscription);
            var refChangeGroup = this.getChangeGroup('array', subscription);

            // Look at every array reference
            for (var key in refChangeGroup) {

                // split the key into an id and property name
                var param = key.split('/');
                var id = param[0];
                var prop = param[1];

                // Get the current and original (at time of reference) values
                var obj = session.objects[id];

                if (!obj) {
                    continue;
                }

                var curr;

                if (this._useGettersSetters) {
                    curr = obj['__' + prop];
                }
                else {
                    curr = obj[prop];
                }

                var orig = refChangeGroup[key];

                if (!curr) {
                    curr = [];
                }

                if (!orig) {
                    orig = [];
                }

                // Walk through all elements (which ever is longer, original or new)
                var len = Math.max(curr.length, orig.length);

                for (var ix = 0; ix < len; ++ix) {
                    // See if the value has changed
                    var currValue = undefined;

                    if (typeof(curr[ix]) !== 'undefined' && curr[ix] != null) {
                        currValue = curr[ix].__id__ || ('=' + JSON.stringify(curr[ix]));
                    }

                    var origValue = orig[ix];

                    if (origValue !== currValue || (changeGroup[obj.__id__] && changeGroup[obj.__id__][prop] && changeGroup[obj.__id__][prop][1][ix] != currValue)) {

                        // Create a new change group key if needed
                        if (!changeGroup[obj.__id__]) {
                            changeGroup[obj.__id__] = {};
                        }

                        // If this is a subsequent change just replace the new value
                        if (changeGroup[obj.__id__][prop]) {
                            if (changeGroup[obj.__id__][prop][1] instanceof Array) { // whole array could be getting null
                                changeGroup[obj.__id__][prop][1][ix] = currValue;
                            }
                        }
                        else {
                            // Create an old and new value array with identical values and then
                            // substitute the one changed value in the appropriate position
                            var values = this._convertValue(orig);
                            changeGroup[obj.__id__][prop] = [this.clone(values), this.clone(values)];
                            changeGroup[obj.__id__][prop][1][ix] = currValue;
                        }
                        if (curr[ix] && curr[ix].__id__ && !curr[ix].__objectTemplate__) {
                            this.sessionize(curr[ix], obj);
                        }
                    }

                    // Update previous value since change has been recorded
                    if (!this._useGettersSetters) {
                        if (!obj['__' + prop]) {
                            obj['__' + prop] = [];
                        }

                        obj['__' + prop][ix] = obj[prop][ix];
                    }
                }
            }
            this.deleteChangeGroup('arrayDirty', subscription);
            this.deleteChangeGroup('array', subscription);
        }
    }
};

/**
 * Determine whether each array reference was an actual change or just a reference
 * If an actual change set __changed__
 */
RemoteObjectTemplate.MarkChangedArrayReferences = function MarkChangedArrayReferences() {
    var session = this._getSession();
    var subscriptions = this._getSubscriptions();

    for (var subscription in subscriptions) {
        if (subscriptions[subscription] != this.processingSubscription) {
            var refChangeGroup = this.getChangeGroup('arrayDirty', subscription);

            // Look at every array reference
            for (var key in refChangeGroup) {

                // split the key into an id and property name
                var param = key.split('/');
                var id = param[0];
                var prop = param[1];

                // Get the current and original (at time of reference) values
                var obj = session.objects[id];

                if (!obj) {
                    continue;
                }

                var curr;

                if (this._useGettersSetters) {
                    curr = obj['__' + prop];
                }
                else {
                    curr = obj[prop];
                }

                var orig = refChangeGroup[key];

                if (!curr) {
                    curr = [];
                }

                if (!orig) {
                    orig = [];
                }

                // Walk through all elements (which ever is longer, original or new)
                var len = Math.max(curr.length, orig.length);

                for (var ix = 0; ix < len; ++ix) {
                    // See if the value has changed
                    var currValue =  undefined;

                    if (typeof(curr[ix]) !== 'undefined' && curr[ix] != null) {
                        currValue = curr[ix].__id__ || ('=' + JSON.stringify(curr[ix]));
                    }

                    var origValue = orig[ix];

                    if (origValue !== currValue) {
                        obj.__changed__ = true;
                    }
                }
            }
        }
    }
};

/**
 * Convert property value to suitabile change format which is always a string
 * ObjectTemplate objects always represented by their id
 *
 * @param {Object} value unknown
 *
 * @returns {String} or Array of Strings
 *
 * @private
 */
RemoteObjectTemplate._convertValue = function convertValue(value) {
    if (value instanceof Array) {
        var newValue = [];

        for (var ix = 0; ix < value.length; ++ix) {
            if (value[ix]) {
                if (typeof(value[ix]) === 'object') {
                    newValue[ix] = value[ix].__id__ || JSON.stringify(value[ix]);
                }
                else {
                    newValue[ix] = value[ix].__id__ || value[ix].toString();
                }
            }
            else {
                newValue[ix] = null;
            }
        }

        return newValue;
    }
    else if (value && value.__id__) {
        return value.__id__;
    }
    else if (value instanceof Date) {
        return value.getTime();
    }
    else if (typeof (value) == 'number' && isNaN(value)) {
        return null;
    } else {
        if (value) {
            if (typeof(value) === 'object') {
                return JSON.stringify(value);
            }

            return value.toString();
        }

        return value;
    }
};

/**
 * Purpose unknown
 *
 * @param {unknown} objId unknown
 * @param {unknown} template unknown
 *
 * @returns {unknown}
 */
RemoteObjectTemplate.getObject = function getObject(objId, template) {
    var session = this._getSession();
    var obj = session.objects[objId];

    if (obj && obj.__template__ && obj.__template__ == template) {
        return obj;
    }

    return null;
};

/**
 * Apply changes across all objects
 *
 * @param {unknown} changes a property for each object changed with the details of the change
 * @param {unknown} force if true changes will be accepted without rolling back
 * @param {unknown} subscriptionId optional subscription id for changes
 *
 * @returns {Number}   0 - whether a rollback had to be done
 *                    1 - no objects processed
 *                    2 - objects processed
 * @private
 */
RemoteObjectTemplate._applyChanges = function applyChanges(changes, force, subscriptionId) {
    var session = this._getSession();
    var rollback = [];

    this.processingSubscription = this._getSubscription(subscriptionId);

    // Walk through change queue looking for objects and applying new values or rolling back
    // if previous values don't match what changer things they are
    this.changeCount = 0;
    this.changeString = {};

    var hasObjects = false;

    for (var objId in changes) {
        var obj = session.objects[objId];

        if (obj) {
            hasObjects = true;
        }

        // If no reference derive template for object ID
        if (!obj) {
            var template = this.__dictionary__[objId.replace(/[^-]*-/, '').replace(/-.*/, '')];

            if (template) {
                force = true;
                obj = this._createEmptyObject(template, objId);
            }
            else {
                this.logger.error({component: 'semotus', module: 'applyChanges', activity: 'processing'}, 'Could not find template for ' + objId);
            }
        }

        if (this.role === 'server') {
            var validator = obj && (obj['validateServerIncomingObject'] || this.controller['validateServerIncomingObject']);
    
            var validatorThis;
    
            if (obj && obj['validateServerIncomingObject']) {
                validatorThis = obj;
            }
            else {
                validatorThis = this.controller;
            }
    
            if (validator) {
                validator.call(validatorThis, obj);
            }
        }

        if (!obj || !this._applyObjectChanges(changes, rollback, obj, force)) {
            this.processingSubscription = false;
            this._rollback(rollback);
            this._deleteChanges();
            this.logger.error({component: 'semotus', module: 'applyChanges', activity: 'processing'}, 'Could not apply changes to ' + objId);
            this.changeString = {};
            return 0;
        }
    }

    /*  We used to delete changes but this means that changes while a message is processed
     is effectively lost.  Now we just don't record changes while processing.
     this._deleteChanges();
     */
    this.processingSubscription = null;
    this.logger.debug({component: 'semotus', module: 'applyChanges', activity: 'dataLogging', data:{count: this.changeCount, values: this.changeString}});

    if (hasObjects) {
        return 2;
    }

    return 1;
};

/**
 * Apply changes for a specific object
 *
 * @param {unknown} changes all changes
 * @param {unknown} rollback an array of changes that would have to be rolled back
 * @param {unknown} obj the object instance that was changed
 * @param {unknown} force whether changes can be rolled back
 *
 * @returns {Boolean} whether a rollback needs to be done
 *
 * @private
 */
RemoteObjectTemplate._applyObjectChanges = function applyObjectChanges(changes, rollback, obj, force) {
    // Go through each recorded change which is a pair of old and new values
    for (var prop in changes[obj.__id__]) {
        var change = changes[obj.__id__][prop];
        var oldValue = change[0];
        var newValue = change[1];
        var defineProperty = this._getDefineProperty(prop, obj.__template__);

        if (!defineProperty) {
            this.logger.error({component: 'semotus', module: 'applyObjectChanges', activity: 'processing', data:{template: obj.__template__.__name__, property: prop}},
                'Could not apply change to ' + obj.__template__.__name__ + '.' + prop + ' property not defined in template');

            return false;

        }

        if (defineProperty.type === Array) {
            if (newValue instanceof Array) {
                if (!(obj[prop] instanceof Array)) {
                    obj[prop] = [];
                    obj.__tainted__ = true;
                }

                var length;

                if (oldValue) {
                    length = Math.max(newValue.length, oldValue.length);
                }
                else {
                    length = Math.max(newValue.length, 0);
                }

                for (var ix = 0; ix < length; ++ix) {
                    var unarray_newValue = unarray(newValue[ix]);
                    var validator = obj && (obj['validateServerIncomingProperty'] || this.controller['validateServerIncomingProperty']);

                    var validatorThis;

                    if (obj && obj['validateServerIncomingProperty']) {
                        validatorThis = obj;
                    }
                    else {
                        validatorThis = this.controller;
                    }

                    if (validator) {
                        validator.call(validatorThis, obj, prop, ix, defineProperty, unarray_newValue);
                    }

                    if (oldValue) {
                        if (!this._applyPropertyChange(changes, rollback, obj, prop, ix, unarray(oldValue[ix]), unarray_newValue, force)) {
                            return false;
                        }
                    }
                    else {
                        if (!this._applyPropertyChange(changes, rollback, obj, prop, ix, null, unarray_newValue, force)) {
                            return false;
                        }
                    }
                }

                this._trimArray(obj[prop]);
            }
            else if (oldValue instanceof Array) {
                obj[prop] = null;

                if (!this._useGettersSetters) {
                    obj['__' + prop] = null;
                }

                obj.__tainted__ = true;

            }
        }
        else { //TODO: make this into one elseif
            if (!this._applyPropertyChange(changes, rollback, obj, prop, -1, oldValue, newValue, force)) {
                return false;
            }
        }
    }

    this.changeCount++;
    return true;

    function unarray(value) {
        try {
            if (value && (String(value)).substr(0, 1) == '=') {
                return JSON.parse((String(value)).substr(1));
            }

            return value;
        }
        catch (e) {
            return  '';
        }
    }
};

/**
 * Apply changes for a specific property, cascading changes in the event
 * that a reference to an object that needs to be created is part of the change
 *
 * @param {unknown} changes all changes
 * @param {unknown} rollback an array of changes that would have to be rolled back
 * @param {unknown} obj the object instance that was changed
 * @param {unknown} prop the property of that object
 * @param {unknown} ix the position of the property if the property is an array
 * @param {unknown} oldValue the old value before the change occured
 * @param {unknown} newValue the value after the change occured
 * @param {unknown} force whether changes can be rolled back
 *
 * @returns {Boolean} whether a rollback needs to be done
 *
 * @private
 */
RemoteObjectTemplate._applyPropertyChange = function applyPropertyChange(changes, rollback, obj, prop, ix, oldValue, newValue, force) {
    var session = this._getSession();

    // Get old, new and current value to determine if change is still applicable
    try {
        var currentValue;

        if (ix >= 0) {
            currentValue = obj[prop][ix];
        }
        else {
            currentValue = obj[prop];
        }
    }
    catch (e) {
        this.logger.error({component: 'semotus', module: 'applyPropertyChange', activity: 'processing'},
            'Could not apply change to ' + obj.__template__.__name__ + '.' + prop + ' based on property definition');

        return false;
    }

    // No change case
    var currentValueConverted = this._convertValue(currentValue);
    var oldValueConverted = this._convertValue(oldValue);

    if (newValue == currentValueConverted && this._useGettersSetters) { // no change
        return true;
    }

    // unidirectional properties will get out of sync on refreshes so best not to check
    var defineProperty = this._getDefineProperty(prop, obj.__template__) || {};
    var singleDirection = defineProperty.toServer === false || defineProperty.toClient === false;

    // Make sure old value that is reported matches current value
    if (!singleDirection && !force && oldValueConverted != currentValueConverted) { // conflict will have to roll back
        var conflictErrorData = {component: 'semotus', module: 'applyPropertyChange', activity: 'processing'};

        var conflictErrorString = 'Could not apply change to ' + obj.__template__.__name__ + '.' + prop +
            ' expecting ' +  this.cleanPrivateValues(prop, oldValueConverted, defineProperty) +
            ' but presently ' + this.cleanPrivateValues(prop, currentValueConverted, defineProperty);

        if (this.__conflictMode__ == 'hard') {
            this.logger.error(conflictErrorData, conflictErrorString);
            return false;
        }
        else {
            this.logger.warn(conflictErrorData, conflictErrorString);
        }
    }

    // Based on type of property we convert the value from it's string representation into
    // either a fundemental type or a templated object, creating it if needed
    if (!this._acceptChanges(defineProperty, obj.__template__)) {
        this.logger.error({component: 'semotus', module: 'applyPropertyChange', activity: 'processing'},
            'Could not accept changes to ' + obj.__template__.__name__ + '.' + prop +
            ' based on property definition');

        return false;
    }

    obj.__tainted__ = true; // Can no longer just be persisted (unless untainted)

    var type = (defineProperty.of || defineProperty.type);
    var objId = null;

    if (type == Number) {
        if (newValue == null) {
            newValue = null;
        }
        else {
            newValue = Number(newValue);
        }
    }
    else if (type == String) {} //TODO: Why? This should not be a pattern for if/else ifs
    else if (type == Boolean) {
        if (newValue == null) {
            newValue = null;
        }
        else {
            if (newValue == 'false') {
                newValue = false;
            }
            else {
                if (newValue) {
                    newValue = true;
                }
                else {
                    newValue = false;
                }
            }
        }
    }
    else if (type == Date) {
        if (newValue == null) {
            newValue = null;
        }
        else {
            newValue = new Date(newValue);
        }
    }
    else if (type == Object && newValue) {
        try {
            if (typeof(newValue) === 'string') {
                if (newValue && newValue.substr(0, 1) == '=') {
                    newValue = JSON.parse(newValue.substr(1));
                }
                else {
                    newValue = JSON.parse(newValue);
                }
            }
        }
        catch (e) {} // Just leave it as is
    }
    else if (newValue && typeof(type) === 'function') {
        objId = newValue;

        if (session.objects[objId]) {
            if ((session.objects[objId] instanceof type) || (session.objects[objId].__template__.__name__ === type.__name__)) {
                newValue = session.objects[objId];
            }
            else {
                this.logger.error({component: 'semotus', module: 'applyPropertyChange', activity: 'processing'},
                    'Could not apply change to ' + obj.__template__.__name__ + '.' + prop +
                    ' id (' + objId + ') is type ' + session.objects[objId].__template__.__name__);

                return false;
            }
        }
        else {
            newValue = this._createEmptyObject(type, objId, defineProperty);
            this._applyObjectChanges(changes, rollback, newValue, true);
        }
    }

    // Assign to property as scalar or array value
    // For non-setter change tracking we don't want this to be viewed as a change
    if (newValue != currentValue || !this._useGettersSetters) {
        if (ix >= 0) {
            obj[prop][ix] = newValue;

            if (!this._useGettersSetters && this._manageChanges(defineProperty)) {
                if (!obj['__' + prop]) {
                    obj['__' + prop] = [];
                }
                obj['__' + prop][ix] = newValue;
            }

            if (this.__changeTracking__) {
                obj.__changed__ = true;
            }
        }
        else {
            obj[prop] = newValue;

            if (!this._useGettersSetters && this._manageChanges(defineProperty)) {
                obj['__' + prop] = newValue;
            }
        }
    }

    var logValue;

    if (objId) {
        logValue = '{' +  objId + '}';
    }
    else {
        if (newValue instanceof Array) {
            logValue = '[' + newValue.length + ']';
        }
        else {
            logValue = newValue;
        }
    }

    if (ix >= 0) {
        this.changeString[obj.__template__.__name__ + '[' + ix + ']' + '.' + prop] = this.cleanPrivateValues(prop, logValue, defineProperty);
    }
    else {
        this.changeString[obj.__template__.__name__ + '.' + prop] = this.cleanPrivateValues(prop, logValue, defineProperty);
    }

    rollback.push([obj, prop, ix, currentValue]);

    return true;
};

/**
 * Roll back changes accumulated as part of the application of changes
 *
 * @param {unknown} rollback - array of changes
 *
 * @private
 */
RemoteObjectTemplate._rollback = function rollback(rollback) {
    for (var ix = 0; ix < rollback.length; ++ix) {
        if (rollback[ix][2] >= 0) {
            ((rollback[ix][0])[rollback[ix][1]])[rollback[ix][2]] = rollback[ix][3];
        }
        else {
            (rollback[ix][0])[rollback[ix][1]] = rollback[ix][3];
        }
    }
};

/**
 * Roll back all changes
 *
 * @private
 */
RemoteObjectTemplate._rollbackChanges = function rollbackChanges() {
    var session = this._getSession();
    var changes = this.getChanges();

    for (var objId in changes) {
        var obj = session.objects[objId];

        if (obj) {
            // Go through each recorded change which is a pair of old and new values
            for (var prop in changes[objId]) {
                var oldValue = changes[objId][prop][0];

                if (oldValue instanceof Array) {
                    for (var ix = 0; ix < oldValue.length; ++ix) {
                        obj[prop][ix] = oldValue[0];
                    }
                }
                else {
                    obj[prop] = oldValue;
                }
            }
        }
    }

    this._deleteChanges();
};

/**
 * Create an empty object that will have properties updated as they
 * come up in applying the remaining changes.  The object is presumably
 * already in the object store. If the object already exists in the object
 * store return a reference to it
 *
 * @param {unknown} template - the ObjectTemplate template for the object
 * @param {unknown} objId - the id to be assigned
 * @param {unknown} defineProperty - the property definition from the template
 * @param {unknown} isTransient - true if not to be recorded in session
 *
 * @returns {*} - an instance of the object
 *
 * @private
 */
RemoteObjectTemplate._createEmptyObject = function createEmptyObject(template, objId, defineProperty, isTransient) {

    if (!objId) {
        throw new Error('_createEmptyObject called for ' + template.__name__ + ' without objId parameter');
    }

    if (!template.__children__) {
        throw new Error('_createEmptyObject called for incorrectly defined template ' + objId);
    }

    template = this._resolveSubClass(template, objId, defineProperty);

    var session = this._getSession();
    var sessionReference = session ? session.objects[objId] : null;
    var newValue;

    if (sessionReference && !isTransient) {
        if (sessionReference.__template__ == template) {
            newValue = sessionReference;
        }
        else {
            throw new Error('_createEmptyObject called for ' + template.__name__ +
                ' and session object with that id exists but for template ' + session.objects[objId].__template__.__name__);
        }
    }
    else {
        template.__objectTemplate__.nextDispenseId = objId;
        var wasTransient = this.__transient__;

        if (isTransient) {
            this.__transient__ = true; // prevent stashObject from adding to sessions.objects
        }

        newValue = new template();  // _stashObject will assign this.nextDispenseId if present
        this.__transient__ = wasTransient;

        if (isTransient) {
            newValue.__transient__ = true;
        }

        if (!newValue.__objectTemplate__ && this.sessions) {  //  Non-TS templates will have __objectTemplate__
            this.sessionize(newValue, {__objectTemplate__: this});
        }
    }

    if (this.role == 'client' && typeof(newValue.clientPreInit) === 'function') {
        newValue.clientPreInit.call();
    }

    if (this.role == 'server' && typeof(newValue.serverPreInit) === 'function') {
        newValue.serverPreInit.call();
    }

    return newValue;
};

/**
 * Add a function that will fire on object creation
 *
 * @param {unknown} template unknown
 * @param {unknown} injector unknown
 */
RemoteObjectTemplate.inject = function inject(template, injector) {
    template.__injections__.push(injector);
    // Go through existing objects to inject them as well
    var session = this._getSession();

    for (var obj in session.objects) {
        if (this._getBaseClass(session.objects[obj].__template__) == this._getBaseClass(template)) {
            injector.call(session.objects[obj]);
        }
    }
};

/**************************** Message Management Functions **********************************/

/**
 * Add a remote call to the queue for sequential transmission
 *
 * @param {unknown} objId - The id of the object owning the method
 * @param {unknown} functionName - the method
 * @param {unknown} deferred - A Q deferred object containing a promise
 * @param {unknown} args - arguments to the method call
 *
 * @private
 */
RemoteObjectTemplate._queueRemoteCall = function queueRemoteCall(objId, functionName, deferred, args) {
    var session = this._getSession();
    args = Array.prototype.slice.call(args); // JS arguments array not an array after all

    session.remoteCalls.push({type: 'call', name: functionName, id: objId, deferred: deferred,
        sync: true,
        arguments:   JSON.stringify(this._toTransport(args)),
        changes:     JSON.stringify(this.getChanges())});

    this._deleteChanges();
    this._processQueue();
};

/**
 * Take next message out of the queue for the session and process them
 * messages a serialized in that a response must be received before
 * the next one is sent
 *
 * @private
 */
RemoteObjectTemplate._processQueue = function processQueue() {
    var session = this._getSession();

    if (session.sendMessage && session.sendMessageEnabled) {
        var message = this.getMessage();

        if (message) {
            session.sendMessage(message);
        }
    }
};

/**
 * Converts an object into a transportable structure that is enriched with
 * type information and replaces object references with Ids.  This can only
 * be converted back once any objects are synchronized via applyChanges()
 *
 * @param {unknown} obj - the root object
 *
 * @returns {Object} - an enriched root object
 *
 * @private
 */
RemoteObjectTemplate._toTransport = function clone(obj) {
    var res = {type: null};

    // Replace references with an object that describes the type
    // and has a property for the original value
    if (obj instanceof Date) {
        res = {type: 'date', value: obj.getTime()};
    }
    else if (obj instanceof Array) {
        res = {type: 'array', value: []};

        for (var ix = 0; ix < obj.length; ++ix) {
            res.value[ix] = this._toTransport(obj[ix]);
        }
    }
    else if (typeof(obj) === 'number' || obj instanceof Number) {
        res = {type: 'number', value: Number(obj)};
    }
    else if (typeof(obj) === 'string' || obj instanceof String) {
        res = {type: 'string', value: obj.toString()};
    }
    else if (typeof(obj) === 'boolean' || obj instanceof Boolean) {
        res = {type: 'boolean', value: obj};
    }
    else if (obj instanceof Object) {
        // For objects created by RemoteObject just transport their ID
        if (obj.__id__) {
            res = {type: 'id', value: obj.__id__};
        }
        else {
            // Otherwise grab each individual property
            res = {type: 'object', value: {}};
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    res.value[prop] = this._toTransport(obj[prop]);
                }
            }
        }
    }

    return res;
};

/**
 * Restore an enriched object from its transport structure, replacing
 * object references to the real objects based on their id's
 * Important: Under no circumstances will this instantiate other than a primitive object
 *
 * @param {unknown} obj - an object produced with toTransport()
 *
 * @returns {*} - the original object
 *
 * @private
 */
RemoteObjectTemplate._fromTransport = function clone(obj) {
    var session = this._getSession();

    switch (obj.type) {
        case 'date':
            obj = new Date(obj.value);
            break;

        case 'string':
            obj = obj.value;
            break;

        case 'number':
            obj = new Number(obj.value);
            break;

        case 'boolean':
            obj = obj.value;
            break;

        case 'array':
            var obja = [];

            for (var ix = 0; ix < obj.value.length; ++ix) {
                obja[ix] = this._fromTransport(obj.value[ix]);
            }

            obj = obja;
            break;

        case 'id':
            obj = session.objects[obj.value];
            break;

        case 'object':
            var objo = {};

            for (var prop in obj.value) {
                objo[prop] = this._fromTransport(obj.value[prop]);
            }

            obj = objo;
            break;

        case null:
            obj = null;
    }

    return obj;
};

/**************************** Helper Functions **********************************/

/**
 * Remove extra positions at the end of the array to keep length correct
 *
 * @param {unknown} array unknown
 *
 * @private
 */
RemoteObjectTemplate._trimArray = function trimArray(array) {
    while (array.length > 0 && (typeof(array[array.length - 1]) === 'undefined' || array[array.length - 1] == null)) {
        array.splice(array.length - 1, 1);
    }
};

/**
 * Get the current session structure
 *
 * @returns {*} the session
 *
 * @private
 */
RemoteObjectTemplate._getSession = function getSession(_sid) {
    if (!this.currentSession) {
        return null;
    }
    return this.sessions[this.currentSession];
};

/**
 * Purpose unknown
 *
 * @param {unknown} type unknown
 *
 * @private
 */
RemoteObjectTemplate._deleteChangeGroups = function deleteChangeGroups(type) {
    for (var subscription in this._getSubscriptions()) {
        this.deleteChangeGroup(type, subscription);
    }
};

/**
 * Purpose unknown
 *
 * @param {unknown} sessionId unknown
 *
 * @returns {unknown} unknown
 *
 * @private
 */
RemoteObjectTemplate._getSubscriptions = function getSubscriptions(sessionId) {
    var subscriptions = this._getSession(sessionId);
    return  subscriptions ? subscriptions.subscriptions : null;
};

/**
 * Purpose unknown
 *
 * @private
 */
RemoteObjectTemplate._deleteChanges = function deleteChanges() {
    this._deleteChangeGroups('array');
    this._deleteChangeGroups('arrayDirty');
    this._deleteChangeGroups('change');
};

/**
 * Purpose unknown
 *
 * @param {unknown} subscriptionId unknown
 *
 * @returns {unknown} unknown
 *
 * @private
 */
RemoteObjectTemplate._getSubscription = function getSubscription(subscriptionId) {
    return this._getSession().subscriptions[subscriptionId || 0];
};

/**
 * Purpose unknown
 *
 * @param {unknown} prop unknown
 * @param {unknown} logValue unknown
 * @param {unknown} defineProperty unknown
 *
 * @returns {unknown} unknown
 */
RemoteObjectTemplate.cleanPrivateValues = function cleanPrivateValues(prop, logValue, defineProperty) {

    if (prop.match(/password|ssn|socialsecurity|pin/i) && defineProperty.logChanges != 'false') {
        return '***';
    }

    return logValue;
};

RemoteObjectTemplate.bindDecorators = function (objectTemplate) {

    objectTemplate = objectTemplate || this;

    this.supertypeClass = function (target) {

        var ret;

	    // Called by decorator processor
	    if (target.prototype) {
		    return decorator(target);
	    }

	    // Called first time with parameter rather than target - call supertypes supertypeClass function which will
        // return a function that must be called on the 2nd pass when we have a target.  It will remember parameter
	    var ret = ObjectTemplate.supertypeClass(target, objectTemplate);
	    return decorator; // decorator will be called 2nd time with ret as a closure

        // Decorator workerbee
        function decorator(target) {

            // second time we must call the function returned the first time because it has the
            // properties as a closure
            ret =  ret ? ret(target, objectTemplate) : ObjectTemplate.supertypeClass(target, objectTemplate);

            // Mainly for peristor properties to make sure they get transported
            target.createProperty = function (propertyName, defineProperty) {
                if (defineProperty.body) {
                    target.prototype[propertyName] = objectTemplate._setupFunction(propertyName, defineProperty.body,
                        defineProperty.on, defineProperty.validate);
                }
                else {
                    target.prototype.__amorphicprops__[propertyName] = defineProperty;
                    var value = defineProperty.value;
                    // The getter actually initializes the property
                    defineProperty.get = function () {
                        if (!this['__' + propertyName]) {
                            this['__' + propertyName] =
                                ObjectTemplate.clone(value, defineProperty.of || defineProperty.type || null);
                        }
                        return this['__' + propertyName];
                    };
                    var defineProperties = {};
                    objectTemplate._setupProperty(propertyName, defineProperty, undefined, defineProperties);
                    Object.defineProperties(target.prototype, defineProperties);
                }
            };
            return ret;
        }
    };

    this.Supertype = function () {
        return ObjectTemplate.Supertype.call(this, objectTemplate);
    };
    this.Supertype.prototype = ObjectTemplate.Supertype.prototype;

    this.property = function (props) {
        props = props || {};
        var baseDecorator = ObjectTemplate.property(props, objectTemplate);
        return function (target, targetKey) {
            baseDecorator(target, targetKey);
            var defineProperties = {};
            props.enumerable = true;
            props.writable = true;
            objectTemplate._setupProperty(targetKey, props, undefined, defineProperties);
            Object.defineProperties(target, defineProperties);
        };
    };

    this.remote = function (defineProperty) {
        defineProperty = defineProperty || {};
        if (!defineProperty.on) {
            defineProperty.on = 'server';
        }
        return function (target, propertyName, descriptor) {
            descriptor.value  = objectTemplate._setupFunction(propertyName, descriptor.value,
                defineProperty.on, defineProperty.validate);
            if (defineProperty.type) {
                descriptor.value.__returns__ = defineProperty.type;
            }
            if (defineProperty.of) {
                descriptor.value.__returns__ = defineProperty.of;
                descriptor.value.__returnsarray__ = true;
            }
        };
    };
};

// These two mixins and extender functions are needed because in the browser we only include supertype and semotus
// and since classes use these in their extends hierarchy they must be defined.

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({__proto__: []} instanceof Array && function (d, b) {
            d.__proto__ = b;
        }) ||
        function (d, b) {
            for (var p in b) {
                if (b.hasOwnProperty(p)) {
                    d[p] = b[p];
                }
            }
        };
    return function (d, b) {
        extendStatics(d, b);
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();

RemoteObjectTemplate.Persistable = function (Base) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return class_1;
    }(Base));
};
RemoteObjectTemplate.Remoteable = function (Base) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return class_1;
    }(Base));
};
RemoteObjectTemplate.Bindable = function (Base) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return class_1;
    }(Base));
};

RemoteObjectTemplate.bindDecorators(); //Default to binding to yourself

return RemoteObjectTemplate;

}));
