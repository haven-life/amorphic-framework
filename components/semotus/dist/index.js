"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var decorators_1 = require("./decorators");
var setupExtends_1 = require("./setupExtends");
var Sessions = require("./helpers/Sessions");
var Subscriptions = require("./helpers/Subscriptions");
var Utilities_1 = require("./helpers/Utilities");
var Changes = require("./helpers/Changes");
var ChangeGroups = require("./helpers/ChangeGroups");
var ProcessCall_1 = require("./helpers/ProcessCall");
// @TODO: Check if we attach Promise as a keyword in the webpack build
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['underscore', '@havenlife/supertype'], factory);
    }
    else if (typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('@havenlife/supertype'));
    }
    else {
        root.RemoteObjectTemplate = factory(root._, root.ObjectTemplate);
    }
})(this, function (_, SupertypeModule) {
    'use strict';
    var ObjectTemplate = SupertypeModule.default;
    var RemoteObjectTemplate = ObjectTemplate._createObject();
    RemoteObjectTemplate._useGettersSetters = typeof window === 'undefined';
    RemoteObjectTemplate.role = 'client';
    if (typeof window === 'undefined') {
        RemoteObjectTemplate.role = 'server';
    }
    RemoteObjectTemplate.__changeTracking__ = true; // Set __changed__ when setter fires
    RemoteObjectTemplate.__conflictMode__ = 'hard';
    /**************************** Public Interface **********************************/
    RemoteObjectTemplate.logLevel = 0;
    RemoteObjectTemplate.maxClientSequence = 1;
    RemoteObjectTemplate.nextObjId = 1;
    /**
     * @TODELETE
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
        var time = t.getFullYear() +
            '-' +
            (t.getMonth() + 1) +
            '-' +
            t.getDate() +
            ' ' +
            t.toTimeString().replace(/ .*/, '') +
            ':' +
            t.getMilliseconds();
        var message = time + '(' + this.currentSession + extraID + ') ' + 'RemoteObjectTemplate:' + data;
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
        return Sessions.create(this, role, sendMessage, sessionId);
    };
    /**
     * Remove the session from the sessions map, rejecting any outstanding promises
     *
     * @param {unknown} sessionId unknown
     */
    RemoteObjectTemplate.deleteSession = function deleteSession(sessionId) {
        return Sessions.remove(this, sessionId);
    };
    /**
     * After resynchronizing sessions we need to set a new sequence number to be used in
     * new objects to avoid conflicts with any existing ones the remote session may have
     *
     * @param {unknown} nextObjId unknown
     */
    RemoteObjectTemplate.setMinimumSequence = function setMinimumSequence(nextObjId) {
        var session = Sessions.get(this);
        session.nextObjId = Math.max(nextObjId, session.nextObjId);
    };
    /**
     * Save the session data in a way that can be serialized/de-serialized
     *
     * @param {unknown} sessionId unknown
     *
     * @returns {Object} unknown
     */
    RemoteObjectTemplate.saveSession = function saveSession(sessionId) {
        return Sessions.save(this, sessionId);
    };
    /**
     * A public function to determine whether there are remote calls in progress
     *
     * @param {String} sessionId Unique identifier from which the session is fetched.
     *
     * @returns {Number} The number of remote calls pending in the session.
     */
    RemoteObjectTemplate.getPendingCallCount = function getPendingCallCount(sessionId) {
        var session = Sessions.get(this, sessionId);
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
        return Sessions.restore(this, sessionId, savedSession, sendMessage);
    };
    /**
     * Indicate that all changes have been accepted outside of the message
     * mechanism as would usually happen when a session is starting up
     *
     * @param {unknown} sessionId unknown
     */
    RemoteObjectTemplate.syncSession = function syncSession(sessionId) {
        return Sessions.sync(this, sessionId);
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
        var session = Sessions.get(this, sessionId);
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
        return Subscriptions.subscribe(this, role);
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
        var callContext;
        var hadChanges = 0;
        var session = Sessions.get(this);
        var remoteCallId = remoteCall.remoteCallId;
        switch (remoteCall.type) {
            case 'ping':
                this.logger.info({
                    component: 'semotus',
                    module: 'processMessage',
                    activity: 'ping'
                });
                session.sendMessage({ type: 'pinged', sync: true, value: null, name: null, changes: null });
                break;
            case 'sync':
                this.logger.info({ component: 'semotus', module: 'processMessage', activity: 'sync' });
                // Apply any pending changes passed along as part of the call and then either
                // Call the method, sending back the result in a response message
                // or return an error response so the caller will roll back
                if (!this._applyChanges(JSON.parse(remoteCall.changes), this.role == 'client', subscriptionId)) {
                    this.logger.error({
                        component: 'semotus',
                        module: 'processMessage',
                        activity: 'syncError'
                    }, 'Could not apply changes on sync message');
                    this._convertArrayReferencesToChanges();
                    this._deleteChanges();
                    this._processQueue();
                }
                break;
            case 'call':
                if (this.memSession && this.memSession.semotus) {
                    if (!this.memSession.semotus.callStartTime) {
                        this.memSession.semotus.callStartTime = new Date().getTime();
                    }
                    else {
                        //TODO: Why is this not an else if clause?
                        if (this.memSession.semotus.callStartTime + this.maxCallTime > new Date().getTime()) {
                            Utilities_1.delay(5000).then(function a() {
                                this.logger.warn({
                                    component: 'semotus',
                                    module: 'processMessage',
                                    activity: 'blockingCall',
                                    data: {
                                        call: remoteCall.name,
                                        sequence: remoteCall.sequence
                                    }
                                }, remoteCall.name);
                                session.sendMessage({
                                    type: 'response',
                                    sync: false,
                                    changes: '',
                                    remoteCallId: remoteCallId
                                });
                                this._deleteChanges();
                                this._processQueue();
                            }.bind(this));
                            break;
                        }
                    }
                }
                callContext = { retries: 0, startTime: new Date() };
                var payload = {
                    callContext: callContext,
                    remoteCall: remoteCall,
                    restoreSessionCallback: restoreSessionCallback,
                    semotus: this,
                    session: session,
                    subscriptionId: subscriptionId,
                    remoteCallId: remoteCallId
                };
                return ProcessCall_1.processCall(payload);
            case 'response':
            case 'error':
                var doProcessQueue = true;
                this.logger.info({
                    component: 'semotus',
                    module: 'processMessage',
                    activity: remoteCall.type,
                    data: { call: remoteCall.name, sequence: remoteCall.sequence }
                });
                // If we are out of sync queue up a set Root if on server.  This could occur
                // if a session is restored but their are pending calls
                if (!session.pendingRemoteCalls[remoteCallId]) {
                    this.logger.error({
                        component: 'semotus',
                        module: 'processMessage',
                        activity: remoteCall.type,
                        data: { call: remoteCall.name, sequence: remoteCall.sequence }
                    }, 'No remote call pending');
                }
                else {
                    if (typeof remoteCall.sync !== 'undefined') {
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
                            session.pendingRemoteCalls[remoteCallId].deferred.reject({
                                code: 'internal_error_rollback',
                                text: 'An internal error occured'
                            });
                            if (this.role == 'client') {
                                // client.js in amorphic will take care of this
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
    };
    /**
     * Create a serialized session for amorphic recreating the session object
     * map along the way to release references to objects no longer in
     *
     * @returns {*} unknown
     */
    RemoteObjectTemplate.serializeAndGarbageCollect = function serializeAndGarbageCollect() {
        var session = Sessions.get(this);
        var idMap = {};
        var objectKey = '';
        var propKey = '';
        var itemsBefore = count(session.objects);
        var serial = serialize.call(this, this.controller);
        session.objects = idMap;
        var itemsAfter = count(idMap);
        this.logger.debug({
            component: 'semotus',
            module: 'serializeAndGarbageCollect',
            activity: 'post',
            data: { objectsFreed: itemsAfter - itemsBefore, sessionSizeKB: Math.floor(serial.length / 1000) }
        });
        return serial;
        function serialize(obj) {
            try {
                return JSON.stringify(obj, function y(key, value) {
                    if (key === '__objectTemplate__' || key === 'amorphic') {
                        return null;
                    }
                    if (value && value.__template__ && value.__id__) {
                        objectKey = key;
                        if (idMap[value.__id__]) {
                            value = { __id__: value.__id__.toString() };
                        }
                        else {
                            idMap[value.__id__.toString()] = value;
                        }
                    }
                    else {
                        propKey = key;
                    }
                    return value;
                });
            }
            catch (e) {
                this.logger.error({
                    component: 'semotus',
                    module: 'serializeAndGarbageCollect',
                    activity: 'post',
                    data: { last_object_ref: objectKey, last_prop_ref: propKey }
                }, 'Error serializing session ' + e.message + e.stack);
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
        var session = Sessions.get(this, sessionId);
        var message = session.remoteCalls.shift();
        if (message) {
            var remoteCallId = session.nextPendingRemoteCallId++;
            message.remoteCallId = remoteCallId;
            session.pendingRemoteCalls[remoteCallId] = message;
        }
        else if (forceMessage) {
            message = {
                type: 'sync',
                sync: true,
                value: null,
                name: null,
                remoteCallId: null,
                changes: JSON.stringify(this.getChanges())
            };
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
        var session = Sessions.get(this, sessionId);
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
    const session = Sessions.get(this, sessionId);
    const messages = [];
    const message;
    while (message = session.remoteCalls.shift())
    {
        const remoteCallId = session.nextPendingRemoteCallId++;
        message.remoteCallId = remoteCallId;
        messages.push(message);
    }
    return messages;
}
 */
    /**
     * Retrieve a change group from a subscription
     *
     * @param {unknown} subscriptionId unknown
     *
     * @returns {unknown} unknown
     */
    RemoteObjectTemplate.getChanges = function getChanges(subscriptionId) {
        if (!this._useGettersSetters) {
            Changes.generate(this);
        }
        this._convertArrayReferencesToChanges();
        var changes = ChangeGroups.getPropChangeGroup(subscriptionId, this);
        return changes;
    };
    /**
     * Diagnostic function to return summary of changes (lengths of change groups)
     *
     * @returns {unknown} unknown
     */
    RemoteObjectTemplate.getChangeStatus = function getChangeStatus() {
        Sessions.get(this); // necessary?
        var a = 0;
        var c = 0;
        for (var subscriptionId in this.subscriptions) {
            var changes = ChangeGroups.getPropChangeGroup(subscriptionId, this);
            c += Object.keys(changes).length;
            var arrays = ChangeGroups.getArrayChangeGroup('array', subscriptionId, this);
            a += Object.keys(arrays).length;
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
        var executeInit = !!this.nextDispenseId; // If coming from createEmptyObject
        if (!obj.__id__) {
            // If this comes from a delayed sessionize call don't change the id
            var objectId = this.nextDispenseId || this.role + '-' + template.__name__ + '-' + this.nextObjId++;
            obj.__id__ = objectId;
        }
        this.nextDispenseId = null;
        var session = Sessions.get(this, undefined); // May not have one if called from new
        if (!this.__transient__ && session) {
            session.objects[obj.__id__] = obj;
        }
        if (obj.__id__.match(/^client.*?-([0-9]*)$/)) {
            // @ts-ignore
            this.maxClientSequence = Math.max(this.maxClientSequence, RegExp.$1);
            this.nextObjId = Math.max(this.maxClientSequence, this.nextObjId) + 1;
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
    RemoteObjectTemplate.sessionize = function (obj, referencingObj) {
        // Normally passed a referencingObject from which we can get an objectTemplate
        // But in the the case where the app calls sessionize the object template is bound to this
        var objectTemplate = referencingObj ? referencingObj.__objectTemplate__ : this;
        // Nothing to do if object already sessionized or object is transient (meaning no changes accumulated)
        if (obj.__objectTemplate__ || obj.__transient__) {
            return;
        }
        // If the referencing object had an object template we get to work sessionizing this object
        // and all objects it was referencing
        if (objectTemplate) {
            // Set the object properties (__objectTemplate__ means it is sessionized and
            // amorphic which was intialized with a static ObjectTemplate gets updated with the sessionized one
            // For the benefit of the app that may want to manuall sessionize we provide amorphicate
            obj.__objectTemplate__ = objectTemplate;
            obj.amorphic = objectTemplate;
            obj.amorphicate = RemoteObjectTemplate.sessionize.bind(objectTemplate);
            // Here is where the object is stored in the session
            this._stashObject(obj, obj.__template__, this);
            // Process any array references by completing the reference processing that was stashed pre-sessionization
            if (obj.__pendingArrayReferences__) {
                this._referencedArray(obj);
            }
            // Process any non-array changes that were stashed
            if (obj.__pendingChanges__) {
                obj.__pendingChanges__.forEach(function (params) {
                    objectTemplate._changedValue.apply(objectTemplate, params);
                });
                obj.__pendingChanges__ = undefined;
            }
            // Spread the love to objects that the object may have referenced
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
    RemoteObjectTemplate._setupFunction = function setupFunction(propertyName, propertyValue, role, validate, serverValidation, template) {
        /** @type {RemoteObjectTemplate} */
        var objectTemplate = this;
        var self = this;
        if (!role || role == this.role) {
            if (role === 'server') {
                propertyValue.serverValidation = serverValidation;
            }
            return propertyValue;
        }
        else {
            // Function wrapper it self will return a promise wrapped to setup the this pointer
            // the function body will queue a remote call to the client/server
            return function remoteFunctionWrapper() {
                if (this.__objectTemplate__) {
                    objectTemplate = this.__objectTemplate__;
                }
                if (validate && this.controller) {
                    //TODO: make this one if statement
                    if (!validate.call(this.controller)) {
                        return Promise.reject('validation failure');
                    }
                }
                self.logger.info({
                    component: 'semotus',
                    module: 'setupFunction',
                    activity: 'pre',
                    data: { call: propertyName }
                });
                var deferred = Utilities_1.defer();
                objectTemplate._queueRemoteCall(this.__id__, propertyName, deferred, arguments);
                if (self.controller && self.controller.handleRemoteError) {
                    deferred.promise.originalThen = deferred.promise.then;
                    var handledRejection_1 = false;
                    deferred.promise.then = function c(res, rej, not) {
                        if (rej) {
                            handledRejection_1 = true;
                        }
                        return deferred.promise.originalThen(res, rej, not);
                    };
                    Utilities_1.delay(0).then(function d() {
                        if (!handledRejection_1) {
                            return deferred.promise.then(null, function e(error) {
                                self.controller && self.controller.handleRemoteError(error);
                                return Promise.resolve(true);
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
     *
     * This triggers whenever properties are created
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
        if (typeof defineProperty.value !== 'undefined') {
            value = defineProperty.value;
        }
        if (objectProperties) {
            if (defineProperty.isVirtual) {
                objectProperties[propertyName] = {
                    init: undefined,
                    type: defineProperty.type,
                    of: defineProperty.of,
                    byValue: !(typeof value === 'boolean' ||
                        typeof value === 'number' ||
                        typeof value === 'string' ||
                        value == null)
                };
            }
            else {
                objectProperties[propertyName] = {
                    init: value,
                    type: defineProperty.type,
                    of: defineProperty.of,
                    byValue: !(typeof value === 'boolean' ||
                        typeof value === 'number' ||
                        typeof value === 'string' ||
                        value == null)
                };
            }
        }
        // One property for real name which will have a getter and setter
        // and another property for the actual value __propertyname
        defineProperties[propertyName] = defineProperty;
        defineProperties['__' + propertyName] = { enumerable: false, writable: true };
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
        if (this._useGettersSetters && Changes.manage(defineProperty)) {
            var createChanges_1 = Changes.create(defineProperty, undefined, this);
            defineProperty.set = (function set() {
                // use a closure to record the property name which is not passed to the setter
                var prop = propertyName;
                return function f(value) {
                    var currentObjectTemplate = this.__objectTemplate__ ? this.__objectTemplate__ : objectTemplate;
                    // Sessionize reference if it is missing an __objectTemplate__
                    if (defineProperty.type &&
                        defineProperty.type.isObjectTemplate &&
                        value &&
                        !value.__objectTemplate__) {
                        currentObjectTemplate.sessionize(value, this);
                    }
                    // When we assign an array go through the values and attempt to sessionize
                    if (defineProperty.of && defineProperty.of.isObjectTemplate && value instanceof Array) {
                        value.forEach(function (value) {
                            if (!value.__objectTemplate__) {
                                currentObjectTemplate.sessionize(value, this);
                            }
                        }.bind(this));
                    }
                    if (userSetter) {
                        value = userSetter.call(this, value);
                    }
                    if (!defineProperty.isVirtual &&
                        this.__id__ &&
                        createChanges_1 &&
                        transform(this['__' + prop]) !== transform(value)) {
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
                                else {
                                    return '[]';
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
                        objectTemplate.logger.error({ component: 'semotus', module: 'setter', activity: 'stingify', data: { property: prop } }, 'caught exception trying to stringify ' + prop);
                        return data;
                    }
                }
            })();
            // Getter
            defineProperty.get = (function g() {
                // use closure to record property name which is not passed to the getter
                var prop = propertyName;
                return function z() {
                    var currentObjectTemplate = this.__objectTemplate__ ? this.__objectTemplate__ : objectTemplate;
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
                defineProperties['__' + propertyName] = { enumerable: false, writable: true };
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
        if (this._useGettersSetters && Changes.manage(defineProperty)) {
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
    function objectOnClientOnly(remoteObjectTemplate, obj) {
        return remoteObjectTemplate.role == 'client' && obj.__template__.__toServer__ === false;
    }
    function objectOnServerOnly(remoteObjectTemplate, obj) {
        return remoteObjectTemplate.role == 'server' && obj.__template__.__toClient__ === false;
    }
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
        if (obj.__transient__ || objectOnClientOnly(this, obj) || objectOnServerOnly(this, obj)) {
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
                var changeGroup = ChangeGroups.getPropChangeGroup(subscription, this);
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
    RemoteObjectTemplate._referencedArray = function referencedArray(obj, prop, arrayRef, sessionId) {
        if (obj.__transient__ || objectOnClientOnly(this, obj) || objectOnServerOnly(this, obj)) { // Should not be transported
            return;
        }
        // Track this for each subscription
        var subscriptions = this._getSubscriptions(sessionId);
        if (subscriptions) {
            // sessionized?
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
        // Only array or dirty
        function processSubscriptions(changeType, existingChangeGroup) {
            for (var subscription in subscriptions) {
                var changeGroup = ChangeGroups.getArrayChangeGroup(changeType, subscription, this);
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
                        if (typeof elem !== 'undefined' && elem != null) {
                            if (elem != null && elem.__id__) {
                                old[ix] = elem.__id__;
                            }
                            else {
                                // values start with an = to distinguish from ids
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
     * @TODO: Consolidate _convertArrayReferencesToChanges with MarkArrayReferencesAsChanged
     */
    /**
     * Determine whether each array reference was an actual change or just a reference
     * If an actual change convert to a change log entry.  For arrays the changes
     * structure in the subscription log is the old and new value of the entire array
     *
     * @private
     */
    RemoteObjectTemplate._convertArrayReferencesToChanges = function convertArrayReferencesToChanges() {
        var session = Sessions.get(this);
        var subscriptions = this._getSubscriptions();
        // Iterate
        for (var subscription in subscriptions) {
            if (subscriptions[subscription] != this.processingSubscription) {
                var changeGroup = ChangeGroups.getPropChangeGroup(subscription, this);
                var refChangeGroup = ChangeGroups.getArrayChangeGroup('array', subscription, this);
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
                    var curr = void 0;
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
                    //@TODO: Double check this. Fixing this semotus bug might break other parts
                    var len = Math.max(curr.length, orig.length);
                    for (var ix = 0; ix < len; ++ix) {
                        // See if the value has changed
                        var currValue = undefined;
                        if (typeof curr[ix] !== 'undefined' && curr[ix] != null) {
                            currValue = curr[ix].__id__ || '=' + JSON.stringify(curr[ix]);
                        }
                        var origValue = orig[ix];
                        if (origValue !== currValue ||
                            (changeGroup[obj.__id__] &&
                                changeGroup[obj.__id__][prop] &&
                                changeGroup[obj.__id__][prop][1][ix] != currValue)) {
                            // Create a new change group key if needed
                            if (!changeGroup[obj.__id__]) {
                                changeGroup[obj.__id__] = {};
                            }
                            // If this is a subsequent change just replace the new value
                            if (changeGroup[obj.__id__][prop]) {
                                if (changeGroup[obj.__id__][prop][1] instanceof Array) {
                                    // whole array could be getting null
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
                ChangeGroups.remove('arrayDirty', subscription, this);
                ChangeGroups.remove('array', subscription, this);
            }
        }
    };
    /**
     * Determine whether each array reference was an actual change or just a reference
     * If an actual change set __changed__
     */
    RemoteObjectTemplate.MarkChangedArrayReferences = function MarkChangedArrayReferences() {
        var session = Sessions.get(this);
        var subscriptions = this._getSubscriptions();
        for (var subscription in subscriptions) {
            if (subscriptions[subscription] != this.processingSubscription) {
                var refChangeGroup = ChangeGroups.getArrayChangeGroup('arrayDirty', subscription, this);
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
                    var curr = void 0;
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
                        if (typeof curr[ix] !== 'undefined' && curr[ix] != null) {
                            currValue = curr[ix].__id__ || '=' + JSON.stringify(curr[ix]);
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
                    if (typeof value[ix] === 'object') {
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
        else if (typeof value === 'number' && isNaN(value)) {
            return null;
        }
        else {
            if (value) {
                if (typeof value === 'object') {
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
        var session = Sessions.get(this);
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
    RemoteObjectTemplate._applyChanges = function applyChanges(changes, force, subscriptionId, callContext) {
        var session = Sessions.get(this);
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
                    this.logger.error({ component: 'semotus', module: 'applyChanges', activity: 'processing' }, 'Could not find template for ' + objId);
                }
            }
            var passedObjectValidation = true;
            var passedPropertyValidation = true;
            if (this.role === 'server') {
                var validator = obj && (obj['validateServerIncomingObject'] || this.controller['validateServerIncomingObject']);
                var validatorThis = void 0;
                if (obj && obj['validateServerIncomingObject']) {
                    validatorThis = obj;
                }
                else {
                    validatorThis = this.controller;
                }
                if (validator) {
                    try {
                        validator.call(validatorThis, obj);
                    }
                    catch (e) {
                        passedObjectValidation = false;
                    }
                }
            }
            if (!this._applyObjectChanges(changes, rollback, obj, force)) {
                passedPropertyValidation = false;
            }
            if (!obj || !passedObjectValidation || !passedPropertyValidation) {
                this.processingSubscription = false;
                this._rollback(rollback);
                this._deleteChanges();
                this.logger.error({ component: 'semotus', module: 'applyChanges', activity: 'processing' }, 'Could not apply changes to ' + objId);
                this.changeString = {};
                return 0;
            }
        }
        var passedObjectsValidation = true;
        if (this.role === 'server' && this.controller['validateServerIncomingObjects']) {
            try {
                this.controller.validateServerIncomingObjects(changes, callContext);
            }
            catch (e) {
                passedObjectsValidation = false;
            }
        }
        if (!passedObjectsValidation) {
            this.processingSubscription = false;
            this._rollback(rollback);
            this._deleteChanges();
            this.logger.error({ component: 'semotus', module: 'applyChanges', activity: 'validateServerIncomingObjects' }, 'Flagged by controller to not process this change set.');
            this.changeString = {};
            return 0;
        }
        /*  We used to delete changes but this means that changes while a message is processed
         is effectively lost.  Now we just don't record changes while processing.
         this._deleteChanges();
         */
        this.processingSubscription = null;
        this.logger.debug({
            component: 'semotus',
            module: 'applyChanges',
            activity: 'dataLogging',
            data: { count: this.changeCount, values: this.changeString }
        });
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
                this.logger.error({
                    component: 'semotus',
                    module: 'applyObjectChanges',
                    activity: 'processing',
                    data: { template: obj.__template__.__name__, property: prop }
                }, "Could not apply change to " + obj.__template__.__name__ + "." + prop + " property not defined in template");
                return false;
            }
            if (defineProperty.type === Array) {
                if (!this._validateServerIncomingProperty(obj, prop, defineProperty, newValue)) {
                    return false;
                }
                if (newValue instanceof Array) {
                    if (!(obj[prop] instanceof Array)) {
                        obj[prop] = [];
                    }
                    if (!this._useGettersSetters && !(obj['__' + prop] instanceof Array)) {
                        obj['__' + prop] = [];
                    }
                    var length_1 = void 0;
                    if (oldValue) {
                        length_1 = Math.max(newValue.length, oldValue.length);
                    }
                    else {
                        length_1 = Math.max(newValue.length, 0);
                    }
                    for (var ix = 0; ix < length_1; ++ix) {
                        var unarray_newValue = unarray(newValue[ix]);
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
                }
            }
            else {
                if (!this._validateServerIncomingProperty(obj, prop, defineProperty, newValue)) {
                    return false;
                }
                if (!this._applyPropertyChange(changes, rollback, obj, prop, -1, oldValue, newValue, force)) {
                    return false;
                }
            }
        }
        this.changeCount++;
        return true;
        function unarray(value) {
            try {
                if (value && String(value).substr(0, 1) == '=') {
                    return JSON.parse(String(value).substr(1));
                }
                return value;
            }
            catch (e) {
                return '';
            }
        }
    };
    RemoteObjectTemplate._validateServerIncomingProperty = function (obj, prop, defineProperty, newValue) {
        var validator = obj && (obj['validateServerIncomingProperty'] || this.controller['validateServerIncomingProperty']);
        var validatorThis;
        if (obj && obj['validateServerIncomingProperty']) {
            validatorThis = obj;
        }
        else {
            validatorThis = this.controller;
        }
        if (validator) {
            try {
                validator.call(validatorThis, obj, prop, defineProperty, newValue);
            }
            catch (error) {
                return false;
            }
        }
        return true;
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
        var session = Sessions.get(this);
        var currentValue;
        // Get old, new and current value to determine if change is still applicable
        try {
            if (ix >= 0) {
                currentValue = obj[prop][ix];
            }
            else {
                currentValue = obj[prop];
            }
        }
        catch (e) {
            this.logger.error({ component: 'semotus', module: 'applyPropertyChange', activity: 'processing' }, 'Could not apply change to ' + obj.__template__.__name__ + '.' + prop + ' based on property definition');
            return false;
        }
        // No change case
        var currentValueConverted = this._convertValue(currentValue);
        var oldValueConverted = this._convertValue(oldValue);
        if (newValue == currentValueConverted && this._useGettersSetters) {
            // no change
            return true;
        }
        // unidirectional properties will get out of sync on refreshes so best not to check
        var defineProperty = this._getDefineProperty(prop, obj.__template__) || {};
        var singleDirection = defineProperty.toServer === false || defineProperty.toClient === false;
        // Make sure old value that is reported matches current value
        if (!singleDirection && !force && oldValueConverted != currentValueConverted) {
            // conflict will have to roll back
            var conflictErrorData = { component: 'semotus', module: 'applyPropertyChange', activity: 'processing' };
            var conflictErrorString = "Could not apply change to " + obj.__template__.__name__ + "." + prop + " expecting " + this.cleanPrivateValues(prop, oldValueConverted, defineProperty) + " but presently " + this.cleanPrivateValues(prop, currentValueConverted, defineProperty);
            if (this.__conflictMode__ == 'hard') {
                this.logger.error(conflictErrorData, conflictErrorString);
                return false;
            }
            else {
                this.logger.warn(conflictErrorData, conflictErrorString);
            }
        }
        // Based on type of property we convert the value from it's string representation into
        // either a fundamental type or a templated object, creating it if needed
        if (!Changes.accept(defineProperty, obj.__template__, this)) {
            this.logger.error({ component: 'semotus', module: 'applyPropertyChange', activity: 'processing' }, "Could not accept changes to " + obj.__template__.__name__ + "." + prop + " based on property definition");
            return false;
        }
        var type = defineProperty.of || defineProperty.type;
        var objId = null;
        if (type == Number) {
            if (newValue == null) {
                newValue = null;
            }
            else {
                newValue = Number(newValue);
            }
        }
        else if (type == String) {
        } //TODO: Why? This should not be a pattern for if/else ifs
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
                if (typeof newValue === 'string') {
                    if (newValue && newValue.substr(0, 1) == '=') {
                        newValue = JSON.parse(newValue.substr(1));
                    }
                    else {
                        newValue = JSON.parse(newValue);
                    }
                }
            }
            catch (e) { } // Just leave it as is
        }
        else if (newValue && typeof type === 'function') {
            objId = newValue;
            if (session.objects[objId]) {
                if (session.objects[objId] instanceof type) {
                    newValue = session.objects[objId];
                }
                else {
                    this.logger.error({ component: 'semotus', module: 'applyPropertyChange', activity: 'processing' }, "Could not apply change to " + obj.__template__.__name__ + "." + prop + " - ID (" + objId + ") is TYPE " + session.objects[objId].__template__.__name__);
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
                if (!this._useGettersSetters && Changes.manage(defineProperty)) {
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
                if (!this._useGettersSetters && Changes.manage(defineProperty)) {
                    obj['__' + prop] = newValue;
                }
            }
        }
        var logValue;
        if (objId) {
            logValue = '{' + objId + '}';
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
            this.changeString[obj.__template__.__name__ + "[" + ix + "]." + prop] = this.cleanPrivateValues(prop, logValue, defineProperty);
        }
        else {
            this.changeString[obj.__template__.__name__ + "." + prop] = this.cleanPrivateValues(prop, logValue, defineProperty);
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
                rollback[ix][0][rollback[ix][1]][rollback[ix][2]] = rollback[ix][3];
            }
            else {
                rollback[ix][0][rollback[ix][1]] = rollback[ix][3];
            }
        }
    };
    /**
     * Roll back all changes
     *
     * @private
     */
    RemoteObjectTemplate._rollbackChanges = function rollbackChanges() {
        var session = Sessions.get(this);
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
        var session = Sessions.get(this);
        var sessionReference = session ? session.objects[objId] : null;
        var newValue;
        if (sessionReference && !isTransient) {
            if (sessionReference.__template__ == template) {
                newValue = sessionReference;
            }
            else {
                throw new Error("_createEmptyObject called for " + template.__name__ + " and session object with that id exists but for template " + session.objects[objId].__template__.__name__);
            }
        }
        else {
            template.__objectTemplate__.nextDispenseId = objId;
            this.nextDispenseId = objId; /** May be redundant with previous line */
            var wasTransient = this.__transient__;
            if (isTransient) {
                this.__transient__ = true; // prevent stashObject from adding to sessions.objects
            }
            newValue = new template(); // _stashObject will assign this.nextDispenseId if present
            if (!this.__changeTracking__) {
                newValue.__changed__ = false;
            }
            this.__transient__ = wasTransient;
            if (isTransient) {
                newValue.__transient__ = true;
            }
            if (!newValue.__objectTemplate__ && this.sessions) {
                //  Non-TS templates will have __objectTemplate__
                this.sessionize(newValue, { __objectTemplate__: this });
            }
        }
        if (this.role == 'client' && typeof newValue.clientPreInit === 'function') {
            newValue.clientPreInit.call();
        }
        if (this.role == 'server' && typeof newValue.serverPreInit === 'function') {
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
        var session = Sessions.get(this);
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
        var session = Sessions.get(this);
        args = Array.prototype.slice.call(args); // JS arguments array not an array after all
        session.remoteCalls.push({
            type: 'call',
            name: functionName,
            id: objId,
            deferred: deferred,
            sync: true,
            arguments: JSON.stringify(this._toTransport(args)),
            changes: JSON.stringify(this.getChanges())
        });
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
        var session = Sessions.get(this);
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
        var res = { type: null };
        // Replace references with an object that describes the type
        // and has a property for the original value
        if (obj instanceof Date) {
            res = { type: 'date', value: obj.getTime() };
        }
        else if (obj instanceof Array) {
            res = { type: 'array', value: [] };
            for (var ix = 0; ix < obj.length; ++ix) {
                res.value[ix] = this._toTransport(obj[ix]);
            }
        }
        else if (typeof obj === 'number' || obj instanceof Number) {
            res = { type: 'number', value: Number(obj) };
        }
        else if (typeof obj === 'string' || obj instanceof String) {
            res = { type: 'string', value: obj.toString() };
        }
        else if (typeof obj === 'boolean' || obj instanceof Boolean) {
            res = { type: 'boolean', value: obj };
        }
        else if (obj instanceof Object) {
            // For objects created by RemoteObject just transport their ID
            if (obj.__id__) {
                res = { type: 'id', value: obj.__id__ };
            }
            else {
                // Otherwise grab each individual property
                res = { type: 'object', value: {} };
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
        var session = Sessions.get(this);
        switch (obj.type) {
            case 'date':
                obj = new Date(obj.value);
                break;
            case 'string':
                obj = obj.value;
                break;
            case 'number':
                obj = Number(obj.value);
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
     *
     * Helper to extract arguments from the remote call
     *
     * @param {Object} remoteCall The abstraction of a remoteCall for this flow. Has the arguments
     *
     * @returns {Object} the array of arguments from the call
     */
    RemoteObjectTemplate._extractArguments = function extractArguments(remoteCall) {
        var args = JSON.parse(remoteCall.arguments);
        return this._fromTransport(args);
    };
    /**
     * Remove extra positions at the end of the array to keep length correct
     *
     * @param {unknown} array unknown
     *
     * @private
     */
    RemoteObjectTemplate._trimArray = function trimArray(array) {
        while (array.length > 0 &&
            (typeof array[array.length - 1] === 'undefined' || array[array.length - 1] == null)) {
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
    RemoteObjectTemplate._getSession = function _getSession(sessionId) {
        return Sessions.get(this, sessionId);
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
    RemoteObjectTemplate._getSubscriptions = function _getSubscriptions(sessionId) {
        return Subscriptions.getSubscriptions(this, sessionId);
    };
    /**
     * Purpose unknown
     *
     * @private
     */
    RemoteObjectTemplate._deleteChanges = function deleteChanges() {
        var _this = this;
        var types = ['array', 'arrayDirty', 'change'];
        types.forEach(function (type) { return ChangeGroups.removeAll(type, _this); });
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
    RemoteObjectTemplate._getSubscription = function _getSubscription(subscriptionId) {
        return Subscriptions.getSubscription(this, subscriptionId);
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
        this.supertypeClass = decorators_1.supertypeClass.bind(this, objectTemplate, SupertypeModule);
        this.Supertype = function () {
            return decorators_1.Supertype(this, objectTemplate, SupertypeModule.Supertype); // This is the class definition itself
        };
        this.Supertype.prototype = SupertypeModule.Supertype.prototype;
        this.property = function (props) {
            return decorators_1.property(objectTemplate, SupertypeModule, props, this.toClientRuleSet, this.toServerRuleSet);
        };
        this.remote = decorators_1.remote.bind(null, objectTemplate);
    };
    RemoteObjectTemplate.Persistable = setupExtends_1.Persistable;
    RemoteObjectTemplate.Remoteable = setupExtends_1.Remoteable;
    RemoteObjectTemplate.Bindable = setupExtends_1.Bindable;
    RemoteObjectTemplate.bindDecorators(); //Default to binding to yourself
    return RemoteObjectTemplate;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0g7OztHQUdHOztBQUdILDJDQUF5RTtBQUN6RSwrQ0FBaUU7QUFDakUsNkNBQStDO0FBQy9DLHVEQUF5RDtBQUN6RCxpREFBaUQ7QUFDakQsMkNBQTZDO0FBQzdDLHFEQUF1RDtBQUN2RCxxREFBa0Q7QUFJbEQsc0VBQXNFO0FBQ3RFLENBQUMsVUFBUyxJQUFJLEVBQUUsT0FBTztJQUN0QixZQUFZLENBQUM7SUFDYixJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO1FBQy9DLE1BQU0sQ0FBQyxDQUFDLFlBQVksRUFBRSxzQkFBc0IsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ3hEO1NBQU0sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRLEVBQUU7UUFDdkMsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7S0FDakY7U0FBTTtRQUNOLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7S0FDakU7QUFDRixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLEVBQUUsZUFBZTtJQUNwQyxZQUFZLENBQUM7SUFFYixJQUFJLGNBQWMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDO0lBQzdDLElBQU0sb0JBQW9CLEdBQVksY0FBYyxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBRXJFLG9CQUFvQixDQUFDLGtCQUFrQixHQUFHLE9BQU8sTUFBTSxLQUFLLFdBQVcsQ0FBQztJQUV4RSxvQkFBb0IsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO0lBRXJDLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFO1FBQ2xDLG9CQUFvQixDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7S0FDckM7SUFFRCxvQkFBb0IsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxvQ0FBb0M7SUFDcEYsb0JBQW9CLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDO0lBRS9DLGtGQUFrRjtJQUVsRixvQkFBb0IsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBQ2xDLG9CQUFvQixDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQztJQUMzQyxvQkFBb0IsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBRW5DOzs7OztPQUtHO0lBQ0gsb0JBQW9CLENBQUMsR0FBRyxHQUFHLFNBQVMsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJO1FBQ2xELFdBQVc7UUFDWCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQzFCLE9BQU87U0FDUDtRQUVELElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUVqQixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUU7WUFDakQsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQztTQUMxQztRQUVELElBQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFFckIsSUFBTSxJQUFJLEdBQ1QsQ0FBQyxDQUFDLFdBQVcsRUFBRTtZQUNmLEdBQUc7WUFDSCxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEIsR0FBRztZQUNILENBQUMsQ0FBQyxPQUFPLEVBQUU7WUFDWCxHQUFHO1lBQ0gsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ25DLEdBQUc7WUFDSCxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFckIsSUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sR0FBRyxJQUFJLEdBQUcsdUJBQXVCLEdBQUcsSUFBSSxDQUFDO1FBRW5HLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNCLENBQUMsQ0FBQztJQUVGOzs7Ozs7OztPQVFHO0lBQ0gsb0JBQW9CLENBQUMsYUFBYSxHQUFHLFNBQVMsYUFBYSxDQUFDLElBQUksRUFBRSxXQUF3QixFQUFFLFNBQVM7UUFDcEcsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQztJQUVGOzs7O09BSUc7SUFDSCxvQkFBb0IsQ0FBQyxhQUFhLEdBQUcsU0FBUyxhQUFhLENBQUMsU0FBMEI7UUFDckYsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUM7SUFFRjs7Ozs7T0FLRztJQUNILG9CQUFvQixDQUFDLGtCQUFrQixHQUFHLFNBQVMsa0JBQWtCLENBQUMsU0FBUztRQUN4RSxJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xFLENBQUMsQ0FBQztJQUVGOzs7Ozs7T0FNRztJQUNILG9CQUFvQixDQUFDLFdBQVcsR0FBRyxTQUFTLFdBQVcsQ0FBQyxTQUFTO1FBQ2hFLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDO0lBRUY7Ozs7OztPQU1HO0lBQ0gsb0JBQW9CLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxtQkFBbUIsQ0FBQyxTQUFTO1FBQzFFLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXBELE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDdkQsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7Ozs7T0FVRztJQUNILG9CQUFvQixDQUFDLGNBQWMsR0FBRyxTQUFTLGNBQWMsQ0FBQyxTQUFTLEVBQUUsWUFBMEIsRUFBRSxXQUF3QjtRQUM1SCxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDO0lBRUY7Ozs7O09BS0c7SUFFSCxvQkFBb0IsQ0FBQyxXQUFXLEdBQUcsU0FBUyxXQUFXLENBQUMsU0FBUztRQUNoRSxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQztJQUVGOzs7OztPQUtHO0lBQ0gsb0JBQW9CLENBQUMsVUFBVSxHQUFHLFNBQVMsVUFBVSxDQUFDLFNBQVM7UUFDOUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxTQUFTLENBQUM7SUFDakMsQ0FBQyxDQUFDO0lBRUY7Ozs7OztPQU1HO0lBQ0gsb0JBQW9CLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLFNBQVM7UUFDOUYsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDcEQsT0FBTyxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQztRQUVuQyxJQUFJLGVBQWUsRUFBRTtZQUNwQixPQUFPLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQztTQUN0QztJQUNGLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7T0FTRztJQUNILG9CQUFvQixDQUFDLFNBQVMsR0FBRyxTQUFTLFNBQVMsQ0FBQyxJQUFJO1FBQ3ZELE9BQU8sYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7O09BUUc7SUFDSCxvQkFBb0IsQ0FBQyxjQUFjLEdBQUcsU0FBUyxjQUFjLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxzQkFBc0I7UUFDL0csSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNoQixPQUFPO1NBQ1A7UUFFRCxJQUFJLFdBQVcsQ0FBQztRQUNoQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFDYixJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUM7UUFFN0MsUUFBUSxVQUFVLENBQUMsSUFBSSxFQUFFO1lBQ3hCLEtBQUssTUFBTTtnQkFDVixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDaEIsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE1BQU0sRUFBRSxnQkFBZ0I7b0JBQ3hCLFFBQVEsRUFBRSxNQUFNO2lCQUNoQixDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQzVGLE1BQU07WUFFUCxLQUFLLE1BQU07Z0JBQ1YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFFdkYsNkVBQTZFO2dCQUM3RSxpRUFBaUU7Z0JBQ2pFLDJEQUEyRDtnQkFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxRQUFRLEVBQUUsY0FBYyxDQUFDLEVBQUU7b0JBQy9GLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNoQjt3QkFDQyxTQUFTLEVBQUUsU0FBUzt3QkFDcEIsTUFBTSxFQUFFLGdCQUFnQjt3QkFDeEIsUUFBUSxFQUFFLFdBQVc7cUJBQ3JCLEVBQ0QseUNBQXlDLENBQ3pDLENBQUM7b0JBQ0YsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLENBQUM7b0JBQ3hDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDdEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2lCQUNyQjtnQkFFRCxNQUFNO1lBRVAsS0FBSyxNQUFNO2dCQUNWLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRTtvQkFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRTt3QkFDM0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7cUJBQzdEO3lCQUFNO3dCQUNOLDBDQUEwQzt3QkFDMUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFOzRCQUNwRixpQkFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDZixTQUFTLENBQUM7Z0NBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2Y7b0NBQ0MsU0FBUyxFQUFFLFNBQVM7b0NBQ3BCLE1BQU0sRUFBRSxnQkFBZ0I7b0NBQ3hCLFFBQVEsRUFBRSxjQUFjO29DQUN4QixJQUFJLEVBQUU7d0NBQ0wsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJO3dDQUNyQixRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVE7cUNBQzdCO2lDQUNELEVBQ0QsVUFBVSxDQUFDLElBQUksQ0FDZixDQUFDO2dDQUNGLE9BQU8sQ0FBQyxXQUFXLENBQUM7b0NBQ25CLElBQUksRUFBRSxVQUFVO29DQUNoQixJQUFJLEVBQUUsS0FBSztvQ0FDWCxPQUFPLEVBQUUsRUFBRTtvQ0FDWCxZQUFZLEVBQUUsWUFBWTtpQ0FDMUIsQ0FBQyxDQUFDO2dDQUNILElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQ0FDdEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDOzRCQUN0QixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUNaLENBQUM7NEJBRUYsTUFBTTt5QkFDTjtxQkFDRDtpQkFDRDtnQkFFRCxXQUFXLEdBQUcsRUFBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxFQUFDLENBQUM7Z0JBRWxELElBQU0sT0FBTyxHQUF1QjtvQkFDbkMsV0FBVyxFQUFFLFdBQVc7b0JBQ3hCLFVBQVUsRUFBRSxVQUFVO29CQUN0QixzQkFBc0IsRUFBRSxzQkFBc0I7b0JBQzlDLE9BQU8sRUFBRSxJQUFJO29CQUNiLE9BQU8sRUFBRSxPQUFPO29CQUNoQixjQUFjLEVBQUUsY0FBYztvQkFDOUIsWUFBWSxFQUFFLFlBQVk7aUJBQzFCLENBQUM7Z0JBQ0YsT0FBTyx5QkFBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTdCLEtBQUssVUFBVSxDQUFDO1lBQ2hCLEtBQUssT0FBTztnQkFDWCxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUM7Z0JBRTFCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNoQixTQUFTLEVBQUUsU0FBUztvQkFDcEIsTUFBTSxFQUFFLGdCQUFnQjtvQkFDeEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO29CQUN6QixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsRUFBRTtpQkFDOUQsQ0FBQyxDQUFDO2dCQUVILDRFQUE0RTtnQkFDNUUsdURBQXVEO2dCQUN2RCxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUM5QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDaEI7d0JBQ0MsU0FBUyxFQUFFLFNBQVM7d0JBQ3BCLE1BQU0sRUFBRSxnQkFBZ0I7d0JBQ3hCLFFBQVEsRUFBRSxVQUFVLENBQUMsSUFBSTt3QkFDekIsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLEVBQUU7cUJBQzlELEVBQ0Qsd0JBQXdCLENBQ3hCLENBQUM7aUJBQ0Y7cUJBQU07b0JBQ04sSUFBSSxPQUFPLFVBQVUsQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFO3dCQUMzQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUU7NEJBQ3BCLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUU7Z0NBQzlELFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztnQ0FFdEYsSUFBSSxVQUFVLENBQUMsSUFBSSxJQUFJLE9BQU8sRUFBRTtvQ0FDL0IsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lDQUMzRTtxQ0FBTTtvQ0FDTixPQUFPLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDeEQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUNqRCxDQUFDO2lDQUNGOzZCQUNEO3lCQUNEOzZCQUFNOzRCQUNOLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDOzRCQUN4QixPQUFPLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztnQ0FDeEQsSUFBSSxFQUFFLHlCQUF5QjtnQ0FDL0IsSUFBSSxFQUFFLDJCQUEyQjs2QkFDakMsQ0FBQyxDQUFDOzRCQUVILElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxRQUFRLEVBQUU7Z0NBQzFCLCtDQUErQztnQ0FDL0MsY0FBYyxHQUFHLEtBQUssQ0FBQzs2QkFDdkI7eUJBQ0Q7cUJBQ0Q7b0JBRUQsT0FBTyxPQUFPLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7aUJBQ2hEO2dCQUVELElBQUksY0FBYyxFQUFFO29CQUNuQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7aUJBQ3JCO2dCQUVELE9BQU8sVUFBVSxJQUFJLENBQUMsQ0FBQztTQUN4QjtJQUNGLENBQUMsQ0FBQztJQUVGOzs7OztPQUtHO0lBQ0gsb0JBQW9CLENBQUMsMEJBQTBCLEdBQUcsU0FBUywwQkFBMEI7UUFDOUUsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDakIsSUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ25CLElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNqQixJQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLElBQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUN4QixJQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFDakIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsTUFBTSxFQUFFLDRCQUE0QjtZQUNwQyxRQUFRLEVBQUUsTUFBTTtZQUNoQixJQUFJLEVBQUUsRUFBRSxZQUFZLEVBQUUsVUFBVSxHQUFHLFdBQVcsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFO1NBQ2pHLENBQUMsQ0FBQztRQUVILE9BQU8sTUFBTSxDQUFDO1FBRWQsU0FBUyxTQUFTLENBQUMsR0FBRztZQUNyQixJQUFJO2dCQUNILE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUs7b0JBQy9DLElBQUksR0FBRyxLQUFLLG9CQUFvQixJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7d0JBQ3ZELE9BQU8sSUFBSSxDQUFDO3FCQUNaO29CQUNELElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxZQUFZLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRTt3QkFDaEQsU0FBUyxHQUFHLEdBQUcsQ0FBQzt3QkFDaEIsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFOzRCQUN4QixLQUFLLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO3lCQUM1Qzs2QkFBTTs0QkFDTixLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQzt5QkFDdkM7cUJBQ0Q7eUJBQU07d0JBQ04sT0FBTyxHQUFHLEdBQUcsQ0FBQztxQkFDZDtvQkFFRCxPQUFPLEtBQUssQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQzthQUNIO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2hCO29CQUNDLFNBQVMsRUFBRSxTQUFTO29CQUNwQixNQUFNLEVBQUUsNEJBQTRCO29CQUNwQyxRQUFRLEVBQUUsTUFBTTtvQkFDaEIsSUFBSSxFQUFFLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFO2lCQUM1RCxFQUNELDRCQUE0QixHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FDbEQsQ0FBQztnQkFDRixPQUFPLElBQUksQ0FBQzthQUNaO1FBQ0YsQ0FBQztRQUVELFNBQVMsS0FBSyxDQUFDLEtBQUs7WUFDbkIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBRVgsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDO2dCQUN0QixFQUFFLEVBQUUsQ0FBQztZQUNOLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7T0FPRztJQUNILG9CQUFvQixDQUFDLFVBQVUsR0FBRyxTQUFTLFVBQVUsQ0FBQyxTQUFTLEVBQUUsWUFBWTtRQUN0RSxJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNwRCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTFDLElBQUksT0FBTyxFQUFFO1lBQ1osSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDdkQsT0FBTyxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7WUFDcEMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxHQUFHLE9BQU8sQ0FBQztTQUNuRDthQUFNLElBQUksWUFBWSxFQUFFO1lBQ3hCLE9BQU8sR0FBRztnQkFDVCxJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixLQUFLLEVBQUUsSUFBSTtnQkFDWCxJQUFJLEVBQUUsSUFBSTtnQkFDVixZQUFZLEVBQUUsSUFBSTtnQkFDbEIsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2FBQzFDLENBQUM7WUFDRixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7U0FDdEI7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDLENBQUM7SUFFRjs7OztPQUlHO0lBQ0gsb0JBQW9CLENBQUMsaUJBQWlCLEdBQUcsU0FBUyxpQkFBaUIsQ0FBQyxTQUFTO1FBQ3RFLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0lBQzFCLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRTtJQUNGOzs7Ozs7T0FNRztJQUNILG9CQUFvQixDQUFDLFVBQVUsR0FBRyxTQUFTLFVBQVUsQ0FBQyxjQUFjO1FBQ25FLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDN0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUN2QjtRQUVELElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1FBQ3hDLElBQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFdEUsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQyxDQUFDO0lBRUY7Ozs7T0FJRztJQUNILG9CQUFvQixDQUFDLGVBQWUsR0FBRyxTQUFTLGVBQWU7UUFDeEQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGFBQWE7UUFFdkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRVYsS0FBSyxJQUFJLGNBQWMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQzlDLElBQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFdEUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBRWpDLElBQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRS9FLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQztTQUNoQztRQUVELE9BQU8sQ0FBQyxHQUFHLFVBQVUsR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7T0FTRztJQUNILG9CQUFvQixDQUFDLFlBQVksR0FBRyxTQUFTLFdBQVcsQ0FBQyxHQUFHLEVBQUUsUUFBUTtRQUNyRSxJQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLG1DQUFtQztRQUU5RSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNoQixtRUFBbUU7WUFDbkUsSUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckcsR0FBRyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7U0FDdEI7UUFDRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUVyQixJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLHNDQUFzQztRQUMzRixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxPQUFPLEVBQUU7WUFDbkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDO1NBQ2xDO1FBRUQsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQzdDLGFBQWE7WUFDYixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0RTtRQUVELE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUMsQ0FBQztJQUVGOzs7Ozs7OztPQVFHO0lBQ0gsb0JBQW9CLENBQUMsVUFBVSxHQUFHLFVBQVMsR0FBRyxFQUFFLGNBQWM7UUFDN0QsOEVBQThFO1FBQzlFLDBGQUEwRjtRQUMxRixJQUFNLGNBQWMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRWpGLHNHQUFzRztRQUN0RyxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxHQUFHLENBQUMsYUFBYSxFQUFFO1lBQ2hELE9BQU87U0FDUDtRQUVELDJGQUEyRjtRQUMzRixxQ0FBcUM7UUFDckMsSUFBSSxjQUFjLEVBQUU7WUFDbkIsNEVBQTRFO1lBQzVFLG1HQUFtRztZQUNuRyx3RkFBd0Y7WUFDeEYsR0FBRyxDQUFDLGtCQUFrQixHQUFHLGNBQWMsQ0FBQztZQUN4QyxHQUFHLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQztZQUM5QixHQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFdkUsb0RBQW9EO1lBQ3BELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFL0MsMEdBQTBHO1lBQzFHLElBQUksR0FBRyxDQUFDLDBCQUEwQixFQUFFO2dCQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDM0I7WUFFRCxrREFBa0Q7WUFDbEQsSUFBSSxHQUFHLENBQUMsa0JBQWtCLEVBQUU7Z0JBQzNCLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsVUFBUyxNQUFNO29CQUM3QyxjQUFjLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzVELENBQUMsQ0FBQyxDQUFDO2dCQUNILEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLENBQUM7YUFDbkM7WUFFRCxpRUFBaUU7WUFDakUsSUFBSSxHQUFHLENBQUMscUJBQXFCLEVBQUU7Z0JBQzlCLEtBQUssSUFBSSxFQUFFLElBQUksR0FBRyxDQUFDLHFCQUFxQixFQUFFO29CQUN6QyxJQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3BELGNBQWMsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUM5QztnQkFDRCxHQUFHLENBQUMscUJBQXFCLEdBQUcsU0FBUyxDQUFDO2FBQ3RDO1lBQ0QsT0FBTyxHQUFHLENBQUM7U0FDWDthQUFNO1lBQ04sY0FBYyxDQUFDLHFCQUFxQixHQUFHLGNBQWMsQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUM7WUFDbEYsY0FBYyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUM7U0FDdkQ7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNaLENBQUMsQ0FBQztJQUVGLG9CQUFvQixDQUFDLG1CQUFtQixHQUFHLFNBQVMsa0JBQWtCLENBQUMsUUFBUTtRQUM5RSxjQUFjLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7Ozs7OztPQVlHO0lBQ0gsb0JBQW9CLENBQUMsY0FBYyxHQUFHLFNBQVMsYUFBYSxDQUMzRCxZQUFZLEVBQ1osYUFBYSxFQUNiLElBQUksRUFDSixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLFFBQVE7UUFFUixtQ0FBbUM7UUFDbkMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzFCLElBQU0sSUFBSSxHQUFHLElBQUksQ0FBQztRQUVsQixJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQy9CLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtnQkFDdEIsYUFBYSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO2FBQ2xEO1lBQ0QsT0FBTyxhQUFhLENBQUM7U0FDckI7YUFBTTtZQUNOLG1GQUFtRjtZQUNuRixrRUFBa0U7WUFDbEUsT0FBTyxTQUFTLHFCQUFxQjtnQkFDcEMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7b0JBQzVCLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUM7aUJBQ3pDO2dCQUVELElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7b0JBQ2hDLGtDQUFrQztvQkFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFO3dCQUNwQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztxQkFDNUM7aUJBQ0Q7Z0JBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2hCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixNQUFNLEVBQUUsZUFBZTtvQkFDdkIsUUFBUSxFQUFFLEtBQUs7b0JBQ2YsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRTtpQkFDNUIsQ0FBQyxDQUFDO2dCQUNILElBQU0sUUFBUSxHQUFHLGlCQUFLLEVBQUUsQ0FBQztnQkFDekIsY0FBYyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFaEYsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLEVBQUU7b0JBQ3pELFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUN0RCxJQUFJLGtCQUFnQixHQUFHLEtBQUssQ0FBQztvQkFFN0IsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO3dCQUMvQyxJQUFJLEdBQUcsRUFBRTs0QkFDUixrQkFBZ0IsR0FBRyxJQUFJLENBQUM7eUJBQ3hCO3dCQUNELE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDckQsQ0FBQyxDQUFDO29CQUVGLGlCQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQzt3QkFDdkIsSUFBSSxDQUFDLGtCQUFnQixFQUFFOzRCQUN0QixPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxLQUFLO2dDQUNsRCxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0NBQzVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDOUIsQ0FBQyxDQUFDLENBQUM7eUJBQ0g7b0JBQ0YsQ0FBQyxDQUFDLENBQUM7aUJBQ0g7Z0JBQ0QsT0FBTyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ3pCLENBQUMsQ0FBQztTQUNGO0lBQ0YsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7Ozs7Ozs7T0FhRztJQUNILG9CQUFvQixDQUFDLGNBQWMsR0FBRyxTQUFTLGFBQWEsQ0FDM0QsWUFBWSxFQUNaLGNBQWMsRUFDZCxnQkFBZ0IsRUFDaEIsZ0JBQWdCO1FBRWhCLG1FQUFtRTtRQUNuRSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFFakIsSUFBSSxPQUFPLGNBQWMsQ0FBQyxLQUFLLEtBQUssV0FBVyxFQUFFO1lBQ2hELEtBQUssR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDO1NBQzdCO1FBRUQsSUFBSSxnQkFBZ0IsRUFBRTtZQUNyQixJQUFJLGNBQWMsQ0FBQyxTQUFTLEVBQUU7Z0JBQzdCLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxHQUFHO29CQUNoQyxJQUFJLEVBQUUsU0FBUztvQkFDZixJQUFJLEVBQUUsY0FBYyxDQUFDLElBQUk7b0JBQ3pCLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFBRTtvQkFDckIsT0FBTyxFQUFFLENBQUMsQ0FDVCxPQUFPLEtBQUssS0FBSyxTQUFTO3dCQUMxQixPQUFPLEtBQUssS0FBSyxRQUFRO3dCQUN6QixPQUFPLEtBQUssS0FBSyxRQUFRO3dCQUN6QixLQUFLLElBQUksSUFBSSxDQUNiO2lCQUNELENBQUM7YUFDRjtpQkFBTTtnQkFDTixnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsR0FBRztvQkFDaEMsSUFBSSxFQUFFLEtBQUs7b0JBQ1gsSUFBSSxFQUFFLGNBQWMsQ0FBQyxJQUFJO29CQUN6QixFQUFFLEVBQUUsY0FBYyxDQUFDLEVBQUU7b0JBQ3JCLE9BQU8sRUFBRSxDQUFDLENBQ1QsT0FBTyxLQUFLLEtBQUssU0FBUzt3QkFDMUIsT0FBTyxLQUFLLEtBQUssUUFBUTt3QkFDekIsT0FBTyxLQUFLLEtBQUssUUFBUTt3QkFDekIsS0FBSyxJQUFJLElBQUksQ0FDYjtpQkFDRCxDQUFDO2FBQ0Y7U0FDRDtRQUVELGlFQUFpRTtRQUNqRSwyREFBMkQ7UUFDM0QsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ2hELGdCQUFnQixDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDO1FBRTlFLHNEQUFzRDtRQUN0RCxJQUFJLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFO1lBQzdGLGNBQWMsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQztZQUM1QyxPQUFPLGNBQWMsQ0FBQyxHQUFHLENBQUM7U0FDMUI7UUFFRCxJQUFJLGNBQWMsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixFQUFFO1lBQzdGLGNBQWMsQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQztZQUM1QyxPQUFPLGNBQWMsQ0FBQyxHQUFHLENBQUM7U0FDMUI7UUFFRCxjQUFjLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxDQUFDO1FBQzlDLElBQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUM7UUFDMUMsSUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQztRQUUxQyw2RUFBNkU7UUFDN0UscUJBQXFCO1FBRXJCLFNBQVM7UUFDVCxJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFFdEIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUMzRCxJQUFNLGVBQWEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFL0UsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsR0FBRztnQkFDakMsOEVBQThFO2dCQUM5RSxJQUFNLElBQUksR0FBRyxZQUFZLENBQUM7Z0JBRTFCLE9BQU8sU0FBUyxDQUFDLENBQUMsS0FBSztvQkFDdEIsSUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO29CQUVqRyw4REFBOEQ7b0JBQzlELElBQ0MsY0FBYyxDQUFDLElBQUk7d0JBQ25CLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCO3dCQUNwQyxLQUFLO3dCQUNMLENBQUMsS0FBSyxDQUFDLGtCQUFrQixFQUN4Qjt3QkFDRCxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO3FCQUM5QztvQkFFRCwwRUFBMEU7b0JBQzFFLElBQUksY0FBYyxDQUFDLEVBQUUsSUFBSSxjQUFjLENBQUMsRUFBRSxDQUFDLGdCQUFnQixJQUFJLEtBQUssWUFBWSxLQUFLLEVBQUU7d0JBQ3RGLEtBQUssQ0FBQyxPQUFPLENBQ1osVUFBUyxLQUFLOzRCQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUU7Z0NBQzlCLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7NkJBQzlDO3dCQUNGLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ1osQ0FBQztxQkFDRjtvQkFFRCxJQUFJLFVBQVUsRUFBRTt3QkFDZixLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7cUJBQ3JDO29CQUVELElBQ0MsQ0FBQyxjQUFjLENBQUMsU0FBUzt3QkFDekIsSUFBSSxDQUFDLE1BQU07d0JBQ1gsZUFBYTt3QkFDYixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxLQUFLLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFDaEQ7d0JBQ0QscUJBQXFCLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBRXZELElBQUkscUJBQXFCLENBQUMsa0JBQWtCLEVBQUU7NEJBQzdDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO3lCQUN4QjtxQkFDRDtvQkFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsRUFBRTt3QkFDOUIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7cUJBQzFCO2dCQUNGLENBQUMsQ0FBQztnQkFFRixTQUFTLFNBQVMsQ0FBQyxJQUFJO29CQUN0QixJQUFJO3dCQUNILElBQUksY0FBYyxDQUFDLElBQUksSUFBSSxNQUFNLElBQUksY0FBYyxDQUFDLElBQUksSUFBSSxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUU7NEJBQzVFLE9BQU8sSUFBSSxDQUFDO3lCQUNaO3dCQUVELElBQUksY0FBYyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUU7NEJBQ2hDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO3lCQUN0Qjt3QkFFRCxJQUFJLGNBQWMsQ0FBQyxJQUFJLElBQUksS0FBSyxFQUFFOzRCQUNqQyxJQUFJLGNBQWMsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUU7Z0NBQ3ZDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtvQ0FDaEIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDO29DQUVoQixLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTt3Q0FDeEMsTUFBTSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7cUNBQzFCO29DQUVELE9BQU8sTUFBTSxDQUFDO2lDQUNkO3FDQUFNO29DQUNOLE9BQU8sSUFBSSxDQUFDO2lDQUNaOzZCQUNEO2lDQUFNO2dDQUNOLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs2QkFDNUI7eUJBQ0Q7NkJBQU0sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFOzRCQUNoRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7eUJBQ25COzZCQUFNOzRCQUNOLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDNUI7cUJBQ0Q7b0JBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ1gsY0FBYyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQzFCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQzFGLHVDQUF1QyxHQUFHLElBQUksQ0FDOUMsQ0FBQzt3QkFDRixPQUFPLElBQUksQ0FBQztxQkFDWjtnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUVMLFNBQVM7WUFDVCxjQUFjLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO2dCQUMvQix3RUFBd0U7Z0JBQ3hFLElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQztnQkFFMUIsT0FBTyxTQUFTLENBQUM7b0JBQ2hCLElBQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztvQkFFakcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxLQUFLLEVBQUU7d0JBQ3BFLHFCQUFxQixDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO3FCQUN0RTtvQkFFRCxJQUFJLFVBQVUsRUFBRTt3QkFDZixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDaEQ7eUJBQU07d0JBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO3FCQUN6QjtnQkFDRixDQUFDLENBQUM7WUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDO1NBQ0w7YUFBTSxJQUFJLGNBQWMsQ0FBQyxPQUFPLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRTtZQUM1RCxjQUFjLENBQUMsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO2dCQUMvQiw4RUFBOEU7Z0JBQzlFLElBQU0sSUFBSSxHQUFHLFlBQVksQ0FBQztnQkFFMUIsT0FBTyxTQUFTLENBQUMsQ0FBQyxLQUFLO29CQUN0QixJQUFJLFVBQVUsRUFBRTt3QkFDZixLQUFLLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7cUJBQ3JDO29CQUVELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFO3dCQUM5QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztxQkFDMUI7Z0JBQ0YsQ0FBQyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUVMLGNBQWMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUM7Z0JBQy9CLHdFQUF3RTtnQkFDeEUsSUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDO2dCQUUxQixPQUFPLFNBQVMsQ0FBQztvQkFDaEIsSUFBSSxVQUFVLEVBQUU7d0JBQ2YsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFOzRCQUM3QixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO3lCQUN4Qzt3QkFFRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDaEQ7eUJBQU07d0JBQ04sT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO3FCQUN6QjtnQkFDRixDQUFDLENBQUM7WUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDO1lBRUwsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUU7Z0JBQzlCLGdCQUFnQixDQUFDLElBQUksR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDO2FBQzlFO1lBRUQsT0FBTyxjQUFjLENBQUMsS0FBSyxDQUFDO1lBQzVCLE9BQU8sY0FBYyxDQUFDLFFBQVEsQ0FBQztTQUMvQjthQUFNO1lBQ04sSUFBSSxnQkFBZ0IsRUFBRTtnQkFDckIsZ0JBQWdCLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxHQUFHLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDO2FBQ3ZFO1NBQ0Q7UUFFRCx1REFBdUQ7UUFDakQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRTtZQUNwRSxPQUFPLGNBQWMsQ0FBQyxLQUFLLENBQUM7WUFDNUIsT0FBTyxjQUFjLENBQUMsUUFBUSxDQUFDO1NBQy9CO0lBQ0YsQ0FBQyxDQUFDO0lBRUY7Ozs7T0FJRztJQUNILG9CQUFvQixDQUFDLHFCQUFxQixHQUFHLFNBQVMscUJBQXFCLENBQUMsRUFBRTtRQUM3RSxJQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztRQUNuRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLEVBQUUsRUFBRSxDQUFDO1FBQ0wsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO0lBQzlDLENBQUMsQ0FBQztJQUVGLFNBQVMsa0JBQWtCLENBQUMsb0JBQTZCLEVBQUUsR0FBRztRQUM3RCxPQUFPLG9CQUFvQixDQUFDLElBQUksSUFBSSxRQUFRLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxZQUFZLEtBQUssS0FBSyxDQUFDO0lBQ3pGLENBQUM7SUFFRCxTQUFTLGtCQUFrQixDQUFDLG9CQUE2QixFQUFFLEdBQUc7UUFDN0QsT0FBTyxvQkFBb0IsQ0FBQyxJQUFJLElBQUksUUFBUSxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsWUFBWSxLQUFLLEtBQUssQ0FBQztJQUN6RixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7OztPQWVHO0lBQ0gsb0JBQW9CLENBQUMsYUFBYSxHQUFHLFNBQVMsWUFBWSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSztRQUMxRSxJQUFJLEdBQUcsQ0FBQyxhQUFhLElBQUksa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtZQUN4RixPQUFPO1NBQ1A7UUFFRCxJQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ25CLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxHQUFHLENBQUMsa0JBQWtCLElBQUksRUFBRSxDQUFDO1lBQ3RELEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDaEQsT0FBTztTQUNQO1FBRUQsS0FBSyxJQUFJLFlBQVksSUFBSSxhQUFhLEVBQUU7WUFDdkMsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFO2dCQUMvRCxJQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsa0JBQWtCLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUV4RSxvRUFBb0U7Z0JBQ3BFLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzNDLElBQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUV0RCxpREFBaUQ7Z0JBQ2pELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO29CQUM3QixXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDN0I7Z0JBRUQsZ0ZBQWdGO2dCQUNoRixnQ0FBZ0M7Z0JBQ2hDLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDbEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUM7aUJBQzVDO3FCQUFNO29CQUNOLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7aUJBQ3JEO2FBQ0Q7U0FDRDtJQUNGLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7Ozs7OztPQWNHO0lBQ0gsb0JBQW9CLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxlQUFlLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUztRQUM5RixJQUFJLEdBQUcsQ0FBQyxhQUFhLElBQUksa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLDRCQUE0QjtZQUN0SCxPQUFPO1NBQ1A7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hELElBQUksYUFBYSxFQUFFO1lBQ2xCLGVBQWU7WUFDZiwwRkFBMEY7WUFDMUYsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQzVCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2FBQ25GO1lBQ0QsR0FBRyxDQUFDLDBCQUEwQixHQUFHLFNBQVMsQ0FBQztZQUMzQyxHQUFHLENBQUMsK0JBQStCLEdBQUcsU0FBUyxDQUFDO1NBQ2hEO2FBQU07WUFDTiw4Q0FBOEM7WUFDOUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxFQUFFLENBQUM7WUFDdEUsa0JBQWtCLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDbkQsR0FBRyxDQUFDLCtCQUErQixHQUFHLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxFQUFFLENBQUM7WUFDM0Usa0JBQWtCLENBQUMsR0FBRyxDQUFDLCtCQUErQixDQUFDLENBQUM7U0FDeEQ7UUFFRCw4R0FBOEc7UUFFOUcsc0JBQXNCO1FBQ3RCLFNBQVMsb0JBQW9CLENBQUMsVUFBc0IsRUFBRSxtQkFBbUI7WUFDeEUsS0FBSyxJQUFJLFlBQVksSUFBSSxhQUFhLEVBQUU7Z0JBQ3ZDLElBQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNyRixJQUFJLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxJQUFJLENBQUMsc0JBQXNCLEVBQUU7b0JBQy9ELElBQUksbUJBQW1CLEVBQUU7d0JBQ3hCLGVBQWUsQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztxQkFDbEQ7eUJBQU07d0JBQ04sa0JBQWtCLENBQUMsV0FBVyxDQUFDLENBQUM7cUJBQ2hDO2lCQUNEO2FBQ0Q7UUFDRixDQUFDO1FBRUQsU0FBUyxlQUFlLENBQUMsV0FBVyxFQUFFLG1CQUFtQjtZQUN4RCxLQUFLLElBQUksR0FBRyxJQUFJLG1CQUFtQixFQUFFO2dCQUNwQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDNUM7UUFDRixDQUFDO1FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxXQUFXO1lBQ3RDLElBQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztZQUVwQywrQ0FBK0M7WUFDL0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDdEIsSUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO2dCQUVmLGdEQUFnRDtnQkFDaEQsSUFBSSxRQUFRLEVBQUU7b0JBQ2IsS0FBSyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUU7d0JBQzVDLElBQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFFMUIsSUFBSSxPQUFPLElBQUksS0FBSyxXQUFXLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTs0QkFDaEQsSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0NBQ2hDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDOzZCQUN0QjtpQ0FBTTtnQ0FDTixpREFBaUQ7Z0NBQ2pELEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs2QkFDckM7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7Z0JBRUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQzthQUN2QjtRQUNGLENBQUM7SUFDRixDQUFDLENBQUM7SUFFRjs7T0FFRztJQUNIOzs7Ozs7T0FNRztJQUNILG9CQUFvQixDQUFDLGdDQUFnQyxHQUFHLFNBQVMsK0JBQStCO1FBQ3pGLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFL0MsVUFBVTtRQUNWLEtBQUssSUFBSSxZQUFZLElBQUksYUFBYSxFQUFFO1lBQ3ZDLElBQUksYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtnQkFDL0QsSUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDeEUsSUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBRXJGLGdDQUFnQztnQkFDaEMsS0FBSyxJQUFJLEdBQUcsSUFBSSxjQUFjLEVBQUU7b0JBQy9CLDZDQUE2QztvQkFDN0MsSUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDN0IsSUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNwQixJQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBRXRCLDZEQUE2RDtvQkFDN0QsSUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFFaEMsSUFBSSxDQUFDLEdBQUcsRUFBRTt3QkFDVCxTQUFTO3FCQUNUO29CQUVELElBQUksSUFBSSxTQUFBLENBQUM7b0JBRVQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7d0JBQzVCLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO3FCQUN4Qjt5QkFBTTt3QkFDTixJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO3FCQUNqQjtvQkFFRCxJQUFJLElBQUksR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBRS9CLElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQ1YsSUFBSSxHQUFHLEVBQUUsQ0FBQztxQkFDVjtvQkFFRCxJQUFJLENBQUMsSUFBSSxFQUFFO3dCQUNWLElBQUksR0FBRyxFQUFFLENBQUM7cUJBQ1Y7b0JBRUQsb0VBQW9FO29CQUVwRSwyRUFBMkU7b0JBQzNFLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBRS9DLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUU7d0JBQ2hDLCtCQUErQjt3QkFDL0IsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDO3dCQUUxQixJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLFdBQVcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFOzRCQUN4RCxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDOUQ7d0JBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUUzQixJQUNDLFNBQVMsS0FBSyxTQUFTOzRCQUN2QixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO2dDQUN2QixXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQztnQ0FDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsRUFDbEQ7NEJBQ0QsMENBQTBDOzRCQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQ0FDN0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7NkJBQzdCOzRCQUVELDREQUE0RDs0QkFDNUQsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO2dDQUNsQyxJQUFJLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksS0FBSyxFQUFFO29DQUN0RCxvQ0FBb0M7b0NBQ3BDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDO2lDQUNqRDs2QkFDRDtpQ0FBTTtnQ0FDTixtRUFBbUU7Z0NBQ25FLCtEQUErRDtnQ0FDL0QsSUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQ0FDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dDQUN6RSxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFNBQVMsQ0FBQzs2QkFDakQ7NEJBRUQsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsRUFBRTtnQ0FDaEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NkJBQy9CO3lCQUNEO3dCQUVELHVEQUF1RDt3QkFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTs0QkFDN0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7Z0NBQ3RCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDOzZCQUN0Qjs0QkFFRCxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt5QkFDckM7cUJBQ0Q7aUJBQ0Q7Z0JBQ0QsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDakQ7U0FDRDtJQUNGLENBQUMsQ0FBQztJQUVGOzs7T0FHRztJQUNILG9CQUFvQixDQUFDLDBCQUEwQixHQUFHLFNBQVMsMEJBQTBCO1FBQzlFLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFL0MsS0FBSyxJQUFJLFlBQVksSUFBSSxhQUFhLEVBQUU7WUFDdkMsSUFBSSxhQUFhLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLHNCQUFzQixFQUFFO2dCQUMvRCxJQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFFMUYsZ0NBQWdDO2dCQUNoQyxLQUFLLElBQUksR0FBRyxJQUFJLGNBQWMsRUFBRTtvQkFDL0IsNkNBQTZDO29CQUM3QyxJQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM3QixJQUFNLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BCLElBQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFdEIsNkRBQTZEO29CQUM3RCxJQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUVoQyxJQUFJLENBQUMsR0FBRyxFQUFFO3dCQUNULFNBQVM7cUJBQ1Q7b0JBRUQsSUFBSSxJQUFJLFNBQUEsQ0FBQztvQkFFVCxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRTt3QkFDNUIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7cUJBQ3hCO3lCQUFNO3dCQUNOLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7cUJBQ2pCO29CQUVELElBQUksSUFBSSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFFL0IsSUFBSSxDQUFDLElBQUksRUFBRTt3QkFDVixJQUFJLEdBQUcsRUFBRSxDQUFDO3FCQUNWO29CQUVELElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQ1YsSUFBSSxHQUFHLEVBQUUsQ0FBQztxQkFDVjtvQkFFRCxvRUFBb0U7b0JBQ3BFLElBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBRS9DLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUU7d0JBQ2hDLCtCQUErQjt3QkFDL0IsSUFBSSxTQUFTLEdBQUcsU0FBUyxDQUFDO3dCQUUxQixJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLFdBQVcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFOzRCQUN4RCxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDOUQ7d0JBRUQsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUUzQixJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUU7NEJBQzVCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO3lCQUN2QjtxQkFDRDtpQkFDRDthQUNEO1NBQ0Q7SUFDRixDQUFDLENBQUM7SUFFRjs7Ozs7Ozs7O09BU0c7SUFDSCxvQkFBb0IsQ0FBQyxhQUFhLEdBQUcsU0FBUyxZQUFZLENBQUMsS0FBSztRQUMvRCxJQUFJLEtBQUssWUFBWSxLQUFLLEVBQUU7WUFDM0IsSUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBRXBCLEtBQUssSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUN6QyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRTtvQkFDZCxJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLFFBQVEsRUFBRTt3QkFDbEMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztxQkFDN0Q7eUJBQU07d0JBQ04sUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO3FCQUN4RDtpQkFDRDtxQkFBTTtvQkFDTixRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDO2lCQUNwQjthQUNEO1lBRUQsT0FBTyxRQUFRLENBQUM7U0FDaEI7YUFBTSxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFO1lBQ2pDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztTQUNwQjthQUFNLElBQUksS0FBSyxZQUFZLElBQUksRUFBRTtZQUNqQyxPQUFPLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUN2QjthQUFNLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNyRCxPQUFPLElBQUksQ0FBQztTQUNaO2FBQU07WUFDTixJQUFJLEtBQUssRUFBRTtnQkFDVixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRTtvQkFDOUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUM3QjtnQkFFRCxPQUFPLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUN4QjtZQUVELE9BQU8sS0FBSyxDQUFDO1NBQ2I7SUFDRixDQUFDLENBQUM7SUFFRjs7Ozs7OztPQU9HO0lBQ0gsb0JBQW9CLENBQUMsU0FBUyxHQUFHLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxRQUFRO1FBQzVELElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVuQyxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsWUFBWSxJQUFJLEdBQUcsQ0FBQyxZQUFZLElBQUksUUFBUSxFQUFFO1lBQzVELE9BQU8sR0FBRyxDQUFDO1NBQ1g7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsb0JBQW9CLENBQUMsYUFBYSxHQUFHLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLFdBQVc7UUFDL0YsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFFcEIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUVwRSx3RkFBd0Y7UUFDeEYsOERBQThEO1FBQzlELElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO1FBRXZCLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztRQUV2QixLQUFLLElBQUksS0FBSyxJQUFJLE9BQU8sRUFBRTtZQUMxQixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRWpDLElBQUksR0FBRyxFQUFFO2dCQUNSLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDbEI7WUFFRCxnREFBZ0Q7WUFDaEQsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDVCxJQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFckYsSUFBSSxRQUFRLEVBQUU7b0JBQ2IsS0FBSyxHQUFHLElBQUksQ0FBQztvQkFDYixHQUFHLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztpQkFDL0M7cUJBQU07b0JBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2hCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsRUFDeEUsOEJBQThCLEdBQUcsS0FBSyxDQUN0QyxDQUFDO2lCQUNGO2FBQ0Q7WUFFRCxJQUFJLHNCQUFzQixHQUFHLElBQUksQ0FBQztZQUNsQyxJQUFJLHdCQUF3QixHQUFHLElBQUksQ0FBQztZQUVwQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxFQUFFO2dCQUMzQixJQUFNLFNBQVMsR0FDZCxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsOEJBQThCLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQztnQkFFakcsSUFBSSxhQUFhLFNBQUEsQ0FBQztnQkFFbEIsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLDhCQUE4QixDQUFDLEVBQUU7b0JBQy9DLGFBQWEsR0FBRyxHQUFHLENBQUM7aUJBQ3BCO3FCQUFNO29CQUNOLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO2lCQUNoQztnQkFFRCxJQUFJLFNBQVMsRUFBRTtvQkFDZCxJQUFJO3dCQUNILFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxDQUFDO3FCQUNuQztvQkFBQyxPQUFPLENBQUMsRUFBRTt3QkFDWCxzQkFBc0IsR0FBRyxLQUFLLENBQUM7cUJBQy9CO2lCQUNEO2FBQ0Q7WUFFRCxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFO2dCQUM3RCx3QkFBd0IsR0FBRyxLQUFLLENBQUM7YUFDakM7WUFFRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsc0JBQXNCLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtnQkFDakUsSUFBSSxDQUFDLHNCQUFzQixHQUFHLEtBQUssQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDekIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDaEIsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxFQUN4RSw2QkFBNkIsR0FBRyxLQUFLLENBQ3JDLENBQUM7Z0JBQ0YsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sQ0FBQyxDQUFDO2FBQ1Q7U0FDRDtRQUVELElBQUksdUJBQXVCLEdBQUcsSUFBSSxDQUFDO1FBRW5DLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFO1lBQy9FLElBQUk7Z0JBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyw2QkFBNkIsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7YUFDcEU7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDWCx1QkFBdUIsR0FBRyxLQUFLLENBQUM7YUFDaEM7U0FDRDtRQUVELElBQUksQ0FBQyx1QkFBdUIsRUFBRTtZQUM3QixJQUFJLENBQUMsc0JBQXNCLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNoQixFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsK0JBQStCLEVBQUUsRUFDM0YsdURBQXVELENBQ3ZELENBQUM7WUFDRixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztZQUN2QixPQUFPLENBQUMsQ0FBQztTQUNUO1FBRUQ7OztXQUdTO1FBQ1QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQztRQUNuQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUNqQixTQUFTLEVBQUUsU0FBUztZQUNwQixNQUFNLEVBQUUsY0FBYztZQUN0QixRQUFRLEVBQUUsYUFBYTtZQUN2QixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRTtTQUM1RCxDQUFDLENBQUM7UUFFSCxJQUFJLFVBQVUsRUFBRTtZQUNmLE9BQU8sQ0FBQyxDQUFDO1NBQ1Q7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNWLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7OztPQVdHO0lBQ0gsb0JBQW9CLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxLQUFLO1FBQ25HLHdFQUF3RTtRQUN4RSxLQUFLLElBQUksSUFBSSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDckMsSUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxJQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsSUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLElBQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRXZFLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNoQjtvQkFDQyxTQUFTLEVBQUUsU0FBUztvQkFDcEIsTUFBTSxFQUFFLG9CQUFvQjtvQkFDNUIsUUFBUSxFQUFFLFlBQVk7b0JBQ3RCLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO2lCQUM3RCxFQUNELCtCQUE2QixHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsU0FBSSxJQUFJLHNDQUFtQyxDQUNqRyxDQUFDO2dCQUNGLE9BQU8sS0FBSyxDQUFDO2FBQ2I7WUFFRCxJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssS0FBSyxFQUFFO2dCQUNsQyxJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxFQUFFO29CQUMvRSxPQUFPLEtBQUssQ0FBQztpQkFDYjtnQkFFRCxJQUFJLFFBQVEsWUFBWSxLQUFLLEVBQUU7b0JBQzlCLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLENBQUMsRUFBRTt3QkFDbEMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztxQkFDZjtvQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLEtBQUssQ0FBQyxFQUFFO3dCQUNyRSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztxQkFDdEI7b0JBRUQsSUFBSSxRQUFNLFNBQUEsQ0FBQztvQkFFWCxJQUFJLFFBQVEsRUFBRTt3QkFDYixRQUFNLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztxQkFDcEQ7eUJBQU07d0JBQ04sUUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztxQkFDdEM7b0JBRUQsS0FBSyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLFFBQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTt3QkFDbkMsSUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQy9DLElBQUksUUFBUSxFQUFFOzRCQUNiLElBQ0MsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQ3pCLE9BQU8sRUFDUCxRQUFRLEVBQ1IsR0FBRyxFQUNILElBQUksRUFDSixFQUFFLEVBQ0YsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNyQixnQkFBZ0IsRUFDaEIsS0FBSyxDQUNMLEVBQ0E7Z0NBQ0QsT0FBTyxLQUFLLENBQUM7NkJBQ2I7eUJBQ0Q7NkJBQU07NEJBQ04sSUFDQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsT0FBTyxFQUNQLFFBQVEsRUFDUixHQUFHLEVBQ0gsSUFBSSxFQUNKLEVBQUUsRUFDRixJQUFJLEVBQ0osZ0JBQWdCLEVBQ2hCLEtBQUssQ0FDTCxFQUNBO2dDQUNELE9BQU8sS0FBSyxDQUFDOzZCQUNiO3lCQUNEO3FCQUNEO29CQUVELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQzNCO3FCQUFNLElBQUksUUFBUSxZQUFZLEtBQUssRUFBRTtvQkFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztvQkFFakIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTt3QkFDN0IsR0FBRyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7cUJBQ3hCO2lCQUNEO2FBQ0Q7aUJBQU07Z0JBQ04sSUFBSSxDQUFDLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxRQUFRLENBQUMsRUFBRTtvQkFDL0UsT0FBTyxLQUFLLENBQUM7aUJBQ2I7Z0JBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsRUFBRTtvQkFDNUYsT0FBTyxLQUFLLENBQUM7aUJBQ2I7YUFDRDtTQUNEO1FBRUQsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLE9BQU8sSUFBSSxDQUFDO1FBRVosU0FBUyxPQUFPLENBQUMsS0FBSztZQUNyQixJQUFJO2dCQUNILElBQUksS0FBSyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRTtvQkFDL0MsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDM0M7Z0JBRUQsT0FBTyxLQUFLLENBQUM7YUFDYjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNYLE9BQU8sRUFBRSxDQUFDO2FBQ1Y7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDO0lBRUYsb0JBQW9CLENBQUMsK0JBQStCLEdBQUcsVUFBUyxHQUFHLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxRQUFRO1FBQ2xHLElBQU0sU0FBUyxHQUNkLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRXJHLElBQUksYUFBYSxDQUFDO1FBRWxCLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQ0FBZ0MsQ0FBQyxFQUFFO1lBQ2pELGFBQWEsR0FBRyxHQUFHLENBQUM7U0FDcEI7YUFBTTtZQUNOLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1NBQ2hDO1FBRUQsSUFBSSxTQUFTLEVBQUU7WUFDZCxJQUFJO2dCQUNILFNBQVMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ25FO1lBQUMsT0FBTyxLQUFLLEVBQUU7Z0JBQ2YsT0FBTyxLQUFLLENBQUM7YUFDYjtTQUNEO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDLENBQUM7SUFFRjs7Ozs7Ozs7Ozs7Ozs7OztPQWdCRztJQUNILG9CQUFvQixDQUFDLG9CQUFvQixHQUFHLFNBQVMsbUJBQW1CLENBQ3ZFLE9BQU8sRUFDUCxRQUFRLEVBQ1IsR0FBRyxFQUNILElBQUksRUFDSixFQUFFLEVBQ0YsUUFBUSxFQUNSLFFBQVEsRUFDUixLQUFLO1FBRUMsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFJLFlBQVksQ0FBQztRQUVqQiw0RUFBNEU7UUFDNUUsSUFBSTtZQUNILElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDWixZQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzdCO2lCQUFNO2dCQUNOLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDekI7U0FDRDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2hCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxFQUMvRSw0QkFBNEIsR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLFFBQVEsR0FBRyxHQUFHLEdBQUcsSUFBSSxHQUFHLCtCQUErQixDQUN2RyxDQUFDO1lBRUYsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUVELGlCQUFpQjtRQUNqQixJQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0QsSUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXZELElBQUksUUFBUSxJQUFJLHFCQUFxQixJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUNqRSxZQUFZO1lBQ1osT0FBTyxJQUFJLENBQUM7U0FDWjtRQUVELG1GQUFtRjtRQUNuRixJQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0UsSUFBTSxlQUFlLEdBQUcsY0FBYyxDQUFDLFFBQVEsS0FBSyxLQUFLLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUM7UUFFL0YsNkRBQTZEO1FBQzdELElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxLQUFLLElBQUksaUJBQWlCLElBQUkscUJBQXFCLEVBQUU7WUFDN0Usa0NBQWtDO1lBQ2xDLElBQU0saUJBQWlCLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLENBQUM7WUFFMUcsSUFBTSxtQkFBbUIsR0FDeEIsK0JBQTZCLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxTQUFJLElBQUksbUJBQWMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRSxjQUFjLENBQUMsdUJBQWtCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxDQUFHLENBQUM7WUFFdE8sSUFBSSxJQUFJLENBQUMsZ0JBQWdCLElBQUksTUFBTSxFQUFFO2dCQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO2dCQUMxRCxPQUFPLEtBQUssQ0FBQzthQUNiO2lCQUFNO2dCQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLG1CQUFtQixDQUFDLENBQUM7YUFDekQ7U0FDRDtRQUVELHNGQUFzRjtRQUN0Rix5RUFBeUU7UUFDbkUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDbEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2hCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxFQUMvRSxpQ0FBK0IsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLFNBQUksSUFBSSxrQ0FBK0IsQ0FDL0YsQ0FBQztZQUVGLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCxJQUFNLElBQUksR0FBRyxjQUFjLENBQUMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUM7UUFDdEQsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRWpCLElBQUksSUFBSSxJQUFJLE1BQU0sRUFBRTtZQUNuQixJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLFFBQVEsR0FBRyxJQUFJLENBQUM7YUFDaEI7aUJBQU07Z0JBQ04sUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM1QjtTQUNEO2FBQU0sSUFBSSxJQUFJLElBQUksTUFBTSxFQUFFO1NBQzFCLENBQUMseURBQXlEO2FBQ3RELElBQUksSUFBSSxJQUFJLE9BQU8sRUFBRTtZQUN6QixJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQ3JCLFFBQVEsR0FBRyxJQUFJLENBQUM7YUFDaEI7aUJBQU07Z0JBQ04sSUFBSSxRQUFRLElBQUksT0FBTyxFQUFFO29CQUN4QixRQUFRLEdBQUcsS0FBSyxDQUFDO2lCQUNqQjtxQkFBTTtvQkFDTixJQUFJLFFBQVEsRUFBRTt3QkFDYixRQUFRLEdBQUcsSUFBSSxDQUFDO3FCQUNoQjt5QkFBTTt3QkFDTixRQUFRLEdBQUcsS0FBSyxDQUFDO3FCQUNqQjtpQkFDRDthQUNEO1NBQ0Q7YUFBTSxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7WUFDeEIsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO2dCQUNyQixRQUFRLEdBQUcsSUFBSSxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNOLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM5QjtTQUNEO2FBQU0sSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLFFBQVEsRUFBRTtZQUN0QyxJQUFJO2dCQUNILElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFO29CQUNqQyxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLEVBQUU7d0JBQzdDLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztxQkFDMUM7eUJBQU07d0JBQ04sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7cUJBQ2hDO2lCQUNEO2FBQ0Q7WUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFLENBQUMsc0JBQXNCO1NBQ3JDO2FBQU0sSUFBSSxRQUFRLElBQUksT0FBTyxJQUFJLEtBQUssVUFBVSxFQUFFO1lBQ2xELEtBQUssR0FBRyxRQUFRLENBQUM7WUFFakIsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMzQixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksSUFBSSxFQUFFO29CQUMzQyxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDbEM7cUJBQU07b0JBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2hCLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxFQUMvRSwrQkFBNkIsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLFNBQUksSUFBSSxlQUFVLEtBQUssa0JBQWEsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBVSxDQUN4SSxDQUFDO29CQUVGLE9BQU8sS0FBSyxDQUFDO2lCQUNiO2FBQ0Q7aUJBQU07Z0JBQ04sUUFBUSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2dCQUNoRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDNUQ7U0FDRDtRQUVELDhDQUE4QztRQUM5Qyw2RUFBNkU7UUFDN0UsSUFBSSxRQUFRLElBQUksWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQ3pELElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDWixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsUUFBUSxDQUFDO2dCQUViLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRTtvQkFDM0UsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUU7d0JBQ3RCLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO3FCQUN0QjtvQkFDRCxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQztpQkFDaEM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7b0JBQzVCLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO2lCQUN2QjthQUNEO2lCQUFNO2dCQUNOLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUM7Z0JBRVQsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFO29CQUMzRSxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQztpQkFDNUI7YUFDRDtTQUNEO1FBRUQsSUFBSSxRQUFRLENBQUM7UUFFYixJQUFJLEtBQUssRUFBRTtZQUNWLFFBQVEsR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEdBQUcsQ0FBQztTQUM3QjthQUFNO1lBQ04sSUFBSSxRQUFRLFlBQVksS0FBSyxFQUFFO2dCQUM5QixRQUFRLEdBQUcsR0FBRyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO2FBQ3ZDO2lCQUFNO2dCQUNOLFFBQVEsR0FBRyxRQUFRLENBQUM7YUFDcEI7U0FDRDtRQUVELElBQUksRUFBRSxJQUFJLENBQUMsRUFBRTtZQUNaLElBQUksQ0FBQyxZQUFZLENBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLFNBQUksRUFBRSxVQUFLLElBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDekYsSUFBSSxFQUNKLFFBQVEsRUFDUixjQUFjLENBQ2QsQ0FBQztTQUNGO2FBQU07WUFDTixJQUFJLENBQUMsWUFBWSxDQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsUUFBUSxTQUFJLElBQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDbEYsSUFBSSxFQUNKLFFBQVEsRUFDUixjQUFjLENBQ2QsQ0FBQztTQUNGO1FBRUQsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFN0MsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDLENBQUM7SUFFRjs7Ozs7O09BTUc7SUFDSCxvQkFBb0IsQ0FBQyxTQUFTLEdBQUcsU0FBUyxRQUFRLENBQUMsUUFBUTtRQUMxRCxLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTtZQUM1QyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3pCLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDcEU7aUJBQU07Z0JBQ04sUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNEO0lBQ0YsQ0FBQyxDQUFDO0lBRUY7Ozs7T0FJRztJQUNILG9CQUFvQixDQUFDLGdCQUFnQixHQUFHLFNBQVMsZUFBZTtRQUN6RCxJQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUVsQyxLQUFLLElBQUksS0FBSyxJQUFJLE9BQU8sRUFBRTtZQUMxQixJQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRW5DLElBQUksR0FBRyxFQUFFO2dCQUNSLHdFQUF3RTtnQkFDeEUsS0FBSyxJQUFJLElBQUksSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hDLElBQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFekMsSUFBSSxRQUFRLFlBQVksS0FBSyxFQUFFO3dCQUM5QixLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRTs0QkFDNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQzt5QkFDNUI7cUJBQ0Q7eUJBQU07d0JBQ04sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQztxQkFDckI7aUJBQ0Q7YUFDRDtTQUNEO1FBRUQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQztJQUVGOzs7Ozs7Ozs7Ozs7OztPQWNHO0lBQ0gsb0JBQW9CLENBQUMsa0JBQWtCLEdBQUcsU0FBUyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxXQUFXO1FBQ2hILElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDWCxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUFnQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEdBQUcsMEJBQTBCLENBQUMsQ0FBQztTQUNuRztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsNkRBQTZELEdBQUcsS0FBSyxDQUFDLENBQUM7U0FDdkY7UUFFRCxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFNUQsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQ2pFLElBQUksUUFBUSxDQUFDO1FBRWIsSUFBSSxnQkFBZ0IsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNyQyxJQUFJLGdCQUFnQixDQUFDLFlBQVksSUFBSSxRQUFRLEVBQUU7Z0JBQzlDLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQzthQUM1QjtpQkFBTTtnQkFDTixNQUFNLElBQUksS0FBSyxDQUNkLG1DQUFpQyxRQUFRLENBQUMsUUFBUSxpRUFBNEQsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBVSxDQUM1SixDQUFDO2FBQ0Y7U0FDRDthQUFNO1lBQ04sUUFBUSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUM7WUFDbkQsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUMsQ0FBQywwQ0FBMEM7WUFDdkUsSUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztZQUV4QyxJQUFJLFdBQVcsRUFBRTtnQkFDaEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxzREFBc0Q7YUFDakY7WUFFRCxRQUFRLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQyxDQUFDLDBEQUEwRDtZQUVyRixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFO2dCQUM3QixRQUFRLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQzthQUM3QjtZQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1lBRWxDLElBQUksV0FBVyxFQUFFO2dCQUNoQixRQUFRLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQzthQUM5QjtZQUVELElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtnQkFDbEQsaURBQWlEO2dCQUNqRCxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7YUFDeEQ7U0FDRDtRQUVELElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxRQUFRLElBQUksT0FBTyxRQUFRLENBQUMsYUFBYSxLQUFLLFVBQVUsRUFBRTtZQUMxRSxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDO1NBQzlCO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLFFBQVEsSUFBSSxPQUFPLFFBQVEsQ0FBQyxhQUFhLEtBQUssVUFBVSxFQUFFO1lBQzFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDOUI7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDLENBQUM7SUFFRjs7Ozs7T0FLRztJQUNILG9CQUFvQixDQUFDLE1BQU0sR0FBRyxTQUFTLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUTtRQUMvRCxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxxREFBcUQ7UUFDL0MsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QyxLQUFLLElBQUksR0FBRyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDaEMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDMUYsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDcEM7U0FDRDtJQUNGLENBQUMsQ0FBQztJQUVGLDhGQUE4RjtJQUU5Rjs7Ozs7Ozs7O09BU0c7SUFFSCxvQkFBb0IsQ0FBQyxnQkFBZ0IsR0FBRyxTQUFTLGVBQWUsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJO1FBQzdGLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDRDQUE0QztRQUVyRixPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztZQUN4QixJQUFJLEVBQUUsTUFBTTtZQUNaLElBQUksRUFBRSxZQUFZO1lBQ2xCLEVBQUUsRUFBRSxLQUFLO1lBQ1QsUUFBUSxFQUFFLFFBQVE7WUFDbEIsSUFBSSxFQUFFLElBQUk7WUFDVixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xELE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUMxQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUMsQ0FBQztJQUVGOzs7Ozs7T0FNRztJQUNILG9CQUFvQixDQUFDLGFBQWEsR0FBRyxTQUFTLFlBQVk7UUFDbkQsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QyxJQUFJLE9BQU8sQ0FBQyxXQUFXLElBQUksT0FBTyxDQUFDLGtCQUFrQixFQUFFO1lBQ3RELElBQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUVsQyxJQUFJLE9BQU8sRUFBRTtnQkFDWixPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzdCO1NBQ0Q7SUFDRixDQUFDLENBQUM7SUFFRjs7Ozs7Ozs7OztPQVVHO0lBQ0gsb0JBQW9CLENBQUMsWUFBWSxHQUFHLFNBQVMsS0FBSyxDQUFDLEdBQUc7UUFDckQsSUFBSSxHQUFHLEdBQVEsRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFDLENBQUM7UUFFNUIsNERBQTREO1FBQzVELDRDQUE0QztRQUM1QyxJQUFJLEdBQUcsWUFBWSxJQUFJLEVBQUU7WUFDeEIsR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7U0FDN0M7YUFBTSxJQUFJLEdBQUcsWUFBWSxLQUFLLEVBQUU7WUFDaEMsR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFFbkMsS0FBSyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUU7Z0JBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUMzQztTQUNEO2FBQU0sSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLElBQUksR0FBRyxZQUFZLE1BQU0sRUFBRTtZQUM1RCxHQUFHLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztTQUM3QzthQUFNLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLEdBQUcsWUFBWSxNQUFNLEVBQUU7WUFDNUQsR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7U0FDaEQ7YUFBTSxJQUFJLE9BQU8sR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLFlBQVksT0FBTyxFQUFFO1lBQzlELEdBQUcsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDO1NBQ3RDO2FBQU0sSUFBSSxHQUFHLFlBQVksTUFBTSxFQUFFO1lBQ2pDLDhEQUE4RDtZQUM5RCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2YsR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO2FBQ3hDO2lCQUFNO2dCQUNOLDBDQUEwQztnQkFDMUMsR0FBRyxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQUM7Z0JBQ3BDLEtBQUssSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFO29CQUNyQixJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUU7d0JBQzdCLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztxQkFDL0M7aUJBQ0Q7YUFDRDtTQUNEO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDLENBQUM7SUFFRjs7Ozs7Ozs7OztPQVVHO0lBQ0gsb0JBQW9CLENBQUMsY0FBYyxHQUFHLFNBQVMsS0FBSyxDQUFDLEdBQUc7UUFDakQsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QyxRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDakIsS0FBSyxNQUFNO2dCQUNWLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzFCLE1BQU07WUFFUCxLQUFLLFFBQVE7Z0JBQ1osR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBQ2hCLE1BQU07WUFFUCxLQUFLLFFBQVE7Z0JBQ1osR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3hCLE1BQU07WUFFUCxLQUFLLFNBQVM7Z0JBQ2IsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7Z0JBQ2hCLE1BQU07WUFFUCxLQUFLLE9BQU87Z0JBQ1gsSUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUVoQixLQUFLLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUU7b0JBQzdDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDOUM7Z0JBRUQsR0FBRyxHQUFHLElBQUksQ0FBQztnQkFDWCxNQUFNO1lBRVAsS0FBSyxJQUFJO2dCQUNSLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDakMsTUFBTTtZQUVQLEtBQUssUUFBUTtnQkFDWixJQUFNLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBRWhCLEtBQUssSUFBSSxJQUFJLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtvQkFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNsRDtnQkFFRCxHQUFHLEdBQUcsSUFBSSxDQUFDO2dCQUNYLE1BQU07WUFFUCxLQUFLLElBQUk7Z0JBQ1IsR0FBRyxHQUFHLElBQUksQ0FBQztTQUNaO1FBRUQsT0FBTyxHQUFHLENBQUM7SUFDWixDQUFDLENBQUM7SUFFRixrRkFBa0Y7SUFFbEY7Ozs7Ozs7T0FPRztJQUNILG9CQUFvQixDQUFDLGlCQUFpQixHQUFHLFNBQVMsZ0JBQWdCLENBQUMsVUFBVTtRQUM1RSxJQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0lBRUY7Ozs7OztPQU1HO0lBQ0gsb0JBQW9CLENBQUMsVUFBVSxHQUFHLFNBQVMsU0FBUyxDQUFDLEtBQUs7UUFDekQsT0FDQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDaEIsQ0FBQyxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLFdBQVcsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFDbEY7WUFDRCxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ2xDO0lBQ0YsQ0FBQyxDQUFDO0lBRUY7Ozs7OztPQU1HO0lBQ0gsb0JBQW9CLENBQUMsV0FBVyxHQUFHLFNBQVMsV0FBVyxDQUFDLFNBQVU7UUFDakUsT0FBTyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN0QyxDQUFDLENBQUM7SUFFRjs7Ozs7Ozs7T0FRRztJQUNILG9CQUFvQixDQUFDLGlCQUFpQixHQUFHLFNBQVMsaUJBQWlCLENBQUMsU0FBVTtRQUM3RSxPQUFPLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDeEQsQ0FBQyxDQUFDO0lBRUY7Ozs7T0FJRztJQUNILG9CQUFvQixDQUFDLGNBQWMsR0FBRyxTQUFTLGFBQWE7UUFBdEIsaUJBR3JDO1FBRkEsSUFBTSxLQUFLLEdBQUcsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2hELEtBQUssQ0FBQyxPQUFPLENBQUMsVUFBQyxJQUFJLElBQUssT0FBQSxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFJLENBQUMsRUFBbEMsQ0FBa0MsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQztJQUVGOzs7Ozs7OztPQVFHO0lBQ0gsb0JBQW9CLENBQUMsZ0JBQWdCLEdBQUcsU0FBUyxnQkFBZ0IsQ0FBQyxjQUFjO1FBQy9FLE9BQU8sYUFBYSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDNUQsQ0FBQyxDQUFDO0lBRUY7Ozs7Ozs7O09BUUc7SUFDSCxvQkFBb0IsQ0FBQyxrQkFBa0IsR0FBRyxTQUFTLGtCQUFrQixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsY0FBYztRQUNuRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsSUFBSSxjQUFjLENBQUMsVUFBVSxJQUFJLE9BQU8sRUFBRTtZQUMzRixPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQyxDQUFDO0lBRUMsb0JBQW9CLENBQUMsY0FBYyxHQUFHLFVBQVUsY0FBYztRQUMxRCxjQUFjLEdBQUcsY0FBYyxJQUFJLElBQUksQ0FBQztRQUV4QyxJQUFJLENBQUMsY0FBYyxHQUFHLDJCQUFjLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDakYsSUFBSSxDQUFDLFNBQVMsR0FBRztZQUNiLE9BQU8sc0JBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLHNDQUFzQztRQUM3RyxDQUFDLENBQUM7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztRQUMvRCxJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsS0FBSztZQUMzQixPQUFPLHFCQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDeEcsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLE1BQU0sR0FBRyxtQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDO0lBR0Ysb0JBQW9CLENBQUMsV0FBVyxHQUFHLDBCQUFXLENBQUM7SUFDbEQsb0JBQW9CLENBQUMsVUFBVSxHQUFHLHlCQUFVLENBQUM7SUFDN0Msb0JBQW9CLENBQUMsUUFBUSxHQUFHLHVCQUFRLENBQUM7SUFFekMsb0JBQW9CLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxnQ0FBZ0M7SUFFdkUsT0FBTyxvQkFBb0IsQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAyMDEyLTIwMTMgU2FtIEVsc2FtbWFuXG4gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nXG4gYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xuIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xuIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG4gaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELFxuIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG4gTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRVxuIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT05cbiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqL1xuLypcbiBSZW1vdGVPYmplY3RUZW1wbGF0ZSBleHRlbmRzIE9iamVjdFRlbXBsYXRlIHRvIHByb3ZpZGUgYSBzeW5jaHJvbml6YXRpb24gbWVjaGFuaXNtIGZvclxuIG9iamVjdHMgY3JlYXRlZCB3aXRoIGl0J3MgdGVtcGxhdGVzLiAgVGhlIHN5bmNocm9uaXphdGlvblxuICovXG5cbmltcG9ydCB7QXJyYXlUeXBlcywgUHJvY2Vzc0NhbGxQYXlsb2FkLCBTYXZlZFNlc3Npb24sIFNlbW90dXMsIFNlbmRNZXNzYWdlfSBmcm9tICcuL2hlbHBlcnMvVHlwZXMnO1xuaW1wb3J0IHtwcm9wZXJ0eSwgcmVtb3RlLCBTdXBlcnR5cGUsIHN1cGVydHlwZUNsYXNzfSBmcm9tICcuL2RlY29yYXRvcnMnO1xuaW1wb3J0IHtCaW5kYWJsZSwgUGVyc2lzdGFibGUsIFJlbW90ZWFibGV9IGZyb20gJy4vc2V0dXBFeHRlbmRzJztcbmltcG9ydCAqIGFzIFNlc3Npb25zIGZyb20gJy4vaGVscGVycy9TZXNzaW9ucyc7XG5pbXBvcnQgKiBhcyBTdWJzY3JpcHRpb25zIGZyb20gJy4vaGVscGVycy9TdWJzY3JpcHRpb25zJztcbmltcG9ydCB7ZGVmZXIsIGRlbGF5fSBmcm9tICcuL2hlbHBlcnMvVXRpbGl0aWVzJztcbmltcG9ydCAqIGFzIENoYW5nZXMgZnJvbSAnLi9oZWxwZXJzL0NoYW5nZXMnO1xuaW1wb3J0ICogYXMgQ2hhbmdlR3JvdXBzIGZyb20gJy4vaGVscGVycy9DaGFuZ2VHcm91cHMnO1xuaW1wb3J0IHtwcm9jZXNzQ2FsbH0gZnJvbSBcIi4vaGVscGVycy9Qcm9jZXNzQ2FsbFwiO1xuXG5kZWNsYXJlIHZhciBkZWZpbmU7XG5cbi8vIEBUT0RPOiBDaGVjayBpZiB3ZSBhdHRhY2ggUHJvbWlzZSBhcyBhIGtleXdvcmQgaW4gdGhlIHdlYnBhY2sgYnVpbGRcbihmdW5jdGlvbihyb290LCBmYWN0b3J5KSB7XG5cdCd1c2Ugc3RyaWN0Jztcblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXHRcdGRlZmluZShbJ3VuZGVyc2NvcmUnLCAnQGhhdmVubGlmZS9zdXBlcnR5cGUnXSwgZmFjdG9yeSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KHJlcXVpcmUoJ3VuZGVyc2NvcmUnKSwgcmVxdWlyZSgnQGhhdmVubGlmZS9zdXBlcnR5cGUnKSk7XG5cdH0gZWxzZSB7XG5cdFx0cm9vdC5SZW1vdGVPYmplY3RUZW1wbGF0ZSA9IGZhY3Rvcnkocm9vdC5fLCByb290Lk9iamVjdFRlbXBsYXRlKTtcblx0fVxufSkodGhpcywgZnVuY3Rpb24gKF8sIFN1cGVydHlwZU1vZHVsZSkge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIE9iamVjdFRlbXBsYXRlID0gU3VwZXJ0eXBlTW9kdWxlLmRlZmF1bHQ7XG5cdGNvbnN0IFJlbW90ZU9iamVjdFRlbXBsYXRlOiBTZW1vdHVzID0gT2JqZWN0VGVtcGxhdGUuX2NyZWF0ZU9iamVjdCgpO1xuXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl91c2VHZXR0ZXJzU2V0dGVycyA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnO1xuXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLnJvbGUgPSAnY2xpZW50JztcblxuXHRpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5yb2xlID0gJ3NlcnZlcic7XG5cdH1cblxuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fX2NoYW5nZVRyYWNraW5nX18gPSB0cnVlOyAvLyBTZXQgX19jaGFuZ2VkX18gd2hlbiBzZXR0ZXIgZmlyZXNcblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX19jb25mbGljdE1vZGVfXyA9ICdoYXJkJztcblxuXHQvKioqKioqKioqKioqKioqKioqKioqKioqKioqKiBQdWJsaWMgSW50ZXJmYWNlICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUubG9nTGV2ZWwgPSAwO1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5tYXhDbGllbnRTZXF1ZW5jZSA9IDE7XG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLm5leHRPYmpJZCA9IDE7XG5cblx0LyoqXG5cdCAqIEBUT0RFTEVURVxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IGxldmVsIHVua25vd25cblx0ICogQHBhcmFtIHt1bmtub3dufSBkYXRhIHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLmxvZyA9IGZ1bmN0aW9uIGxvZyhsZXZlbCwgZGF0YSkge1xuXHRcdC8vIE9CU09MRVRFXG5cdFx0aWYgKGxldmVsID4gdGhpcy5sb2dMZXZlbCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGxldCBleHRyYUlEID0gJyc7XG5cblx0XHRpZiAodGhpcy5yZXFTZXNzaW9uICYmIHRoaXMucmVxU2Vzc2lvbi5sb2dnaW5nSUQpIHtcblx0XHRcdGV4dHJhSUQgPSAnLScgKyB0aGlzLnJlcVNlc3Npb24ubG9nZ2luZ0lEO1xuXHRcdH1cblxuXHRcdGNvbnN0IHQgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0Y29uc3QgdGltZSA9XG5cdFx0XHR0LmdldEZ1bGxZZWFyKCkgK1xuXHRcdFx0Jy0nICtcblx0XHRcdCh0LmdldE1vbnRoKCkgKyAxKSArXG5cdFx0XHQnLScgK1xuXHRcdFx0dC5nZXREYXRlKCkgK1xuXHRcdFx0JyAnICtcblx0XHRcdHQudG9UaW1lU3RyaW5nKCkucmVwbGFjZSgvIC4qLywgJycpICtcblx0XHRcdCc6JyArXG5cdFx0XHR0LmdldE1pbGxpc2Vjb25kcygpO1xuXG5cdFx0Y29uc3QgbWVzc2FnZSA9IHRpbWUgKyAnKCcgKyB0aGlzLmN1cnJlbnRTZXNzaW9uICsgZXh0cmFJRCArICcpICcgKyAnUmVtb3RlT2JqZWN0VGVtcGxhdGU6JyArIGRhdGE7XG5cblx0XHR0aGlzLmxvZ2dlci5pbmZvKG1lc3NhZ2UpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBPYnRhaW4gYSBzZXNzaW9uIGZvciB0cmFja2luZyBzdWJzY3JpcHRpb25zXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gcm9sZSB1bmtub3duXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gc2VuZE1lc3NhZ2UgdW5rbm93blxuXHQgKiBAcGFyYW0ge3Vua25vd259IHNlc3Npb25JZCB1bmtub3duXG5cdCAqXG5cdCAqIEByZXR1cm5zIHsqfSB1bmtub3duXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5jcmVhdGVTZXNzaW9uID0gZnVuY3Rpb24gY3JlYXRlU2Vzc2lvbihyb2xlLCBzZW5kTWVzc2FnZTogU2VuZE1lc3NhZ2UsIHNlc3Npb25JZCkge1xuXHRcdHJldHVybiBTZXNzaW9ucy5jcmVhdGUodGhpcywgcm9sZSwgc2VuZE1lc3NhZ2UsIHNlc3Npb25JZCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlbW92ZSB0aGUgc2Vzc2lvbiBmcm9tIHRoZSBzZXNzaW9ucyBtYXAsIHJlamVjdGluZyBhbnkgb3V0c3RhbmRpbmcgcHJvbWlzZXNcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZXNzaW9uSWQgdW5rbm93blxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuZGVsZXRlU2Vzc2lvbiA9IGZ1bmN0aW9uIGRlbGV0ZVNlc3Npb24oc2Vzc2lvbklkOiBzdHJpbmcgfCBudW1iZXIpIHtcblx0XHRyZXR1cm4gU2Vzc2lvbnMucmVtb3ZlKHRoaXMsIHNlc3Npb25JZClcblx0fTtcblxuXHQvKipcblx0ICogQWZ0ZXIgcmVzeW5jaHJvbml6aW5nIHNlc3Npb25zIHdlIG5lZWQgdG8gc2V0IGEgbmV3IHNlcXVlbmNlIG51bWJlciB0byBiZSB1c2VkIGluXG5cdCAqIG5ldyBvYmplY3RzIHRvIGF2b2lkIGNvbmZsaWN0cyB3aXRoIGFueSBleGlzdGluZyBvbmVzIHRoZSByZW1vdGUgc2Vzc2lvbiBtYXkgaGF2ZVxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IG5leHRPYmpJZCB1bmtub3duXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5zZXRNaW5pbXVtU2VxdWVuY2UgPSBmdW5jdGlvbiBzZXRNaW5pbXVtU2VxdWVuY2UobmV4dE9iaklkKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG4gICAgICAgIHNlc3Npb24ubmV4dE9iaklkID0gTWF0aC5tYXgobmV4dE9iaklkLCBzZXNzaW9uLm5leHRPYmpJZCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFNhdmUgdGhlIHNlc3Npb24gZGF0YSBpbiBhIHdheSB0aGF0IGNhbiBiZSBzZXJpYWxpemVkL2RlLXNlcmlhbGl6ZWRcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZXNzaW9uSWQgdW5rbm93blxuXHQgKlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSB1bmtub3duXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5zYXZlU2Vzc2lvbiA9IGZ1bmN0aW9uIHNhdmVTZXNzaW9uKHNlc3Npb25JZCkge1xuXHRcdHJldHVybiBTZXNzaW9ucy5zYXZlKHRoaXMsIHNlc3Npb25JZCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIEEgcHVibGljIGZ1bmN0aW9uIHRvIGRldGVybWluZSB3aGV0aGVyIHRoZXJlIGFyZSByZW1vdGUgY2FsbHMgaW4gcHJvZ3Jlc3Ncblx0ICpcblx0ICogQHBhcmFtIHtTdHJpbmd9IHNlc3Npb25JZCBVbmlxdWUgaWRlbnRpZmllciBmcm9tIHdoaWNoIHRoZSBzZXNzaW9uIGlzIGZldGNoZWQuXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1iZXIgb2YgcmVtb3RlIGNhbGxzIHBlbmRpbmcgaW4gdGhlIHNlc3Npb24uXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5nZXRQZW5kaW5nQ2FsbENvdW50ID0gZnVuY3Rpb24gZ2V0UGVuZGluZ0NhbGxDb3VudChzZXNzaW9uSWQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldCh0aGlzLCBzZXNzaW9uSWQpO1xuXG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKHNlc3Npb24ucGVuZGluZ1JlbW90ZUNhbGxzKS5sZW5ndGg7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlc3RvcmUgc2Vzc2lvbiB0aGF0IHdhcyBwb3RlbnRpYWxseSBzZXJpYWxpemVkL2RlLXNlYXJpYWxpemVkXG5cdCAqXG5cdCAqIEEgcmV2aXNpb24gbnVtYmVyIGlzIHVzZWQgdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlIGluLW1lbW9yeSBjb3B5IGlzIGdvb2Rcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZXNzaW9uSWQgLSB0aGUgaWQgdW5kZXIgd2hpY2ggaXQgd2FzIGNyZWF0ZWQgd2l0aCBjcmVhdGVTZXNzaW9uXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gc2F2ZWRTZXNzaW9uIC0gdGhlIFBPSk8gdmVyc2lvbiBvZiB0aGUgc2VzaW9uIGRhdGFcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZW5kTWVzc2FnZSAtIG5ldyBtZXNzYWdlIGZ1bmN0aW9uIHRvIGJlIGluIGVmZmVjdFxuXHQgKlxuXHQgKiBAcmV0dXJucyB7Qm9vbGVhbn0gZmFsc2UgbWVhbnMgdGhhdCBtZXNzYWdlcyB3ZXJlIGluIGZsaWdodCBhbmQgYSByZXNldCBpcyBuZWVkZWRcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLnJlc3RvcmVTZXNzaW9uID0gZnVuY3Rpb24gcmVzdG9yZVNlc3Npb24oc2Vzc2lvbklkLCBzYXZlZFNlc3Npb246IFNhdmVkU2Vzc2lvbiwgc2VuZE1lc3NhZ2U6IFNlbmRNZXNzYWdlKSB7XG5cdFx0cmV0dXJuIFNlc3Npb25zLnJlc3RvcmUodGhpcywgc2Vzc2lvbklkLCBzYXZlZFNlc3Npb24sIHNlbmRNZXNzYWdlKTtcblx0fTtcblxuXHQvKipcblx0ICogSW5kaWNhdGUgdGhhdCBhbGwgY2hhbmdlcyBoYXZlIGJlZW4gYWNjZXB0ZWQgb3V0c2lkZSBvZiB0aGUgbWVzc2FnZVxuXHQgKiBtZWNoYW5pc20gYXMgd291bGQgdXN1YWxseSBoYXBwZW4gd2hlbiBhIHNlc3Npb24gaXMgc3RhcnRpbmcgdXBcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZXNzaW9uSWQgdW5rbm93blxuXHQgKi9cblxuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5zeW5jU2Vzc2lvbiA9IGZ1bmN0aW9uIHN5bmNTZXNzaW9uKHNlc3Npb25JZCkge1xuXHRcdHJldHVybiBTZXNzaW9ucy5zeW5jKHRoaXMsIHNlc3Npb25JZCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFNldCB0aGUgY3VycmVudCBzZXNzaW9uIHRvIGEgc2Vzc2lvbiBpZCByZXR1cm5lZCBmcm9tIGNyZWF0ZVNlc3Npb24oKVxuXHQgKiBSZWxpZXMgb24gYSBzaW5nbGUgdGhyZWFkZWQgbW9kZWwgc3VjaCBhcyBub2RlLmpzXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gc2Vzc2lvbklkIHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLnNldFNlc3Npb24gPSBmdW5jdGlvbiBzZXRTZXNzaW9uKHNlc3Npb25JZCkge1xuXHRcdHRoaXMuY3VycmVudFNlc3Npb24gPSBzZXNzaW9uSWQ7XG5cdH07XG5cblx0LyoqXG5cdCAqIEVuYWJsZS9EaXNhYmxlIHNlbmRpbmcgb2YgbWVzc2FnZXMgYW5kIG9wdGlvbmFsbHkgcHJvdmlkZSBhIG5ldyBjYWxsYmFja1xuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IHZhbHVlIGJvb2xlYW4gdG8gZW5hYmxlL2Rpc2FibGVcblx0ICogQHBhcmFtIHt1bmtub3dufSBtZXNzYWdlQ2FsbGJhY2sgb3B0aW9uYWwgY2FsbCBiYWNrIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gc2Vzc2lvbklkIG9wdGlvbmFsIHNlc3Npb24gaWRcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLmVuYWJsZVNlbmRNZXNzYWdlID0gZnVuY3Rpb24gZW5hYmxlU2VuZE1lc3NhZ2UodmFsdWUsIG1lc3NhZ2VDYWxsYmFjaywgc2Vzc2lvbklkKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcywgc2Vzc2lvbklkKTtcblx0XHRzZXNzaW9uLnNlbmRNZXNzYWdlRW5hYmxlZCA9IHZhbHVlO1xuXG5cdFx0aWYgKG1lc3NhZ2VDYWxsYmFjaykge1xuXHRcdFx0c2Vzc2lvbi5zZW5kTWVzc2FnZSA9IG1lc3NhZ2VDYWxsYmFjaztcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIFN1YnNjcmliZSB0byBjaGFuZ2VzIGFuZCBvcHRpb25hbGx5IGVzdGFibGlzaCBzdWJzY3JpcHRpb24gYXMgdGhlXG5cdCAqIHNvbGUgcmVjaXBpZW50IG9mIHJlbW90ZSBjYWxsIG1lc3NhZ2VzLiAgQ2hhbmdlIHRyYWNraW5nIGlzIHRoZW4gbWFuYWdlZFxuXHQgKiBieSB0aGUgZnVuY3Rpb25zIHRoYXQgZm9sbG93LlxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IHJvbGUgdW5rbm93blxuXHQgKiBAcGFyYW0ge3Vua25vd259IHNlbmRNZXNzYWdlIGFuZCBvcHRpb25hbCBjYWxsIGJhY2sgZm9yIHNlbmRpbmcgbWVzc2FnZXNcblx0ICpcblx0ICogQHJldHVybnMgeyp9IHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLnN1YnNjcmliZSA9IGZ1bmN0aW9uIHN1YnNjcmliZShyb2xlKSB7XG5cdFx0cmV0dXJuIFN1YnNjcmlwdGlvbnMuc3Vic2NyaWJlKHRoaXMsIHJvbGUpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBQcm9jZXNzIGEgcmVtb3RlIGNhbGwgbWVzc2FnZSB0aGF0IHdhcyBjcmVhdGVkIGFuZCBwYXNzZWQgdG8gdGhlIHNlbmRNZXNzYWdlIGNhbGxiYWNrXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gcmVtb3RlQ2FsbCAtIGtleS92YWx1ZSBzZXQgY29udGFpbmluZyB0aGUgcmVtb3RlIGNhbGwgZGV0YWlscyBhbmQgcGVuZGluZyBzeW5jIGNobmFnZXNcblx0ICogQHBhcmFtIHt1bmtub3dufSBzdWJzY3JpcHRpb25JZCAtIHVua25vd25cblx0ICogQHBhcmFtIHt1bmtub3dufSByZXN0b3JlU2Vzc2lvbkNhbGxiYWNrIC0gdW5rbm93blxuXHQgKlxuXHQgKiBAcmV0dXJucyB7dW5rbm93bn0gdW5rbm93blxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUucHJvY2Vzc01lc3NhZ2UgPSBmdW5jdGlvbiBwcm9jZXNzTWVzc2FnZShyZW1vdGVDYWxsLCBzdWJzY3JpcHRpb25JZCwgcmVzdG9yZVNlc3Npb25DYWxsYmFjaykge1xuXHRcdGlmICghcmVtb3RlQ2FsbCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGxldCBjYWxsQ29udGV4dDtcblx0XHRsZXQgaGFkQ2hhbmdlcyA9IDA7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cdFx0Y29uc3QgcmVtb3RlQ2FsbElkID0gcmVtb3RlQ2FsbC5yZW1vdGVDYWxsSWQ7XG5cblx0XHRzd2l0Y2ggKHJlbW90ZUNhbGwudHlwZSkge1xuXHRcdFx0Y2FzZSAncGluZyc6XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmluZm8oe1xuXHRcdFx0XHRcdGNvbXBvbmVudDogJ3NlbW90dXMnLFxuXHRcdFx0XHRcdG1vZHVsZTogJ3Byb2Nlc3NNZXNzYWdlJyxcblx0XHRcdFx0XHRhY3Rpdml0eTogJ3BpbmcnXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZXNzaW9uLnNlbmRNZXNzYWdlKHsgdHlwZTogJ3BpbmdlZCcsIHN5bmM6IHRydWUsIHZhbHVlOiBudWxsLCBuYW1lOiBudWxsLCBjaGFuZ2VzOiBudWxsIH0pO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnc3luYyc6XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmluZm8oeyBjb21wb25lbnQ6ICdzZW1vdHVzJywgbW9kdWxlOiAncHJvY2Vzc01lc3NhZ2UnLCBhY3Rpdml0eTogJ3N5bmMnIH0pO1xuXG5cdFx0XHRcdC8vIEFwcGx5IGFueSBwZW5kaW5nIGNoYW5nZXMgcGFzc2VkIGFsb25nIGFzIHBhcnQgb2YgdGhlIGNhbGwgYW5kIHRoZW4gZWl0aGVyXG5cdFx0XHRcdC8vIENhbGwgdGhlIG1ldGhvZCwgc2VuZGluZyBiYWNrIHRoZSByZXN1bHQgaW4gYSByZXNwb25zZSBtZXNzYWdlXG5cdFx0XHRcdC8vIG9yIHJldHVybiBhbiBlcnJvciByZXNwb25zZSBzbyB0aGUgY2FsbGVyIHdpbGwgcm9sbCBiYWNrXG5cdFx0XHRcdGlmICghdGhpcy5fYXBwbHlDaGFuZ2VzKEpTT04ucGFyc2UocmVtb3RlQ2FsbC5jaGFuZ2VzKSwgdGhpcy5yb2xlID09ICdjbGllbnQnLCBzdWJzY3JpcHRpb25JZCkpIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Y29tcG9uZW50OiAnc2Vtb3R1cycsXG5cdFx0XHRcdFx0XHRcdG1vZHVsZTogJ3Byb2Nlc3NNZXNzYWdlJyxcblx0XHRcdFx0XHRcdFx0YWN0aXZpdHk6ICdzeW5jRXJyb3InXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0J0NvdWxkIG5vdCBhcHBseSBjaGFuZ2VzIG9uIHN5bmMgbWVzc2FnZSdcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdHRoaXMuX2NvbnZlcnRBcnJheVJlZmVyZW5jZXNUb0NoYW5nZXMoKTtcblx0XHRcdFx0XHR0aGlzLl9kZWxldGVDaGFuZ2VzKCk7XG5cdFx0XHRcdFx0dGhpcy5fcHJvY2Vzc1F1ZXVlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnY2FsbCc6XG5cdFx0XHRcdGlmICh0aGlzLm1lbVNlc3Npb24gJiYgdGhpcy5tZW1TZXNzaW9uLnNlbW90dXMpIHtcblx0XHRcdFx0XHRpZiAoIXRoaXMubWVtU2Vzc2lvbi5zZW1vdHVzLmNhbGxTdGFydFRpbWUpIHtcblx0XHRcdFx0XHRcdHRoaXMubWVtU2Vzc2lvbi5zZW1vdHVzLmNhbGxTdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly9UT0RPOiBXaHkgaXMgdGhpcyBub3QgYW4gZWxzZSBpZiBjbGF1c2U/XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5tZW1TZXNzaW9uLnNlbW90dXMuY2FsbFN0YXJ0VGltZSArIHRoaXMubWF4Q2FsbFRpbWUgPiBuZXcgRGF0ZSgpLmdldFRpbWUoKSkge1xuXHRcdFx0XHRcdFx0XHRkZWxheSg1MDAwKS50aGVuKFxuXHRcdFx0XHRcdFx0XHRcdGZ1bmN0aW9uIGEoKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcG9uZW50OiAnc2Vtb3R1cycsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0bW9kdWxlOiAncHJvY2Vzc01lc3NhZ2UnLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGFjdGl2aXR5OiAnYmxvY2tpbmdDYWxsJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjYWxsOiByZW1vdGVDYWxsLm5hbWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzZXF1ZW5jZTogcmVtb3RlQ2FsbC5zZXF1ZW5jZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVtb3RlQ2FsbC5uYW1lXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0c2Vzc2lvbi5zZW5kTWVzc2FnZSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICdyZXNwb25zZScsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN5bmM6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VzOiAnJyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmVtb3RlQ2FsbElkOiByZW1vdGVDYWxsSWRcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fZGVsZXRlQ2hhbmdlcygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fcHJvY2Vzc1F1ZXVlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fS5iaW5kKHRoaXMpXG5cdFx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbENvbnRleHQgPSB7cmV0cmllczogMCwgc3RhcnRUaW1lOiBuZXcgRGF0ZSgpfTtcblxuXHRcdFx0XHRjb25zdCBwYXlsb2FkOiBQcm9jZXNzQ2FsbFBheWxvYWQgPSB7XG5cdFx0XHRcdFx0Y2FsbENvbnRleHQ6IGNhbGxDb250ZXh0LFxuXHRcdFx0XHRcdHJlbW90ZUNhbGw6IHJlbW90ZUNhbGwsXG5cdFx0XHRcdFx0cmVzdG9yZVNlc3Npb25DYWxsYmFjazogcmVzdG9yZVNlc3Npb25DYWxsYmFjayxcblx0XHRcdFx0XHRzZW1vdHVzOiB0aGlzLFxuXHRcdFx0XHRcdHNlc3Npb246IHNlc3Npb24sXG5cdFx0XHRcdFx0c3Vic2NyaXB0aW9uSWQ6IHN1YnNjcmlwdGlvbklkLFxuXHRcdFx0XHRcdHJlbW90ZUNhbGxJZDogcmVtb3RlQ2FsbElkXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybiBwcm9jZXNzQ2FsbChwYXlsb2FkKTtcblxuXHRcdFx0Y2FzZSAncmVzcG9uc2UnOlxuXHRcdFx0Y2FzZSAnZXJyb3InOlxuXHRcdFx0XHRsZXQgZG9Qcm9jZXNzUXVldWUgPSB0cnVlO1xuXG5cdFx0XHRcdHRoaXMubG9nZ2VyLmluZm8oe1xuXHRcdFx0XHRcdGNvbXBvbmVudDogJ3NlbW90dXMnLFxuXHRcdFx0XHRcdG1vZHVsZTogJ3Byb2Nlc3NNZXNzYWdlJyxcblx0XHRcdFx0XHRhY3Rpdml0eTogcmVtb3RlQ2FsbC50eXBlLFxuXHRcdFx0XHRcdGRhdGE6IHsgY2FsbDogcmVtb3RlQ2FsbC5uYW1lLCBzZXF1ZW5jZTogcmVtb3RlQ2FsbC5zZXF1ZW5jZSB9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdC8vIElmIHdlIGFyZSBvdXQgb2Ygc3luYyBxdWV1ZSB1cCBhIHNldCBSb290IGlmIG9uIHNlcnZlci4gIFRoaXMgY291bGQgb2NjdXJcblx0XHRcdFx0Ly8gaWYgYSBzZXNzaW9uIGlzIHJlc3RvcmVkIGJ1dCB0aGVpciBhcmUgcGVuZGluZyBjYWxsc1xuXHRcdFx0XHRpZiAoIXNlc3Npb24ucGVuZGluZ1JlbW90ZUNhbGxzW3JlbW90ZUNhbGxJZF0pIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Y29tcG9uZW50OiAnc2Vtb3R1cycsXG5cdFx0XHRcdFx0XHRcdG1vZHVsZTogJ3Byb2Nlc3NNZXNzYWdlJyxcblx0XHRcdFx0XHRcdFx0YWN0aXZpdHk6IHJlbW90ZUNhbGwudHlwZSxcblx0XHRcdFx0XHRcdFx0ZGF0YTogeyBjYWxsOiByZW1vdGVDYWxsLm5hbWUsIHNlcXVlbmNlOiByZW1vdGVDYWxsLnNlcXVlbmNlIH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHQnTm8gcmVtb3RlIGNhbGwgcGVuZGluZydcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmICh0eXBlb2YgcmVtb3RlQ2FsbC5zeW5jICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdFx0aWYgKHJlbW90ZUNhbGwuc3luYykge1xuXHRcdFx0XHRcdFx0XHRpZiAoc2Vzc2lvbi5wZW5kaW5nUmVtb3RlQ2FsbHNbcmVtb3RlQ2FsbElkXS5kZWZlcnJlZC5yZXNvbHZlKSB7XG5cdFx0XHRcdFx0XHRcdFx0aGFkQ2hhbmdlcyA9IHRoaXMuX2FwcGx5Q2hhbmdlcyhKU09OLnBhcnNlKHJlbW90ZUNhbGwuY2hhbmdlcyksIHRydWUsIHN1YnNjcmlwdGlvbklkKTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZW1vdGVDYWxsLnR5cGUgPT0gJ2Vycm9yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2Vzc2lvbi5wZW5kaW5nUmVtb3RlQ2FsbHNbcmVtb3RlQ2FsbElkXS5kZWZlcnJlZC5yZWplY3QocmVtb3RlQ2FsbC52YWx1ZSk7XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNlc3Npb24ucGVuZGluZ1JlbW90ZUNhbGxzW3JlbW90ZUNhbGxJZF0uZGVmZXJyZWQucmVzb2x2ZShcblx0XHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fZnJvbVRyYW5zcG9ydChKU09OLnBhcnNlKHJlbW90ZUNhbGwudmFsdWUpKVxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3JvbGxiYWNrQ2hhbmdlcygpO1xuXHRcdFx0XHRcdFx0XHRzZXNzaW9uLnBlbmRpbmdSZW1vdGVDYWxsc1tyZW1vdGVDYWxsSWRdLmRlZmVycmVkLnJlamVjdCh7XG5cdFx0XHRcdFx0XHRcdFx0Y29kZTogJ2ludGVybmFsX2Vycm9yX3JvbGxiYWNrJyxcblx0XHRcdFx0XHRcdFx0XHR0ZXh0OiAnQW4gaW50ZXJuYWwgZXJyb3Igb2NjdXJlZCdcblx0XHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucm9sZSA9PSAnY2xpZW50Jykge1xuXHRcdFx0XHRcdFx0XHRcdC8vIGNsaWVudC5qcyBpbiBhbW9ycGhpYyB3aWxsIHRha2UgY2FyZSBvZiB0aGlzXG5cdFx0XHRcdFx0XHRcdFx0ZG9Qcm9jZXNzUXVldWUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGRlbGV0ZSBzZXNzaW9uLnBlbmRpbmdSZW1vdGVDYWxsc1tyZW1vdGVDYWxsSWRdO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGRvUHJvY2Vzc1F1ZXVlKSB7XG5cdFx0XHRcdFx0dGhpcy5fcHJvY2Vzc1F1ZXVlKCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gaGFkQ2hhbmdlcyA9PSAyO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogQ3JlYXRlIGEgc2VyaWFsaXplZCBzZXNzaW9uIGZvciBhbW9ycGhpYyByZWNyZWF0aW5nIHRoZSBzZXNzaW9uIG9iamVjdFxuXHQgKiBtYXAgYWxvbmcgdGhlIHdheSB0byByZWxlYXNlIHJlZmVyZW5jZXMgdG8gb2JqZWN0cyBubyBsb25nZXIgaW5cblx0ICpcblx0ICogQHJldHVybnMgeyp9IHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLnNlcmlhbGl6ZUFuZEdhcmJhZ2VDb2xsZWN0ID0gZnVuY3Rpb24gc2VyaWFsaXplQW5kR2FyYmFnZUNvbGxlY3QoKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cdFx0Y29uc3QgaWRNYXAgPSB7fTtcblx0XHRsZXQgb2JqZWN0S2V5ID0gJyc7XG5cdFx0bGV0IHByb3BLZXkgPSAnJztcblx0XHRjb25zdCBpdGVtc0JlZm9yZSA9IGNvdW50KHNlc3Npb24ub2JqZWN0cyk7XG5cdFx0Y29uc3Qgc2VyaWFsID0gc2VyaWFsaXplLmNhbGwodGhpcywgdGhpcy5jb250cm9sbGVyKTtcblx0XHRzZXNzaW9uLm9iamVjdHMgPSBpZE1hcDtcblx0XHRjb25zdCBpdGVtc0FmdGVyID0gY291bnQoaWRNYXApO1xuXG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoe1xuXHRcdFx0Y29tcG9uZW50OiAnc2Vtb3R1cycsXG5cdFx0XHRtb2R1bGU6ICdzZXJpYWxpemVBbmRHYXJiYWdlQ29sbGVjdCcsXG5cdFx0XHRhY3Rpdml0eTogJ3Bvc3QnLFxuXHRcdFx0ZGF0YTogeyBvYmplY3RzRnJlZWQ6IGl0ZW1zQWZ0ZXIgLSBpdGVtc0JlZm9yZSwgc2Vzc2lvblNpemVLQjogTWF0aC5mbG9vcihzZXJpYWwubGVuZ3RoIC8gMTAwMCkgfVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHNlcmlhbDtcblxuXHRcdGZ1bmN0aW9uIHNlcmlhbGl6ZShvYmopIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShvYmosIGZ1bmN0aW9uIHkoa2V5LCB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmIChrZXkgPT09ICdfX29iamVjdFRlbXBsYXRlX18nIHx8IGtleSA9PT0gJ2Ftb3JwaGljJykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICh2YWx1ZSAmJiB2YWx1ZS5fX3RlbXBsYXRlX18gJiYgdmFsdWUuX19pZF9fKSB7XG5cdFx0XHRcdFx0XHRvYmplY3RLZXkgPSBrZXk7XG5cdFx0XHRcdFx0XHRpZiAoaWRNYXBbdmFsdWUuX19pZF9fXSkge1xuXHRcdFx0XHRcdFx0XHR2YWx1ZSA9IHsgX19pZF9fOiB2YWx1ZS5fX2lkX18udG9TdHJpbmcoKSB9O1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0aWRNYXBbdmFsdWUuX19pZF9fLnRvU3RyaW5nKCldID0gdmFsdWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHByb3BLZXkgPSBrZXk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29tcG9uZW50OiAnc2Vtb3R1cycsXG5cdFx0XHRcdFx0XHRtb2R1bGU6ICdzZXJpYWxpemVBbmRHYXJiYWdlQ29sbGVjdCcsXG5cdFx0XHRcdFx0XHRhY3Rpdml0eTogJ3Bvc3QnLFxuXHRcdFx0XHRcdFx0ZGF0YTogeyBsYXN0X29iamVjdF9yZWY6IG9iamVjdEtleSwgbGFzdF9wcm9wX3JlZjogcHJvcEtleSB9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQnRXJyb3Igc2VyaWFsaXppbmcgc2Vzc2lvbiAnICsgZS5tZXNzYWdlICsgZS5zdGFja1xuXHRcdFx0XHQpO1xuXHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb3VudChpZE1hcCkge1xuXHRcdFx0bGV0IGl4ID0gMDtcblxuXHRcdFx0Xy5tYXAoaWRNYXAsIGZ1bmN0aW9uIHcoKSB7XG5cdFx0XHRcdGl4Kys7XG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIGl4O1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogUGljayB1cCBuZXh0IG1lc3NhZ2UgKGFsdGVybmF0ZSBpbnRlcmZhY2UgdG8gdXNpbmcgYSBjYWxsYmFjaylcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZXNzaW9uSWQgdW5rbm93blxuXHQgKiBAcGFyYW0ge3Vua25vd259IGZvcmNlTWVzc2FnZSB1bmtub3duXG5cdCAqXG5cdCAqIEByZXR1cm5zIHsqfSB0aGUgbWVzc2FnZSBvciBudWxsXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5nZXRNZXNzYWdlID0gZnVuY3Rpb24gZ2V0TWVzc2FnZShzZXNzaW9uSWQsIGZvcmNlTWVzc2FnZSkge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gU2Vzc2lvbnMuZ2V0KHRoaXMsIHNlc3Npb25JZCk7XG5cdFx0bGV0IG1lc3NhZ2UgPSBzZXNzaW9uLnJlbW90ZUNhbGxzLnNoaWZ0KCk7XG5cblx0XHRpZiAobWVzc2FnZSkge1xuXHRcdFx0Y29uc3QgcmVtb3RlQ2FsbElkID0gc2Vzc2lvbi5uZXh0UGVuZGluZ1JlbW90ZUNhbGxJZCsrO1xuXHRcdFx0bWVzc2FnZS5yZW1vdGVDYWxsSWQgPSByZW1vdGVDYWxsSWQ7XG5cdFx0XHRzZXNzaW9uLnBlbmRpbmdSZW1vdGVDYWxsc1tyZW1vdGVDYWxsSWRdID0gbWVzc2FnZTtcblx0XHR9IGVsc2UgaWYgKGZvcmNlTWVzc2FnZSkge1xuXHRcdFx0bWVzc2FnZSA9IHtcblx0XHRcdFx0dHlwZTogJ3N5bmMnLFxuXHRcdFx0XHRzeW5jOiB0cnVlLFxuXHRcdFx0XHR2YWx1ZTogbnVsbCxcblx0XHRcdFx0bmFtZTogbnVsbCxcblx0XHRcdFx0cmVtb3RlQ2FsbElkOiBudWxsLFxuXHRcdFx0XHRjaGFuZ2VzOiBKU09OLnN0cmluZ2lmeSh0aGlzLmdldENoYW5nZXMoKSlcblx0XHRcdH07XG5cdFx0XHR0aGlzLl9kZWxldGVDaGFuZ2VzKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH07XG5cblx0LyoqXG5cdCAqIENsZWFyIGFueSBwZW5kaW5nIGNhbGxzIChuZWVkZWQgd2hlbiB5b3UgZXhwaXJlIGEgc2Vzc2lvbilcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBzZXNzaW9uSWQgdW5rbm93blxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuY2xlYXJQZW5kaW5nQ2FsbHMgPSBmdW5jdGlvbiBjbGVhclBlbmRpbmdDYWxscyhzZXNzaW9uSWQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldCh0aGlzLCBzZXNzaW9uSWQpO1xuXHRcdHNlc3Npb24ucmVtb3RlQ2FsbHMgPSBbXTtcblx0fTtcblxuXHQvKipcbiAqIFBpY2sgdXAgYWxsIG1lc3NhZ2VzXG4gKlxuICogQHBhcmFtIHt1bmtub3dufSB0eXBlIHVua25vd25cbiAqIEBwYXJhbSB7dW5rbm93bn0gc3Vic2NyaXB0aW9uSWQgdW5rbm93blxuICpcbiAqIEByZXR1cm5zIHtbXX0gdGhlIG1lc3NhZ2VzIGluIGFuIGFycmF5XG4gKlxuIFJlbW90ZU9iamVjdFRlbXBsYXRlLmdldE1lc3NhZ2VzID0gZnVuY3Rpb24oc2Vzc2lvbklkKSB7XG4gICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldCh0aGlzLCBzZXNzaW9uSWQpO1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gW107XG4gICAgY29uc3QgbWVzc2FnZTtcbiAgICB3aGlsZSAobWVzc2FnZSA9IHNlc3Npb24ucmVtb3RlQ2FsbHMuc2hpZnQoKSlcbiAgICB7XG4gICAgICAgIGNvbnN0IHJlbW90ZUNhbGxJZCA9IHNlc3Npb24ubmV4dFBlbmRpbmdSZW1vdGVDYWxsSWQrKztcbiAgICAgICAgbWVzc2FnZS5yZW1vdGVDYWxsSWQgPSByZW1vdGVDYWxsSWQ7XG4gICAgICAgIG1lc3NhZ2VzLnB1c2gobWVzc2FnZSk7XG4gICAgfVxuICAgIHJldHVybiBtZXNzYWdlcztcbn1cbiAqL1xuXHQvKipcblx0ICogUmV0cmlldmUgYSBjaGFuZ2UgZ3JvdXAgZnJvbSBhIHN1YnNjcmlwdGlvblxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IHN1YnNjcmlwdGlvbklkIHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMge3Vua25vd259IHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLmdldENoYW5nZXMgPSBmdW5jdGlvbiBnZXRDaGFuZ2VzKHN1YnNjcmlwdGlvbklkKSB7XG5cdFx0aWYgKCF0aGlzLl91c2VHZXR0ZXJzU2V0dGVycykge1xuXHRcdFx0Q2hhbmdlcy5nZW5lcmF0ZSh0aGlzKTtcblx0XHR9XG5cblx0XHR0aGlzLl9jb252ZXJ0QXJyYXlSZWZlcmVuY2VzVG9DaGFuZ2VzKCk7XG5cdFx0Y29uc3QgY2hhbmdlcyA9IENoYW5nZUdyb3Vwcy5nZXRQcm9wQ2hhbmdlR3JvdXAoc3Vic2NyaXB0aW9uSWQsIHRoaXMpO1xuXG5cdFx0cmV0dXJuIGNoYW5nZXM7XG5cdH07XG5cblx0LyoqXG5cdCAqIERpYWdub3N0aWMgZnVuY3Rpb24gdG8gcmV0dXJuIHN1bW1hcnkgb2YgY2hhbmdlcyAobGVuZ3RocyBvZiBjaGFuZ2UgZ3JvdXBzKVxuXHQgKlxuXHQgKiBAcmV0dXJucyB7dW5rbm93bn0gdW5rbm93blxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuZ2V0Q2hhbmdlU3RhdHVzID0gZnVuY3Rpb24gZ2V0Q2hhbmdlU3RhdHVzKCkge1xuICAgICAgICBTZXNzaW9ucy5nZXQodGhpcyk7IC8vIG5lY2Vzc2FyeT9cblxuXHRcdGxldCBhID0gMDtcblx0XHRsZXQgYyA9IDA7XG5cblx0XHRmb3IgKHZhciBzdWJzY3JpcHRpb25JZCBpbiB0aGlzLnN1YnNjcmlwdGlvbnMpIHtcblx0XHRcdGNvbnN0IGNoYW5nZXMgPSBDaGFuZ2VHcm91cHMuZ2V0UHJvcENoYW5nZUdyb3VwKHN1YnNjcmlwdGlvbklkLCB0aGlzKTtcblxuXHRcdFx0YyArPSBPYmplY3Qua2V5cyhjaGFuZ2VzKS5sZW5ndGg7XG5cblx0XHRcdGNvbnN0IGFycmF5cyA9IENoYW5nZUdyb3Vwcy5nZXRBcnJheUNoYW5nZUdyb3VwKCdhcnJheScsIHN1YnNjcmlwdGlvbklkLCB0aGlzKTtcblxuXHRcdFx0YSArPSBPYmplY3Qua2V5cyhhcnJheXMpLmxlbmd0aDtcblx0XHR9XG5cblx0XHRyZXR1cm4gYSArICcgYXJyYXlzICcgKyBjICsgJyBjaGFuZ2VzICc7XG5cdH07XG5cblx0LyoqXG5cdCAqIEdpdmUgYW4gb2JqZWN0IGEgdW5pcXVlIGlkIGFuZCBzdGFzaCBhbiBvYmplY3QgaW50byB0aGUgZ2xvYmFsIG9iamVjdCBzdG9yZVxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IG9iaiB0byBiZSBzdGFzaGVkXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gdGVtcGxhdGUgb2Ygb2JqZWN0XG5cdCAqXG5cdCAqIEByZXR1cm5zIHt1bmtub3dufSB1bmtub3duXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fc3Rhc2hPYmplY3QgPSBmdW5jdGlvbiBzdGFzaE9iamVjdChvYmosIHRlbXBsYXRlKSB7XG5cdFx0Y29uc3QgZXhlY3V0ZUluaXQgPSAhIXRoaXMubmV4dERpc3BlbnNlSWQ7IC8vIElmIGNvbWluZyBmcm9tIGNyZWF0ZUVtcHR5T2JqZWN0XG5cblx0XHRpZiAoIW9iai5fX2lkX18pIHtcblx0XHRcdC8vIElmIHRoaXMgY29tZXMgZnJvbSBhIGRlbGF5ZWQgc2Vzc2lvbml6ZSBjYWxsIGRvbid0IGNoYW5nZSB0aGUgaWRcblx0XHRcdGNvbnN0IG9iamVjdElkID0gdGhpcy5uZXh0RGlzcGVuc2VJZCB8fCB0aGlzLnJvbGUgKyAnLScgKyB0ZW1wbGF0ZS5fX25hbWVfXyArICctJyArIHRoaXMubmV4dE9iaklkKys7XG5cdFx0XHRvYmouX19pZF9fID0gb2JqZWN0SWQ7XG5cdFx0fVxuXHRcdHRoaXMubmV4dERpc3BlbnNlSWQgPSBudWxsO1xuXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcywgdW5kZWZpbmVkKTsgLy8gTWF5IG5vdCBoYXZlIG9uZSBpZiBjYWxsZWQgZnJvbSBuZXdcblx0XHRpZiAoIXRoaXMuX190cmFuc2llbnRfXyAmJiBzZXNzaW9uKSB7XG5cdFx0XHRzZXNzaW9uLm9iamVjdHNbb2JqLl9faWRfX10gPSBvYmo7XG5cdFx0fVxuXG5cdFx0aWYgKG9iai5fX2lkX18ubWF0Y2goL15jbGllbnQuKj8tKFswLTldKikkLykpIHtcblx0XHRcdC8vIEB0cy1pZ25vcmVcblx0XHRcdHRoaXMubWF4Q2xpZW50U2VxdWVuY2UgPSBNYXRoLm1heCh0aGlzLm1heENsaWVudFNlcXVlbmNlLCBSZWdFeHAuJDEpO1xuXHRcdFx0dGhpcy5uZXh0T2JqSWQgPSBNYXRoLm1heCh0aGlzLm1heENsaWVudFNlcXVlbmNlLCB0aGlzLm5leHRPYmpJZCkgKyAxO1xuXHRcdH1cblxuXHRcdHJldHVybiBleGVjdXRlSW5pdDtcblx0fTtcblxuXHQvKipcblx0ICogUGxhY2UgYW4gb2JqZWN0IHdpdGhpbiB0aGUgY3VycmVudCBzZXNzaW9uIGJ5XG5cdCAqIGEpIHBvcHVsYXRpbmcgIHRoZSBvYmplY3RzIF9fb2JqZWN0VGVtcGxhdGVfXyBwcm9wZXJ0eVxuXHQgKiBiKSBwcm9jZXNzaW5nIGFueSBwZW5kaW5nIGFycmF5IHJlZmVyZW5jZXNcblx0ICogYykgcHJvY2Vzc2luZyBhbnkgcGVuZGluZyBjaGFuZ2VzXG5cdCAqIGQpIHNlc3Npb25pemluZyBhbnkgcmVmZXJlbmNlZCBvYmplY3RzXG5cdCAqIGUpIGluamVjdGluZyBhbW9ycGhpY2F0ZSBpbnRvIHRoZSBvYmplY3Rcblx0ICogQHJldHVybnMgeyp9IHJldHVybnMgdGhlIG9iamVjdCBzbyB5b3UgY2FuIHVzZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuc2Vzc2lvbml6ZSA9IGZ1bmN0aW9uKG9iaiwgcmVmZXJlbmNpbmdPYmopIHtcblx0XHQvLyBOb3JtYWxseSBwYXNzZWQgYSByZWZlcmVuY2luZ09iamVjdCBmcm9tIHdoaWNoIHdlIGNhbiBnZXQgYW4gb2JqZWN0VGVtcGxhdGVcblx0XHQvLyBCdXQgaW4gdGhlIHRoZSBjYXNlIHdoZXJlIHRoZSBhcHAgY2FsbHMgc2Vzc2lvbml6ZSB0aGUgb2JqZWN0IHRlbXBsYXRlIGlzIGJvdW5kIHRvIHRoaXNcblx0XHRjb25zdCBvYmplY3RUZW1wbGF0ZSA9IHJlZmVyZW5jaW5nT2JqID8gcmVmZXJlbmNpbmdPYmouX19vYmplY3RUZW1wbGF0ZV9fIDogdGhpcztcblxuXHRcdC8vIE5vdGhpbmcgdG8gZG8gaWYgb2JqZWN0IGFscmVhZHkgc2Vzc2lvbml6ZWQgb3Igb2JqZWN0IGlzIHRyYW5zaWVudCAobWVhbmluZyBubyBjaGFuZ2VzIGFjY3VtdWxhdGVkKVxuXHRcdGlmIChvYmouX19vYmplY3RUZW1wbGF0ZV9fIHx8IG9iai5fX3RyYW5zaWVudF9fKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly8gSWYgdGhlIHJlZmVyZW5jaW5nIG9iamVjdCBoYWQgYW4gb2JqZWN0IHRlbXBsYXRlIHdlIGdldCB0byB3b3JrIHNlc3Npb25pemluZyB0aGlzIG9iamVjdFxuXHRcdC8vIGFuZCBhbGwgb2JqZWN0cyBpdCB3YXMgcmVmZXJlbmNpbmdcblx0XHRpZiAob2JqZWN0VGVtcGxhdGUpIHtcblx0XHRcdC8vIFNldCB0aGUgb2JqZWN0IHByb3BlcnRpZXMgKF9fb2JqZWN0VGVtcGxhdGVfXyBtZWFucyBpdCBpcyBzZXNzaW9uaXplZCBhbmRcblx0XHRcdC8vIGFtb3JwaGljIHdoaWNoIHdhcyBpbnRpYWxpemVkIHdpdGggYSBzdGF0aWMgT2JqZWN0VGVtcGxhdGUgZ2V0cyB1cGRhdGVkIHdpdGggdGhlIHNlc3Npb25pemVkIG9uZVxuXHRcdFx0Ly8gRm9yIHRoZSBiZW5lZml0IG9mIHRoZSBhcHAgdGhhdCBtYXkgd2FudCB0byBtYW51YWxsIHNlc3Npb25pemUgd2UgcHJvdmlkZSBhbW9ycGhpY2F0ZVxuXHRcdFx0b2JqLl9fb2JqZWN0VGVtcGxhdGVfXyA9IG9iamVjdFRlbXBsYXRlO1xuXHRcdFx0b2JqLmFtb3JwaGljID0gb2JqZWN0VGVtcGxhdGU7XG5cdFx0XHRvYmouYW1vcnBoaWNhdGUgPSBSZW1vdGVPYmplY3RUZW1wbGF0ZS5zZXNzaW9uaXplLmJpbmQob2JqZWN0VGVtcGxhdGUpO1xuXG5cdFx0XHQvLyBIZXJlIGlzIHdoZXJlIHRoZSBvYmplY3QgaXMgc3RvcmVkIGluIHRoZSBzZXNzaW9uXG5cdFx0XHR0aGlzLl9zdGFzaE9iamVjdChvYmosIG9iai5fX3RlbXBsYXRlX18sIHRoaXMpO1xuXG5cdFx0XHQvLyBQcm9jZXNzIGFueSBhcnJheSByZWZlcmVuY2VzIGJ5IGNvbXBsZXRpbmcgdGhlIHJlZmVyZW5jZSBwcm9jZXNzaW5nIHRoYXQgd2FzIHN0YXNoZWQgcHJlLXNlc3Npb25pemF0aW9uXG5cdFx0XHRpZiAob2JqLl9fcGVuZGluZ0FycmF5UmVmZXJlbmNlc19fKSB7XG5cdFx0XHRcdHRoaXMuX3JlZmVyZW5jZWRBcnJheShvYmopO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBQcm9jZXNzIGFueSBub24tYXJyYXkgY2hhbmdlcyB0aGF0IHdlcmUgc3Rhc2hlZFxuXHRcdFx0aWYgKG9iai5fX3BlbmRpbmdDaGFuZ2VzX18pIHtcblx0XHRcdFx0b2JqLl9fcGVuZGluZ0NoYW5nZXNfXy5mb3JFYWNoKGZ1bmN0aW9uKHBhcmFtcykge1xuXHRcdFx0XHRcdG9iamVjdFRlbXBsYXRlLl9jaGFuZ2VkVmFsdWUuYXBwbHkob2JqZWN0VGVtcGxhdGUsIHBhcmFtcyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRvYmouX19wZW5kaW5nQ2hhbmdlc19fID0gdW5kZWZpbmVkO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTcHJlYWQgdGhlIGxvdmUgdG8gb2JqZWN0cyB0aGF0IHRoZSBvYmplY3QgbWF5IGhhdmUgcmVmZXJlbmNlZFxuXHRcdFx0aWYgKG9iai5fX3JlZmVyZW5jZWRPYmplY3RzX18pIHtcblx0XHRcdFx0Zm9yICh2YXIgaWQgaW4gb2JqLl9fcmVmZXJlbmNlZE9iamVjdHNfXykge1xuXHRcdFx0XHRcdGNvbnN0IHJlZmVyZW5jZWRPYmogPSBvYmouX19yZWZlcmVuY2VkT2JqZWN0c19fW2lkXTtcblx0XHRcdFx0XHRvYmplY3RUZW1wbGF0ZS5zZXNzaW9uaXplKHJlZmVyZW5jZWRPYmosIG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdFx0b2JqLl9fcmVmZXJlbmNlZE9iamVjdHNfXyA9IHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBvYmo7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlZmVyZW5jaW5nT2JqLl9fcmVmZXJlbmNlZE9iamVjdHNfXyA9IHJlZmVyZW5jaW5nT2JqLl9fcmVmZXJlbmNlZE9iamVjdHNfXyB8fCB7fTtcblx0XHRcdHJlZmVyZW5jaW5nT2JqLl9fcmVmZXJlbmNlZE9iamVjdHNfX1tvYmouX19pZF9fXSA9IG9iajtcblx0XHR9XG5cdFx0cmV0dXJuIG9iajtcblx0fTtcblxuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5faW5qZWN0SW50b1RlbXBsYXRlID0gZnVuY3Rpb24gaW5qZWN0SW50b1RlbXBsYXRlKHRlbXBsYXRlKSB7XG5cdFx0T2JqZWN0VGVtcGxhdGUuX2luamVjdEludG9UZW1wbGF0ZSh0ZW1wbGF0ZSk7XG5cdH07XG5cblx0LyoqXG5cdCAqIEZ1bmN0aW9uIGNhbGxlZCB0byB3cmFwIGEgZnVuY3Rpb24gYXMgcmVtb3RlIGNhbGwgdGhhdCByZXR1cm5zIGEgcHJvbWlzZVxuXHQgKiB0aGF0IGlzIHdyYXBwZWQgc3VjaCB0aGF0IFwidGhpc1wiIHBvaW50cyB0byB0aGUgb2JqZWN0LiAgVGhpcyBpcyBvbmx5IGRvbmVcblx0ICogaWYgdGhpcyBpcyBhIHJlbW90ZSBmdW5jdGlvbiwgbWVhbmluZyB0aGF0IHRoZSByb2xlIGVzdGFibGlzaGVkIHdoZW4gZGVmaW5pbmdcblx0ICogdGhlIHRlbXBsYXRlIGlzIGRpZmZlcmVudCB0aGFuIHRoZSByb2xlIGZvciBSZW1vdGVPYmplY3RUZW1wbGF0ZSBhcyBhIHdob2xlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IHByb3BlcnR5TmFtZSAtIHRoZSBuYW1lIG9mIHRoZSBmdW5jdGlvblxuXHQgKiBAcGFyYW0ge3Vua25vd259IHByb3BlcnR5VmFsdWUgLSB0aGUgZnVuY3Rpb24gdG8gYmUgd3JhcHBlZFxuXHQgKiBAcGFyYW0ge3Vua25vd259IHJvbGUgdW5rbm93blxuXHQgKiBAcGFyYW0ge3Vua25vd259IHZhbGlkYXRlIHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMgeyp9IC0gdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIG9yIGEgd3JhcHBlciB0byBtYWtlIGEgcmVtb3RlIGNhbGxcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9zZXR1cEZ1bmN0aW9uID0gZnVuY3Rpb24gc2V0dXBGdW5jdGlvbihcblx0XHRwcm9wZXJ0eU5hbWUsXG5cdFx0cHJvcGVydHlWYWx1ZSxcblx0XHRyb2xlLFxuXHRcdHZhbGlkYXRlLFxuXHRcdHNlcnZlclZhbGlkYXRpb24sXG5cdFx0dGVtcGxhdGVcblx0KSB7XG5cdFx0LyoqIEB0eXBlIHtSZW1vdGVPYmplY3RUZW1wbGF0ZX0gKi9cblx0XHRsZXQgb2JqZWN0VGVtcGxhdGUgPSB0aGlzO1xuXHRcdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdFx0aWYgKCFyb2xlIHx8IHJvbGUgPT0gdGhpcy5yb2xlKSB7XG5cdFx0XHRpZiAocm9sZSA9PT0gJ3NlcnZlcicpIHtcblx0XHRcdFx0cHJvcGVydHlWYWx1ZS5zZXJ2ZXJWYWxpZGF0aW9uID0gc2VydmVyVmFsaWRhdGlvbjtcblx0XHRcdH1cblx0XHRcdHJldHVybiBwcm9wZXJ0eVZhbHVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBGdW5jdGlvbiB3cmFwcGVyIGl0IHNlbGYgd2lsbCByZXR1cm4gYSBwcm9taXNlIHdyYXBwZWQgdG8gc2V0dXAgdGhlIHRoaXMgcG9pbnRlclxuXHRcdFx0Ly8gdGhlIGZ1bmN0aW9uIGJvZHkgd2lsbCBxdWV1ZSBhIHJlbW90ZSBjYWxsIHRvIHRoZSBjbGllbnQvc2VydmVyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gcmVtb3RlRnVuY3Rpb25XcmFwcGVyKCkge1xuXHRcdFx0XHRpZiAodGhpcy5fX29iamVjdFRlbXBsYXRlX18pIHtcblx0XHRcdFx0XHRvYmplY3RUZW1wbGF0ZSA9IHRoaXMuX19vYmplY3RUZW1wbGF0ZV9fO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHZhbGlkYXRlICYmIHRoaXMuY29udHJvbGxlcikge1xuXHRcdFx0XHRcdC8vVE9ETzogbWFrZSB0aGlzIG9uZSBpZiBzdGF0ZW1lbnRcblx0XHRcdFx0XHRpZiAoIXZhbGlkYXRlLmNhbGwodGhpcy5jb250cm9sbGVyKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCd2YWxpZGF0aW9uIGZhaWx1cmUnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRzZWxmLmxvZ2dlci5pbmZvKHtcblx0XHRcdFx0XHRjb21wb25lbnQ6ICdzZW1vdHVzJyxcblx0XHRcdFx0XHRtb2R1bGU6ICdzZXR1cEZ1bmN0aW9uJyxcblx0XHRcdFx0XHRhY3Rpdml0eTogJ3ByZScsXG5cdFx0XHRcdFx0ZGF0YTogeyBjYWxsOiBwcm9wZXJ0eU5hbWUgfVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0Y29uc3QgZGVmZXJyZWQgPSBkZWZlcigpO1xuXHRcdFx0XHRvYmplY3RUZW1wbGF0ZS5fcXVldWVSZW1vdGVDYWxsKHRoaXMuX19pZF9fLCBwcm9wZXJ0eU5hbWUsIGRlZmVycmVkLCBhcmd1bWVudHMpO1xuXG5cdFx0XHRcdGlmIChzZWxmLmNvbnRyb2xsZXIgJiYgc2VsZi5jb250cm9sbGVyLmhhbmRsZVJlbW90ZUVycm9yKSB7XG5cdFx0XHRcdFx0ZGVmZXJyZWQucHJvbWlzZS5vcmlnaW5hbFRoZW4gPSBkZWZlcnJlZC5wcm9taXNlLnRoZW47XG5cdFx0XHRcdFx0bGV0IGhhbmRsZWRSZWplY3Rpb24gPSBmYWxzZTtcblxuXHRcdFx0XHRcdGRlZmVycmVkLnByb21pc2UudGhlbiA9IGZ1bmN0aW9uIGMocmVzLCByZWosIG5vdCkge1xuXHRcdFx0XHRcdFx0aWYgKHJlaikge1xuXHRcdFx0XHRcdFx0XHRoYW5kbGVkUmVqZWN0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlLm9yaWdpbmFsVGhlbihyZXMsIHJlaiwgbm90KTtcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0ZGVsYXkoMCkudGhlbihmdW5jdGlvbiBkKCkge1xuXHRcdFx0XHRcdFx0aWYgKCFoYW5kbGVkUmVqZWN0aW9uKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlLnRoZW4obnVsbCwgZnVuY3Rpb24gZShlcnJvcikge1xuXHRcdFx0XHRcdFx0XHRcdHNlbGYuY29udHJvbGxlciAmJiBzZWxmLmNvbnRyb2xsZXIuaGFuZGxlUmVtb3RlRXJyb3IoZXJyb3IpO1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuXHRcdFx0fTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIE92ZXJyaWRkZW4gbWV0aG9kIGluIE9iamVjdFRlbXBsYXRlIHRoYXQgY3JlYXRlcyBhIHN0cnVjdHVyZSBpbml0aWFsaXplIGEgcHJvcGVydHkgaW4gY29uc3RydWN0b3Jcblx0ICogYW5kIGFkZHMgYW55IGdldHRlcnMgYW5kIHNldHRlcnMgdG8gdGhlIHByb3BlcnR5IHNvIGNoYW5nZXMgY2FuIGJlIHRyYWNrZWRcblx0ICpcblx0ICpcblx0ICogVGhpcyB0cmlnZ2VycyB3aGVuZXZlciBwcm9wZXJ0aWVzIGFyZSBjcmVhdGVkXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gcHJvcGVydHlOYW1lIC0gdGhlIG5hbWUgb2YgdGhlIHByb3BlcnR5XG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gZGVmaW5lUHJvcGVydHkgLSB0aGUgcHJvcGVydHkgZGVmaW5pdGlvbiBhcyBwYXNzZWQgdG8gT2JqZWN0VGVtcGxhdGVcblx0ICogQHBhcmFtIHt1bmtub3dufSBvYmplY3RQcm9wZXJ0aWVzIC0gdGhlIHByb3BlcnR5IGRlZmluaXRpb25zIHRoYXQgd2lsbCBiZSBoYW5kIHByb2Nlc3NlZFxuXHQgKiBAcGFyYW0ge3Vua25vd259IGRlZmluZVByb3BlcnRpZXMgLSB0aGUgcHJvcGVydHkgZGVmaW5pdGlvbnMgdG8gYmUgcHJvY2Vzc2VkIGJ5IE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX3NldHVwUHJvcGVydHkgPSBmdW5jdGlvbiBzZXR1cFByb3BlcnR5KFxuXHRcdHByb3BlcnR5TmFtZSxcblx0XHRkZWZpbmVQcm9wZXJ0eSxcblx0XHRvYmplY3RQcm9wZXJ0aWVzLFxuXHRcdGRlZmluZVByb3BlcnRpZXNcblx0KSB7XG5cdFx0Ly9kZXRlcm1pbmUgd2hldGhlciB2YWx1ZSBuZWVkcyB0byBiZSByZS1pbml0aWFsaXplZCBpbiBjb25zdHJ1Y3RvclxuXHRcdGxldCB2YWx1ZSA9IG51bGw7XG5cblx0XHRpZiAodHlwZW9mIGRlZmluZVByb3BlcnR5LnZhbHVlICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dmFsdWUgPSBkZWZpbmVQcm9wZXJ0eS52YWx1ZTtcblx0XHR9XG5cblx0XHRpZiAob2JqZWN0UHJvcGVydGllcykge1xuXHRcdFx0aWYgKGRlZmluZVByb3BlcnR5LmlzVmlydHVhbCkge1xuXHRcdFx0XHRvYmplY3RQcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV0gPSB7XG5cdFx0XHRcdFx0aW5pdDogdW5kZWZpbmVkLFxuXHRcdFx0XHRcdHR5cGU6IGRlZmluZVByb3BlcnR5LnR5cGUsXG5cdFx0XHRcdFx0b2Y6IGRlZmluZVByb3BlcnR5Lm9mLFxuXHRcdFx0XHRcdGJ5VmFsdWU6ICEoXG5cdFx0XHRcdFx0XHR0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJyB8fFxuXHRcdFx0XHRcdFx0dHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fFxuXHRcdFx0XHRcdFx0dHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyB8fFxuXHRcdFx0XHRcdFx0dmFsdWUgPT0gbnVsbFxuXHRcdFx0XHRcdClcblx0XHRcdFx0fTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG9iamVjdFByb3BlcnRpZXNbcHJvcGVydHlOYW1lXSA9IHtcblx0XHRcdFx0XHRpbml0OiB2YWx1ZSxcblx0XHRcdFx0XHR0eXBlOiBkZWZpbmVQcm9wZXJ0eS50eXBlLFxuXHRcdFx0XHRcdG9mOiBkZWZpbmVQcm9wZXJ0eS5vZixcblx0XHRcdFx0XHRieVZhbHVlOiAhKFxuXHRcdFx0XHRcdFx0dHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicgfHxcblx0XHRcdFx0XHRcdHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgfHxcblx0XHRcdFx0XHRcdHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgfHxcblx0XHRcdFx0XHRcdHZhbHVlID09IG51bGxcblx0XHRcdFx0XHQpXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gT25lIHByb3BlcnR5IGZvciByZWFsIG5hbWUgd2hpY2ggd2lsbCBoYXZlIGEgZ2V0dGVyIGFuZCBzZXR0ZXJcblx0XHQvLyBhbmQgYW5vdGhlciBwcm9wZXJ0eSBmb3IgdGhlIGFjdHVhbCB2YWx1ZSBfX3Byb3BlcnR5bmFtZVxuXHRcdGRlZmluZVByb3BlcnRpZXNbcHJvcGVydHlOYW1lXSA9IGRlZmluZVByb3BlcnR5O1xuXHRcdGRlZmluZVByb3BlcnRpZXNbJ19fJyArIHByb3BlcnR5TmFtZV0gPSB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSB9O1xuXG5cdFx0Ly8gTW92ZSB1c2VyIGdldHRlcnMgYW5kIHNldHRlcnMgdG8gdGhlaXIgb3duIHByb3BlcnR5XG5cdFx0aWYgKGRlZmluZVByb3BlcnR5LmdldCAmJiAhZGVmaW5lUHJvcGVydHkudXNlckdldCAmJiAhZGVmaW5lUHJvcGVydHkuZGVmaW5lUHJvcGVydHlQcm9jZXNzZWQpIHtcblx0XHRcdGRlZmluZVByb3BlcnR5LnVzZXJHZXQgPSBkZWZpbmVQcm9wZXJ0eS5nZXQ7XG5cdFx0XHRkZWxldGUgZGVmaW5lUHJvcGVydHkuZ2V0O1xuXHRcdH1cblxuXHRcdGlmIChkZWZpbmVQcm9wZXJ0eS5zZXQgJiYgIWRlZmluZVByb3BlcnR5LnVzZXJTZXQgJiYgIWRlZmluZVByb3BlcnR5LmRlZmluZVByb3BlcnR5UHJvY2Vzc2VkKSB7XG5cdFx0XHRkZWZpbmVQcm9wZXJ0eS51c2VyU2V0ID0gZGVmaW5lUHJvcGVydHkuc2V0O1xuXHRcdFx0ZGVsZXRlIGRlZmluZVByb3BlcnR5LnNldDtcblx0XHR9XG5cblx0XHRkZWZpbmVQcm9wZXJ0eS5kZWZpbmVQcm9wZXJ0eVByb2Nlc3NlZCA9IHRydWU7XG5cdFx0Y29uc3QgdXNlckdldHRlciA9IGRlZmluZVByb3BlcnR5LnVzZXJHZXQ7XG5cdFx0Y29uc3QgdXNlclNldHRlciA9IGRlZmluZVByb3BlcnR5LnVzZXJTZXQ7XG5cblx0XHQvLyBJbiB0aGUgY2FzZSB3aGVyZSB0aGVyZSBhcmUgbm93IGdldHRlcnMgYW5kIHNldHRlcnMsIHRoZSBfX3Byb3AgcmVwcmVzZW50c1xuXHRcdC8vIHRoZSBvcmlnaW5hbCB2YWx1ZVxuXG5cdFx0Ly8gU2V0dGVyXG5cdFx0Y29uc3Qgb2JqZWN0VGVtcGxhdGUgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLl91c2VHZXR0ZXJzU2V0dGVycyAmJiBDaGFuZ2VzLm1hbmFnZShkZWZpbmVQcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGNyZWF0ZUNoYW5nZXMgPSBDaGFuZ2VzLmNyZWF0ZShkZWZpbmVQcm9wZXJ0eSwgdW5kZWZpbmVkLCB0aGlzKTtcblxuXHRcdFx0ZGVmaW5lUHJvcGVydHkuc2V0ID0gKGZ1bmN0aW9uIHNldCgpIHtcblx0XHRcdFx0Ly8gdXNlIGEgY2xvc3VyZSB0byByZWNvcmQgdGhlIHByb3BlcnR5IG5hbWUgd2hpY2ggaXMgbm90IHBhc3NlZCB0byB0aGUgc2V0dGVyXG5cdFx0XHRcdGNvbnN0IHByb3AgPSBwcm9wZXJ0eU5hbWU7XG5cblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uIGYodmFsdWUpIHtcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50T2JqZWN0VGVtcGxhdGUgPSB0aGlzLl9fb2JqZWN0VGVtcGxhdGVfXyA/IHRoaXMuX19vYmplY3RUZW1wbGF0ZV9fIDogb2JqZWN0VGVtcGxhdGU7XG5cblx0XHRcdFx0XHQvLyBTZXNzaW9uaXplIHJlZmVyZW5jZSBpZiBpdCBpcyBtaXNzaW5nIGFuIF9fb2JqZWN0VGVtcGxhdGVfX1xuXHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdGRlZmluZVByb3BlcnR5LnR5cGUgJiZcblx0XHRcdFx0XHRcdGRlZmluZVByb3BlcnR5LnR5cGUuaXNPYmplY3RUZW1wbGF0ZSAmJlxuXHRcdFx0XHRcdFx0dmFsdWUgJiZcblx0XHRcdFx0XHRcdCF2YWx1ZS5fX29iamVjdFRlbXBsYXRlX19cblx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRPYmplY3RUZW1wbGF0ZS5zZXNzaW9uaXplKHZhbHVlLCB0aGlzKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBXaGVuIHdlIGFzc2lnbiBhbiBhcnJheSBnbyB0aHJvdWdoIHRoZSB2YWx1ZXMgYW5kIGF0dGVtcHQgdG8gc2Vzc2lvbml6ZVxuXHRcdFx0XHRcdGlmIChkZWZpbmVQcm9wZXJ0eS5vZiAmJiBkZWZpbmVQcm9wZXJ0eS5vZi5pc09iamVjdFRlbXBsYXRlICYmIHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdHZhbHVlLmZvckVhY2goXG5cdFx0XHRcdFx0XHRcdGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF2YWx1ZS5fX29iamVjdFRlbXBsYXRlX18pIHtcblx0XHRcdFx0XHRcdFx0XHRcdGN1cnJlbnRPYmplY3RUZW1wbGF0ZS5zZXNzaW9uaXplKHZhbHVlLCB0aGlzKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0uYmluZCh0aGlzKVxuXHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAodXNlclNldHRlcikge1xuXHRcdFx0XHRcdFx0dmFsdWUgPSB1c2VyU2V0dGVyLmNhbGwodGhpcywgdmFsdWUpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdCFkZWZpbmVQcm9wZXJ0eS5pc1ZpcnR1YWwgJiZcblx0XHRcdFx0XHRcdHRoaXMuX19pZF9fICYmXG5cdFx0XHRcdFx0XHRjcmVhdGVDaGFuZ2VzICYmXG5cdFx0XHRcdFx0XHR0cmFuc2Zvcm0odGhpc1snX18nICsgcHJvcF0pICE9PSB0cmFuc2Zvcm0odmFsdWUpXG5cdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50T2JqZWN0VGVtcGxhdGUuX2NoYW5nZWRWYWx1ZSh0aGlzLCBwcm9wLCB2YWx1ZSk7XG5cblx0XHRcdFx0XHRcdGlmIChjdXJyZW50T2JqZWN0VGVtcGxhdGUuX19jaGFuZ2VUcmFja2luZ19fKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX19jaGFuZ2VkX18gPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICghZGVmaW5lUHJvcGVydHkuaXNWaXJ0dWFsKSB7XG5cdFx0XHRcdFx0XHR0aGlzWydfXycgKyBwcm9wXSA9IHZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRmdW5jdGlvbiB0cmFuc2Zvcm0oZGF0YSkge1xuXHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRpZiAoZGVmaW5lUHJvcGVydHkudHlwZSA9PSBTdHJpbmcgfHwgZGVmaW5lUHJvcGVydHkudHlwZSA9PSBOdW1iZXIgfHwgIWRhdGEpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChkZWZpbmVQcm9wZXJ0eS50eXBlID09IERhdGUpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRhdGEuZ2V0VGltZSgpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoZGVmaW5lUHJvcGVydHkudHlwZSA9PSBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoZGVmaW5lUHJvcGVydHkub2YuaXNPYmplY3RUZW1wbGF0ZSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChkYXRhLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV0IGRpZ2VzdCA9ICcnO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRmb3IgKHZhciBpeCA9IDA7IGl4IDwgZGF0YS5sZW5ndGg7ICsraXgpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZGlnZXN0ICs9IGRhdGFbaXhdLl9faWRfXztcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGRpZ2VzdDtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuICdbXSc7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChkZWZpbmVQcm9wZXJ0eS50eXBlLmlzT2JqZWN0VGVtcGxhdGUpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGRhdGEuX19pZF9fO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdG9iamVjdFRlbXBsYXRlLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0XHRcdFx0eyBjb21wb25lbnQ6ICdzZW1vdHVzJywgbW9kdWxlOiAnc2V0dGVyJywgYWN0aXZpdHk6ICdzdGluZ2lmeScsIGRhdGE6IHsgcHJvcGVydHk6IHByb3AgfSB9LFxuXHRcdFx0XHRcdFx0XHQnY2F1Z2h0IGV4Y2VwdGlvbiB0cnlpbmcgdG8gc3RyaW5naWZ5ICcgKyBwcm9wXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KSgpO1xuXG5cdFx0XHQvLyBHZXR0ZXJcblx0XHRcdGRlZmluZVByb3BlcnR5LmdldCA9IChmdW5jdGlvbiBnKCkge1xuXHRcdFx0XHQvLyB1c2UgY2xvc3VyZSB0byByZWNvcmQgcHJvcGVydHkgbmFtZSB3aGljaCBpcyBub3QgcGFzc2VkIHRvIHRoZSBnZXR0ZXJcblx0XHRcdFx0Y29uc3QgcHJvcCA9IHByb3BlcnR5TmFtZTtcblxuXHRcdFx0XHRyZXR1cm4gZnVuY3Rpb24geigpIHtcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50T2JqZWN0VGVtcGxhdGUgPSB0aGlzLl9fb2JqZWN0VGVtcGxhdGVfXyA/IHRoaXMuX19vYmplY3RUZW1wbGF0ZV9fIDogb2JqZWN0VGVtcGxhdGU7XG5cblx0XHRcdFx0XHRpZiAoIWRlZmluZVByb3BlcnR5LmlzVmlydHVhbCAmJiB0aGlzWydfXycgKyBwcm9wXSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHRjdXJyZW50T2JqZWN0VGVtcGxhdGUuX3JlZmVyZW5jZWRBcnJheSh0aGlzLCBwcm9wLCB0aGlzWydfXycgKyBwcm9wXSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHVzZXJHZXR0ZXIpIHtcblx0XHRcdFx0XHRcdHJldHVybiB1c2VyR2V0dGVyLmNhbGwodGhpcywgdGhpc1snX18nICsgcHJvcF0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpc1snX18nICsgcHJvcF07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0fSkoKTtcblx0XHR9IGVsc2UgaWYgKGRlZmluZVByb3BlcnR5LnVzZXJHZXQgfHwgZGVmaW5lUHJvcGVydHkudXNlclNldCkge1xuXHRcdFx0ZGVmaW5lUHJvcGVydHkuc2V0ID0gKGZ1bmN0aW9uIGgoKSB7XG5cdFx0XHRcdC8vIHVzZSBhIGNsb3N1cmUgdG8gcmVjb3JkIHRoZSBwcm9wZXJ0eSBuYW1lIHdoaWNoIGlzIG5vdCBwYXNzZWQgdG8gdGhlIHNldHRlclxuXHRcdFx0XHRjb25zdCBwcm9wID0gcHJvcGVydHlOYW1lO1xuXG5cdFx0XHRcdHJldHVybiBmdW5jdGlvbiBpKHZhbHVlKSB7XG5cdFx0XHRcdFx0aWYgKHVzZXJTZXR0ZXIpIHtcblx0XHRcdFx0XHRcdHZhbHVlID0gdXNlclNldHRlci5jYWxsKHRoaXMsIHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWRlZmluZVByb3BlcnR5LmlzVmlydHVhbCkge1xuXHRcdFx0XHRcdFx0dGhpc1snX18nICsgcHJvcF0gPSB2YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9KSgpO1xuXG5cdFx0XHRkZWZpbmVQcm9wZXJ0eS5nZXQgPSAoZnVuY3Rpb24gaigpIHtcblx0XHRcdFx0Ly8gVXNlIGNsb3N1cmUgdG8gcmVjb3JkIHByb3BlcnR5IG5hbWUgd2hpY2ggaXMgbm90IHBhc3NlZCB0byB0aGUgZ2V0dGVyXG5cdFx0XHRcdGNvbnN0IHByb3AgPSBwcm9wZXJ0eU5hbWU7XG5cblx0XHRcdFx0cmV0dXJuIGZ1bmN0aW9uIGsoKSB7XG5cdFx0XHRcdFx0aWYgKHVzZXJHZXR0ZXIpIHtcblx0XHRcdFx0XHRcdGlmIChkZWZpbmVQcm9wZXJ0eS5pc1ZpcnR1YWwpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHVzZXJHZXR0ZXIuY2FsbCh0aGlzLCB1bmRlZmluZWQpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRyZXR1cm4gdXNlckdldHRlci5jYWxsKHRoaXMsIHRoaXNbJ19fJyArIHByb3BdKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXNbJ19fJyArIHByb3BdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH0pKCk7XG5cblx0XHRcdGlmICghZGVmaW5lUHJvcGVydHkuaXNWaXJ0dWFsKSB7XG5cdFx0XHRcdGRlZmluZVByb3BlcnRpZXNbJ19fJyArIHByb3BlcnR5TmFtZV0gPSB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSB9O1xuXHRcdFx0fVxuXG5cdFx0XHRkZWxldGUgZGVmaW5lUHJvcGVydHkudmFsdWU7XG5cdFx0XHRkZWxldGUgZGVmaW5lUHJvcGVydHkud3JpdGFibGU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChvYmplY3RQcm9wZXJ0aWVzKSB7XG5cdFx0XHRcdG9iamVjdFByb3BlcnRpZXNbJ19fJyArIHByb3BlcnR5TmFtZV0gPSBvYmplY3RQcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gU2V0dGVycyBhbmQgR2V0dGVycyBjYW5ub3QgaGF2ZSB2YWx1ZSBvciBiZSB3cml0YWJsZVxuICAgICAgICBpZiAodGhpcy5fdXNlR2V0dGVyc1NldHRlcnMgJiYgQ2hhbmdlcy5tYW5hZ2UoZGVmaW5lUHJvcGVydHkpKSB7XG5cdFx0XHRkZWxldGUgZGVmaW5lUHJvcGVydHkudmFsdWU7XG5cdFx0XHRkZWxldGUgZGVmaW5lUHJvcGVydHkud3JpdGFibGU7XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBEaXNhYmxlIGNoYW5nZSB0cmFja2luZyBmb3IgZHVyYXRpb24gb2Ygc3luY2hyb25vdXMgcHJvY2Vzc2luZyBjYWxsYmFja1xuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IGNiIHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLndpdGhvdXRDaGFuZ2VUcmFja2luZyA9IGZ1bmN0aW9uIHdpdGhvdXRDaGFuZ2VUcmFja2luZyhjYikge1xuXHRcdGNvbnN0IHByZXZDaGFuZ2VUcmFja2luZyA9IHRoaXMuX19jaGFuZ2VUcmFja2luZ19fO1xuXHRcdHRoaXMuX19jaGFuZ2VUcmFja2luZ19fID0gZmFsc2U7XG5cdFx0Y2IoKTtcblx0XHR0aGlzLl9fY2hhbmdlVHJhY2tpbmdfXyA9IHByZXZDaGFuZ2VUcmFja2luZztcblx0fTtcblxuXHRmdW5jdGlvbiBvYmplY3RPbkNsaWVudE9ubHkocmVtb3RlT2JqZWN0VGVtcGxhdGU6IFNlbW90dXMsIG9iaikge1xuXHRcdHJldHVybiByZW1vdGVPYmplY3RUZW1wbGF0ZS5yb2xlID09ICdjbGllbnQnICYmIG9iai5fX3RlbXBsYXRlX18uX190b1NlcnZlcl9fID09PSBmYWxzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9iamVjdE9uU2VydmVyT25seShyZW1vdGVPYmplY3RUZW1wbGF0ZTogU2Vtb3R1cywgb2JqKSB7XG5cdFx0cmV0dXJuIHJlbW90ZU9iamVjdFRlbXBsYXRlLnJvbGUgPT0gJ3NlcnZlcicgJiYgb2JqLl9fdGVtcGxhdGVfXy5fX3RvQ2xpZW50X18gPT09IGZhbHNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENhbGxlZCBmcm9tIGEgc2V0dGVyIHdoZW4gYSB2YWx1ZSBoYXMgY2hhbmdlZC4gUmVjb3JkIG9sZCBhbmQgbmV3IHZhbHVlc1xuXHQgKiBjaGFuZ2VzIGFyZSBhY2N1bXVsYXRlZCBmb3IgZWFjaCBjaGFuZ2Ugc3Vic2NyaWJlci5cblx0ICogVGhlIGNoYW5nZSBzdHJ1Y3R1cmUgaW4gdGhlIHN1YnNjcmlwdGlvbiBsb2cgaXMgYSBrZXkvdmFsdWUgc3RvcmVcblx0ICogd2hlcmUgdGhlIGtleSBpcyB0aGUgb2JqZWN0IGFuZCBpZCBhbmQgdGhlIHZhbHVlIGlzIGFuIGFycmF5XG5cdCAqIC0gdGhlIGZpcnN0IHBvc2l0aW9uIGluIHRoZSBhcnJheSBpcyB0aGUgb2xkIHZhbHVlXG5cdCAqIC0gYW5kIHRoZSBzZWNvbmQgaXMgdGhlIG5ldyB2YWx1ZVxuXHQgKiBOb3RlIHRoYXQgb2JqZWN0cyBjcmVhdGVkIHdpdGggUmVtb3RlT2JqZWN0VGVtcGxhdGUgaGF2ZSBhbmQgaWQgYW5kIHRoYXRcblx0ICogb25seSB0aGUgaWQgaXMgc3RvcmVkXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gb2JqIHRoZSBvYmplY3QgaW5zdGFuY2Vcblx0ICogQHBhcmFtIHt1bmtub3dufSBwcm9wIHRoZSBvYmplY3QgcHJvcGVydHlcblx0ICogQHBhcmFtIHt1bmtub3dufSB2YWx1ZSB0aGUgbmV3IHZhbHVlXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fY2hhbmdlZFZhbHVlID0gZnVuY3Rpb24gY2hhbmdlZFZhbHVlKG9iaiwgcHJvcCwgdmFsdWUpIHtcblx0XHRpZiAob2JqLl9fdHJhbnNpZW50X18gfHwgb2JqZWN0T25DbGllbnRPbmx5KHRoaXMsIG9iaikgfHwgb2JqZWN0T25TZXJ2ZXJPbmx5KHRoaXMsIG9iaikpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb25zID0gdGhpcy5fZ2V0U3Vic2NyaXB0aW9ucygpO1xuXHRcdGlmICghc3Vic2NyaXB0aW9ucykge1xuXHRcdFx0b2JqLl9fcGVuZGluZ0NoYW5nZXNfXyA9IG9iai5fX3BlbmRpbmdDaGFuZ2VzX18gfHwgW107XG5cdFx0XHRvYmouX19wZW5kaW5nQ2hhbmdlc19fLnB1c2goW29iaiwgcHJvcCwgdmFsdWVdKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRmb3IgKHZhciBzdWJzY3JpcHRpb24gaW4gc3Vic2NyaXB0aW9ucykge1xuXHRcdFx0aWYgKHN1YnNjcmlwdGlvbnNbc3Vic2NyaXB0aW9uXSAhPSB0aGlzLnByb2Nlc3NpbmdTdWJzY3JpcHRpb24pIHtcblx0XHRcdFx0Y29uc3QgY2hhbmdlR3JvdXAgPSBDaGFuZ2VHcm91cHMuZ2V0UHJvcENoYW5nZUdyb3VwKHN1YnNjcmlwdGlvbiwgdGhpcyk7XG5cblx0XHRcdFx0Ly8gR2V0IG5vcm1hbGl6ZWQgdmFsdWVzIHN1YnN0aXR1dGluZyBpZHMgZm9yIE9iamVjdFRlbXBsYXRlIG9iamVjdHNcblx0XHRcdFx0Y29uc3QgbmV3VmFsdWUgPSB0aGlzLl9jb252ZXJ0VmFsdWUodmFsdWUpO1xuXHRcdFx0XHRjb25zdCBvbGRWYWx1ZSA9IHRoaXMuX2NvbnZlcnRWYWx1ZShvYmpbJ19fJyArIHByb3BdKTtcblxuXHRcdFx0XHQvLyBDcmVhdGUgYSBuZXcga2V5IGluIHRoZSBjaGFuZ2UgZ3JvdXAgaWYgbmVlZGVkXG5cdFx0XHRcdGlmICghY2hhbmdlR3JvdXBbb2JqLl9faWRfX10pIHtcblx0XHRcdFx0XHRjaGFuZ2VHcm91cFtvYmouX19pZF9fXSA9IHt9O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gRm9yIHN1YnNlcXVlbnQgY2hhbmdlcyB0byB0aGUgc2FtZSBlbGVtZW50IG9ubHkgc3RvcmUgdGhlIG5ldyB2YWx1ZSBhbmQgbGVhdmVcblx0XHRcdFx0Ly8gdGhlIG9yaWdpbmFsIG9sZCB2YWx1ZSBpbnRhY3Rcblx0XHRcdFx0aWYgKGNoYW5nZUdyb3VwW29iai5fX2lkX19dW3Byb3BdKSB7XG5cdFx0XHRcdFx0Y2hhbmdlR3JvdXBbb2JqLl9faWRfX11bcHJvcF1bMV0gPSBuZXdWYWx1ZTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjaGFuZ2VHcm91cFtvYmouX19pZF9fXVtwcm9wXSA9IFtvbGRWYWx1ZSwgbmV3VmFsdWVdO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdC8qKlxuXHQgKiBDYWxsZWQgZnJvbSBhIGdldHRlciB3aGVuIGFuIGFycmF5IGlzIHJlZmVyZW5jZWQuICBUaGUgdmFsdWUgaXMgdHJhY2tlZFxuXHQgKiBzbyB0aGF0IGl0IGNhbiBiZSBsYXRlciBkZXRlcm1pbmVkIGlmIGFuIGFjdHVhbCBjaGFuZ2Ugb2NjdXJyZWQuXG5cdCAqIFRoZSBhcnJheSBjaGFuZ2UgZ3JvdXAgaXMgYSBrZXkvdmFsdWUgc3RvcmUgd2hlcmUgdGhlIGtleSBpcyB0aGVcblx0ICogYXJyYXkgcmVmZXJlbmNlIGlkZW50aWZpZXIgPG9iamVjdC1pZD4vPHByb3BlcnR5LW5hbWU+IGFuZCB0aGUgdmFsdWVcblx0ICogaXMgdGhlIGN1cnJlbnQgdmFsdWUgb2YgdGhlIGFycmF5LiAgT25seSB0aGUgdmFsdWUgYXQgdGhlIGZpcnN0XG5cdCAqIHJlZmVyZW5jZSBpcyByZWNvcmRlZC5cblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBvYmogdGhlIG9iamVjdCBpbnN0YW5jZVxuXHQgKiBAcGFyYW0ge3Vua25vd259IHByb3AgdGhlIHByb3BlcnR5IG9mIHRoZSBvYmplY3QgKHNob3VsZCBiZSBhbiBhcnJheSlcblx0ICogQHBhcmFtIHt1bmtub3dufSBhcnJheVJlZiB0aGUgdmFsdWUgcmV0dXJuZWQgaW4gdGhlIHJlZmVyZW5jZSAocHJldmlvdXMgdmFsdWUpXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gc2Vzc2lvbklkIHRoZSB2YWx1ZSByZXR1cm5lZCBpbiB0aGUgcmVmZXJlbmNlIChwcmV2aW91cyB2YWx1ZSlcblx0ICpcblx0ICogQHByaXZhdGVcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9yZWZlcmVuY2VkQXJyYXkgPSBmdW5jdGlvbiByZWZlcmVuY2VkQXJyYXkob2JqLCBwcm9wLCBhcnJheVJlZiwgc2Vzc2lvbklkKSB7XG5cdFx0aWYgKG9iai5fX3RyYW5zaWVudF9fIHx8IG9iamVjdE9uQ2xpZW50T25seSh0aGlzLCBvYmopIHx8IG9iamVjdE9uU2VydmVyT25seSh0aGlzLCBvYmopKSB7IC8vIFNob3VsZCBub3QgYmUgdHJhbnNwb3J0ZWRcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBUcmFjayB0aGlzIGZvciBlYWNoIHN1YnNjcmlwdGlvblxuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbnMgPSB0aGlzLl9nZXRTdWJzY3JpcHRpb25zKHNlc3Npb25JZCk7XG5cdFx0aWYgKHN1YnNjcmlwdGlvbnMpIHtcblx0XHRcdC8vIHNlc3Npb25pemVkP1xuXHRcdFx0Ly8gQ3JlYXRlIHRoZSBjaGFuZ2UgZ3JvdXAgZm9yIGFycmF5IHJlZmVyZW5jZXMgYW5kIGZvciBkaXJ0eSB0cmFja2luZyBvZiBhcnJheSByZWZlcmVuY2VzXG5cdFx0XHRwcm9jZXNzU3Vic2NyaXB0aW9ucy5jYWxsKHRoaXMsICdhcnJheScsIG9iai5fX3BlbmRpbmdBcnJheVJlZmVyZW5jZXNfXyk7XG5cdFx0XHRpZiAodGhpcy5fX2NoYW5nZVRyYWNraW5nX18pIHtcblx0XHRcdFx0cHJvY2Vzc1N1YnNjcmlwdGlvbnMuY2FsbCh0aGlzLCAnYXJyYXlEaXJ0eScsIG9iai5fX3BlbmRpbmdBcnJheURpcnR5UmVmZXJlbmNlc19fKTtcblx0XHRcdH1cblx0XHRcdG9iai5fX3BlbmRpbmdBcnJheVJlZmVyZW5jZXNfXyA9IHVuZGVmaW5lZDtcblx0XHRcdG9iai5fX3BlbmRpbmdBcnJheURpcnR5UmVmZXJlbmNlc19fID0gdW5kZWZpbmVkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBSZWNvcmQgdGhlIGNoYW5nZSBncm91cCByaWdodCBpbiB0aGUgb2JqZWN0XG5cdFx0XHRvYmouX19wZW5kaW5nQXJyYXlSZWZlcmVuY2VzX18gPSBvYmouX19wZW5kaW5nQXJyYXlSZWZlcmVuY2VzX18gfHwgW107XG5cdFx0XHRwcm9jZXNzQ2hhbmdlR3JvdXAob2JqLl9fcGVuZGluZ0FycmF5UmVmZXJlbmNlc19fKTtcblx0XHRcdG9iai5fX3BlbmRpbmdBcnJheURpcnR5UmVmZXJlbmNlc19fID0gb2JqLl9fcGVuZGluZ0FycmF5UmVmZXJlbmNlc19fIHx8IFtdO1xuXHRcdFx0cHJvY2Vzc0NoYW5nZUdyb3VwKG9iai5fX3BlbmRpbmdBcnJheURpcnR5UmVmZXJlbmNlc19fKTtcblx0XHR9XG5cblx0XHQvLyBDcmVhdGUgYSBjaGFuZ2UgZ3JvdXAgZW50cmllcyBlaXRoZXIgZnJvbSB0aGUgcmVmZXJlbmNlZCBhcnJheSBvciBmcm9tIGEgcHJldmlvdXNseSBzYXZlZCBjb3B5IG9mIHRoZSBhcnJheVxuXG5cdFx0Ly8gT25seSBhcnJheSBvciBkaXJ0eVxuXHRcdGZ1bmN0aW9uIHByb2Nlc3NTdWJzY3JpcHRpb25zKGNoYW5nZVR5cGU6IEFycmF5VHlwZXMsIGV4aXN0aW5nQ2hhbmdlR3JvdXApIHtcblx0XHRcdGZvciAodmFyIHN1YnNjcmlwdGlvbiBpbiBzdWJzY3JpcHRpb25zKSB7XG5cdFx0XHRcdGNvbnN0IGNoYW5nZUdyb3VwID0gQ2hhbmdlR3JvdXBzLmdldEFycmF5Q2hhbmdlR3JvdXAoY2hhbmdlVHlwZSwgc3Vic2NyaXB0aW9uLCB0aGlzKTtcblx0XHRcdFx0aWYgKHN1YnNjcmlwdGlvbnNbc3Vic2NyaXB0aW9uXSAhPSB0aGlzLnByb2Nlc3NpbmdTdWJzY3JpcHRpb24pIHtcblx0XHRcdFx0XHRpZiAoZXhpc3RpbmdDaGFuZ2VHcm91cCkge1xuXHRcdFx0XHRcdFx0Y29weUNoYW5nZUdyb3VwKGNoYW5nZUdyb3VwLCBleGlzdGluZ0NoYW5nZUdyb3VwKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cHJvY2Vzc0NoYW5nZUdyb3VwKGNoYW5nZUdyb3VwKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRmdW5jdGlvbiBjb3B5Q2hhbmdlR3JvdXAoY2hhbmdlR3JvdXAsIGV4aXN0aW5nQ2hhbmdlR3JvdXApIHtcblx0XHRcdGZvciAodmFyIGtleSBpbiBleGlzdGluZ0NoYW5nZUdyb3VwKSB7XG5cdFx0XHRcdGNoYW5nZUdyb3VwW2tleV0gPSBleGlzdGluZ0NoYW5nZUdyb3VwW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gcHJvY2Vzc0NoYW5nZUdyb3VwKGNoYW5nZUdyb3VwKSB7XG5cdFx0XHRjb25zdCBrZXkgPSBvYmouX19pZF9fICsgJy8nICsgcHJvcDtcblxuXHRcdFx0Ly8gT25seSByZWNvcmQgdGhlIHZhbHVlIG9uIHRoZSBmaXJzdCByZWZlcmVuY2Vcblx0XHRcdGlmICghY2hhbmdlR3JvdXBba2V5XSkge1xuXHRcdFx0XHRjb25zdCBvbGQgPSBbXTtcblxuXHRcdFx0XHQvLyBXYWxrIHRocm91Z2ggdGhlIGFycmF5IGFuZCBncmFiIHRoZSByZWZlcmVuY2Vcblx0XHRcdFx0aWYgKGFycmF5UmVmKSB7XG5cdFx0XHRcdFx0Zm9yICh2YXIgaXggPSAwOyBpeCA8IGFycmF5UmVmLmxlbmd0aDsgKytpeCkge1xuXHRcdFx0XHRcdFx0Y29uc3QgZWxlbSA9IGFycmF5UmVmW2l4XTtcblxuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBlbGVtICE9PSAndW5kZWZpbmVkJyAmJiBlbGVtICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGVsZW0gIT0gbnVsbCAmJiBlbGVtLl9faWRfXykge1xuXHRcdFx0XHRcdFx0XHRcdG9sZFtpeF0gPSBlbGVtLl9faWRfXztcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQvLyB2YWx1ZXMgc3RhcnQgd2l0aCBhbiA9IHRvIGRpc3Rpbmd1aXNoIGZyb20gaWRzXG5cdFx0XHRcdFx0XHRcdFx0b2xkW2l4XSA9ICc9JyArIEpTT04uc3RyaW5naWZ5KGVsZW0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2hhbmdlR3JvdXBba2V5XSA9IG9sZDtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIEBUT0RPOiBDb25zb2xpZGF0ZSBfY29udmVydEFycmF5UmVmZXJlbmNlc1RvQ2hhbmdlcyB3aXRoIE1hcmtBcnJheVJlZmVyZW5jZXNBc0NoYW5nZWRcblx0ICovXG5cdC8qKlxuXHQgKiBEZXRlcm1pbmUgd2hldGhlciBlYWNoIGFycmF5IHJlZmVyZW5jZSB3YXMgYW4gYWN0dWFsIGNoYW5nZSBvciBqdXN0IGEgcmVmZXJlbmNlXG5cdCAqIElmIGFuIGFjdHVhbCBjaGFuZ2UgY29udmVydCB0byBhIGNoYW5nZSBsb2cgZW50cnkuICBGb3IgYXJyYXlzIHRoZSBjaGFuZ2VzXG5cdCAqIHN0cnVjdHVyZSBpbiB0aGUgc3Vic2NyaXB0aW9uIGxvZyBpcyB0aGUgb2xkIGFuZCBuZXcgdmFsdWUgb2YgdGhlIGVudGlyZSBhcnJheVxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX2NvbnZlcnRBcnJheVJlZmVyZW5jZXNUb0NoYW5nZXMgPSBmdW5jdGlvbiBjb252ZXJ0QXJyYXlSZWZlcmVuY2VzVG9DaGFuZ2VzKCkge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gU2Vzc2lvbnMuZ2V0KHRoaXMpO1xuXHRcdGNvbnN0IHN1YnNjcmlwdGlvbnMgPSB0aGlzLl9nZXRTdWJzY3JpcHRpb25zKCk7XG5cblx0XHQvLyBJdGVyYXRlXG5cdFx0Zm9yICh2YXIgc3Vic2NyaXB0aW9uIGluIHN1YnNjcmlwdGlvbnMpIHtcblx0XHRcdGlmIChzdWJzY3JpcHRpb25zW3N1YnNjcmlwdGlvbl0gIT0gdGhpcy5wcm9jZXNzaW5nU3Vic2NyaXB0aW9uKSB7XG5cdFx0XHRcdGNvbnN0IGNoYW5nZUdyb3VwID0gQ2hhbmdlR3JvdXBzLmdldFByb3BDaGFuZ2VHcm91cChzdWJzY3JpcHRpb24sIHRoaXMpO1xuXHRcdFx0XHRjb25zdCByZWZDaGFuZ2VHcm91cCA9IENoYW5nZUdyb3Vwcy5nZXRBcnJheUNoYW5nZUdyb3VwKCdhcnJheScsIHN1YnNjcmlwdGlvbiwgdGhpcyk7XG5cblx0XHRcdFx0Ly8gTG9vayBhdCBldmVyeSBhcnJheSByZWZlcmVuY2Vcblx0XHRcdFx0Zm9yICh2YXIga2V5IGluIHJlZkNoYW5nZUdyb3VwKSB7XG5cdFx0XHRcdFx0Ly8gc3BsaXQgdGhlIGtleSBpbnRvIGFuIGlkIGFuZCBwcm9wZXJ0eSBuYW1lXG5cdFx0XHRcdFx0Y29uc3QgcGFyYW0gPSBrZXkuc3BsaXQoJy8nKTtcblx0XHRcdFx0XHRjb25zdCBpZCA9IHBhcmFtWzBdO1xuXHRcdFx0XHRcdGNvbnN0IHByb3AgPSBwYXJhbVsxXTtcblxuXHRcdFx0XHRcdC8vIEdldCB0aGUgY3VycmVudCBhbmQgb3JpZ2luYWwgKGF0IHRpbWUgb2YgcmVmZXJlbmNlKSB2YWx1ZXNcblx0XHRcdFx0XHRjb25zdCBvYmogPSBzZXNzaW9uLm9iamVjdHNbaWRdO1xuXG5cdFx0XHRcdFx0aWYgKCFvYmopIHtcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGxldCBjdXJyO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXMuX3VzZUdldHRlcnNTZXR0ZXJzKSB7XG5cdFx0XHRcdFx0XHRjdXJyID0gb2JqWydfXycgKyBwcm9wXTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y3VyciA9IG9ialtwcm9wXTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRsZXQgb3JpZyA9IHJlZkNoYW5nZUdyb3VwW2tleV07XG5cblx0XHRcdFx0XHRpZiAoIWN1cnIpIHtcblx0XHRcdFx0XHRcdGN1cnIgPSBbXTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIW9yaWcpIHtcblx0XHRcdFx0XHRcdG9yaWcgPSBbXTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBXYWxrIHRocm91Z2ggYWxsIGVsZW1lbnRzICh3aGljaCBldmVyIGlzIGxvbmdlciwgb3JpZ2luYWwgb3IgbmV3KVxuXG5cdFx0XHRcdFx0Ly9AVE9ETzogRG91YmxlIGNoZWNrIHRoaXMuIEZpeGluZyB0aGlzIHNlbW90dXMgYnVnIG1pZ2h0IGJyZWFrIG90aGVyIHBhcnRzXG5cdFx0XHRcdFx0Y29uc3QgbGVuID0gTWF0aC5tYXgoY3Vyci5sZW5ndGgsIG9yaWcubGVuZ3RoKTtcblxuXHRcdFx0XHRcdGZvciAodmFyIGl4ID0gMDsgaXggPCBsZW47ICsraXgpIHtcblx0XHRcdFx0XHRcdC8vIFNlZSBpZiB0aGUgdmFsdWUgaGFzIGNoYW5nZWRcblx0XHRcdFx0XHRcdGxldCBjdXJyVmFsdWUgPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgY3VycltpeF0gIT09ICd1bmRlZmluZWQnICYmIGN1cnJbaXhdICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0Y3VyclZhbHVlID0gY3VycltpeF0uX19pZF9fIHx8ICc9JyArIEpTT04uc3RyaW5naWZ5KGN1cnJbaXhdKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y29uc3Qgb3JpZ1ZhbHVlID0gb3JpZ1tpeF07XG5cblx0XHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdFx0b3JpZ1ZhbHVlICE9PSBjdXJyVmFsdWUgfHxcblx0XHRcdFx0XHRcdFx0KGNoYW5nZUdyb3VwW29iai5fX2lkX19dICYmXG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlR3JvdXBbb2JqLl9faWRfX11bcHJvcF0gJiZcblx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VHcm91cFtvYmouX19pZF9fXVtwcm9wXVsxXVtpeF0gIT0gY3VyclZhbHVlKVxuXHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhIG5ldyBjaGFuZ2UgZ3JvdXAga2V5IGlmIG5lZWRlZFxuXHRcdFx0XHRcdFx0XHRpZiAoIWNoYW5nZUdyb3VwW29iai5fX2lkX19dKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlR3JvdXBbb2JqLl9faWRfX10gPSB7fTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBzdWJzZXF1ZW50IGNoYW5nZSBqdXN0IHJlcGxhY2UgdGhlIG5ldyB2YWx1ZVxuXHRcdFx0XHRcdFx0XHRpZiAoY2hhbmdlR3JvdXBbb2JqLl9faWRfX11bcHJvcF0pIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoY2hhbmdlR3JvdXBbb2JqLl9faWRfX11bcHJvcF1bMV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gd2hvbGUgYXJyYXkgY291bGQgYmUgZ2V0dGluZyBudWxsXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VHcm91cFtvYmouX19pZF9fXVtwcm9wXVsxXVtpeF0gPSBjdXJyVmFsdWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdC8vIENyZWF0ZSBhbiBvbGQgYW5kIG5ldyB2YWx1ZSBhcnJheSB3aXRoIGlkZW50aWNhbCB2YWx1ZXMgYW5kIHRoZW5cblx0XHRcdFx0XHRcdFx0XHQvLyBzdWJzdGl0dXRlIHRoZSBvbmUgY2hhbmdlZCB2YWx1ZSBpbiB0aGUgYXBwcm9wcmlhdGUgcG9zaXRpb25cblx0XHRcdFx0XHRcdFx0XHRjb25zdCB2YWx1ZXMgPSB0aGlzLl9jb252ZXJ0VmFsdWUob3JpZyk7XG5cdFx0XHRcdFx0XHRcdFx0Y2hhbmdlR3JvdXBbb2JqLl9faWRfX11bcHJvcF0gPSBbdGhpcy5jbG9uZSh2YWx1ZXMpLCB0aGlzLmNsb25lKHZhbHVlcyldO1xuXHRcdFx0XHRcdFx0XHRcdGNoYW5nZUdyb3VwW29iai5fX2lkX19dW3Byb3BdWzFdW2l4XSA9IGN1cnJWYWx1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmIChjdXJyW2l4XSAmJiBjdXJyW2l4XS5fX2lkX18gJiYgIWN1cnJbaXhdLl9fb2JqZWN0VGVtcGxhdGVfXykge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2Vzc2lvbml6ZShjdXJyW2l4XSwgb2JqKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBVcGRhdGUgcHJldmlvdXMgdmFsdWUgc2luY2UgY2hhbmdlIGhhcyBiZWVuIHJlY29yZGVkXG5cdFx0XHRcdFx0XHRpZiAoIXRoaXMuX3VzZUdldHRlcnNTZXR0ZXJzKSB7XG5cdFx0XHRcdFx0XHRcdGlmICghb2JqWydfXycgKyBwcm9wXSkge1xuXHRcdFx0XHRcdFx0XHRcdG9ialsnX18nICsgcHJvcF0gPSBbXTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdG9ialsnX18nICsgcHJvcF1baXhdID0gb2JqW3Byb3BdW2l4XTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0Q2hhbmdlR3JvdXBzLnJlbW92ZSgnYXJyYXlEaXJ0eScsIHN1YnNjcmlwdGlvbiwgdGhpcyk7XG5cdFx0XHRcdENoYW5nZUdyb3Vwcy5yZW1vdmUoJ2FycmF5Jywgc3Vic2NyaXB0aW9uLCB0aGlzKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIERldGVybWluZSB3aGV0aGVyIGVhY2ggYXJyYXkgcmVmZXJlbmNlIHdhcyBhbiBhY3R1YWwgY2hhbmdlIG9yIGp1c3QgYSByZWZlcmVuY2Vcblx0ICogSWYgYW4gYWN0dWFsIGNoYW5nZSBzZXQgX19jaGFuZ2VkX19cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLk1hcmtDaGFuZ2VkQXJyYXlSZWZlcmVuY2VzID0gZnVuY3Rpb24gTWFya0NoYW5nZWRBcnJheVJlZmVyZW5jZXMoKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9ucyA9IHRoaXMuX2dldFN1YnNjcmlwdGlvbnMoKTtcblxuXHRcdGZvciAodmFyIHN1YnNjcmlwdGlvbiBpbiBzdWJzY3JpcHRpb25zKSB7XG5cdFx0XHRpZiAoc3Vic2NyaXB0aW9uc1tzdWJzY3JpcHRpb25dICE9IHRoaXMucHJvY2Vzc2luZ1N1YnNjcmlwdGlvbikge1xuXHRcdFx0XHRjb25zdCByZWZDaGFuZ2VHcm91cCA9IENoYW5nZUdyb3Vwcy5nZXRBcnJheUNoYW5nZUdyb3VwKCdhcnJheURpcnR5Jywgc3Vic2NyaXB0aW9uLCB0aGlzKTtcblxuXHRcdFx0XHQvLyBMb29rIGF0IGV2ZXJ5IGFycmF5IHJlZmVyZW5jZVxuXHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gcmVmQ2hhbmdlR3JvdXApIHtcblx0XHRcdFx0XHQvLyBzcGxpdCB0aGUga2V5IGludG8gYW4gaWQgYW5kIHByb3BlcnR5IG5hbWVcblx0XHRcdFx0XHRjb25zdCBwYXJhbSA9IGtleS5zcGxpdCgnLycpO1xuXHRcdFx0XHRcdGNvbnN0IGlkID0gcGFyYW1bMF07XG5cdFx0XHRcdFx0Y29uc3QgcHJvcCA9IHBhcmFtWzFdO1xuXG5cdFx0XHRcdFx0Ly8gR2V0IHRoZSBjdXJyZW50IGFuZCBvcmlnaW5hbCAoYXQgdGltZSBvZiByZWZlcmVuY2UpIHZhbHVlc1xuXHRcdFx0XHRcdGNvbnN0IG9iaiA9IHNlc3Npb24ub2JqZWN0c1tpZF07XG5cblx0XHRcdFx0XHRpZiAoIW9iaikge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bGV0IGN1cnI7XG5cblx0XHRcdFx0XHRpZiAodGhpcy5fdXNlR2V0dGVyc1NldHRlcnMpIHtcblx0XHRcdFx0XHRcdGN1cnIgPSBvYmpbJ19fJyArIHByb3BdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjdXJyID0gb2JqW3Byb3BdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGxldCBvcmlnID0gcmVmQ2hhbmdlR3JvdXBba2V5XTtcblxuXHRcdFx0XHRcdGlmICghY3Vycikge1xuXHRcdFx0XHRcdFx0Y3VyciA9IFtdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICghb3JpZykge1xuXHRcdFx0XHRcdFx0b3JpZyA9IFtdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFdhbGsgdGhyb3VnaCBhbGwgZWxlbWVudHMgKHdoaWNoIGV2ZXIgaXMgbG9uZ2VyLCBvcmlnaW5hbCBvciBuZXcpXG5cdFx0XHRcdFx0Y29uc3QgbGVuID0gTWF0aC5tYXgoY3Vyci5sZW5ndGgsIG9yaWcubGVuZ3RoKTtcblxuXHRcdFx0XHRcdGZvciAodmFyIGl4ID0gMDsgaXggPCBsZW47ICsraXgpIHtcblx0XHRcdFx0XHRcdC8vIFNlZSBpZiB0aGUgdmFsdWUgaGFzIGNoYW5nZWRcblx0XHRcdFx0XHRcdGxldCBjdXJyVmFsdWUgPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0XHRcdGlmICh0eXBlb2YgY3VycltpeF0gIT09ICd1bmRlZmluZWQnICYmIGN1cnJbaXhdICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0Y3VyclZhbHVlID0gY3VycltpeF0uX19pZF9fIHx8ICc9JyArIEpTT04uc3RyaW5naWZ5KGN1cnJbaXhdKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Y29uc3Qgb3JpZ1ZhbHVlID0gb3JpZ1tpeF07XG5cblx0XHRcdFx0XHRcdGlmIChvcmlnVmFsdWUgIT09IGN1cnJWYWx1ZSkge1xuXHRcdFx0XHRcdFx0XHRvYmouX19jaGFuZ2VkX18gPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogQ29udmVydCBwcm9wZXJ0eSB2YWx1ZSB0byBzdWl0YWJpbGUgY2hhbmdlIGZvcm1hdCB3aGljaCBpcyBhbHdheXMgYSBzdHJpbmdcblx0ICogT2JqZWN0VGVtcGxhdGUgb2JqZWN0cyBhbHdheXMgcmVwcmVzZW50ZWQgYnkgdGhlaXIgaWRcblx0ICpcblx0ICogQHBhcmFtIHtPYmplY3R9IHZhbHVlIHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMge1N0cmluZ30gb3IgQXJyYXkgb2YgU3RyaW5nc1xuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX2NvbnZlcnRWYWx1ZSA9IGZ1bmN0aW9uIGNvbnZlcnRWYWx1ZSh2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRjb25zdCBuZXdWYWx1ZSA9IFtdO1xuXG5cdFx0XHRmb3IgKHZhciBpeCA9IDA7IGl4IDwgdmFsdWUubGVuZ3RoOyArK2l4KSB7XG5cdFx0XHRcdGlmICh2YWx1ZVtpeF0pIHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlW2l4XSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRcdG5ld1ZhbHVlW2l4XSA9IHZhbHVlW2l4XS5fX2lkX18gfHwgSlNPTi5zdHJpbmdpZnkodmFsdWVbaXhdKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bmV3VmFsdWVbaXhdID0gdmFsdWVbaXhdLl9faWRfXyB8fCB2YWx1ZVtpeF0udG9TdHJpbmcoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bmV3VmFsdWVbaXhdID0gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbmV3VmFsdWU7XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSAmJiB2YWx1ZS5fX2lkX18pIHtcblx0XHRcdHJldHVybiB2YWx1ZS5fX2lkX187XG5cdFx0fSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHtcblx0XHRcdHJldHVybiB2YWx1ZS5nZXRUaW1lKCk7XG5cdFx0fSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmIGlzTmFOKHZhbHVlKSkge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0XHRpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHZhbHVlO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogUHVycG9zZSB1bmtub3duXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gb2JqSWQgdW5rbm93blxuXHQgKiBAcGFyYW0ge3Vua25vd259IHRlbXBsYXRlIHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMge3Vua25vd259XG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5nZXRPYmplY3QgPSBmdW5jdGlvbiBnZXRPYmplY3Qob2JqSWQsIHRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cdFx0Y29uc3Qgb2JqID0gc2Vzc2lvbi5vYmplY3RzW29iaklkXTtcblxuXHRcdGlmIChvYmogJiYgb2JqLl9fdGVtcGxhdGVfXyAmJiBvYmouX190ZW1wbGF0ZV9fID09IHRlbXBsYXRlKSB7XG5cdFx0XHRyZXR1cm4gb2JqO1xuXHRcdH1cblxuXHRcdHJldHVybiBudWxsO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBBcHBseSBjaGFuZ2VzIGFjcm9zcyBhbGwgb2JqZWN0c1xuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IGNoYW5nZXMgYSBwcm9wZXJ0eSBmb3IgZWFjaCBvYmplY3QgY2hhbmdlZCB3aXRoIHRoZSBkZXRhaWxzIG9mIHRoZSBjaGFuZ2Vcblx0ICogQHBhcmFtIHt1bmtub3dufSBmb3JjZSBpZiB0cnVlIGNoYW5nZXMgd2lsbCBiZSBhY2NlcHRlZCB3aXRob3V0IHJvbGxpbmcgYmFja1xuXHQgKiBAcGFyYW0ge3Vua25vd259IHN1YnNjcmlwdGlvbklkIG9wdGlvbmFsIHN1YnNjcmlwdGlvbiBpZCBmb3IgY2hhbmdlc1xuXHQgKlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSAgIDAgLSB3aGV0aGVyIGEgcm9sbGJhY2sgaGFkIHRvIGJlIGRvbmVcblx0ICogICAgICAgICAgICAgICAgICAgIDEgLSBubyBvYmplY3RzIHByb2Nlc3NlZFxuXHQgKiAgICAgICAgICAgICAgICAgICAgMiAtIG9iamVjdHMgcHJvY2Vzc2VkXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fYXBwbHlDaGFuZ2VzID0gZnVuY3Rpb24gYXBwbHlDaGFuZ2VzKGNoYW5nZXMsIGZvcmNlLCBzdWJzY3JpcHRpb25JZCwgY2FsbENvbnRleHQpIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldCh0aGlzKTtcblx0XHRjb25zdCByb2xsYmFjayA9IFtdO1xuXG5cdFx0dGhpcy5wcm9jZXNzaW5nU3Vic2NyaXB0aW9uID0gdGhpcy5fZ2V0U3Vic2NyaXB0aW9uKHN1YnNjcmlwdGlvbklkKTtcblxuXHRcdC8vIFdhbGsgdGhyb3VnaCBjaGFuZ2UgcXVldWUgbG9va2luZyBmb3Igb2JqZWN0cyBhbmQgYXBwbHlpbmcgbmV3IHZhbHVlcyBvciByb2xsaW5nIGJhY2tcblx0XHQvLyBpZiBwcmV2aW91cyB2YWx1ZXMgZG9uJ3QgbWF0Y2ggd2hhdCBjaGFuZ2VyIHRoaW5ncyB0aGV5IGFyZVxuXHRcdHRoaXMuY2hhbmdlQ291bnQgPSAwO1xuXHRcdHRoaXMuY2hhbmdlU3RyaW5nID0ge307XG5cblx0XHRsZXQgaGFzT2JqZWN0cyA9IGZhbHNlO1xuXG5cdFx0Zm9yICh2YXIgb2JqSWQgaW4gY2hhbmdlcykge1xuXHRcdFx0bGV0IG9iaiA9IHNlc3Npb24ub2JqZWN0c1tvYmpJZF07XG5cblx0XHRcdGlmIChvYmopIHtcblx0XHRcdFx0aGFzT2JqZWN0cyA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIElmIG5vIHJlZmVyZW5jZSBkZXJpdmUgdGVtcGxhdGUgZm9yIG9iamVjdCBJRFxuXHRcdFx0aWYgKCFvYmopIHtcblx0XHRcdFx0Y29uc3QgdGVtcGxhdGUgPSB0aGlzLl9fZGljdGlvbmFyeV9fW29iaklkLnJlcGxhY2UoL1teLV0qLS8sICcnKS5yZXBsYWNlKC8tLiovLCAnJyldO1xuXG5cdFx0XHRcdGlmICh0ZW1wbGF0ZSkge1xuXHRcdFx0XHRcdGZvcmNlID0gdHJ1ZTtcblx0XHRcdFx0XHRvYmogPSB0aGlzLl9jcmVhdGVFbXB0eU9iamVjdCh0ZW1wbGF0ZSwgb2JqSWQpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKFxuXHRcdFx0XHRcdFx0eyBjb21wb25lbnQ6ICdzZW1vdHVzJywgbW9kdWxlOiAnYXBwbHlDaGFuZ2VzJywgYWN0aXZpdHk6ICdwcm9jZXNzaW5nJyB9LFxuXHRcdFx0XHRcdFx0J0NvdWxkIG5vdCBmaW5kIHRlbXBsYXRlIGZvciAnICsgb2JqSWRcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGxldCBwYXNzZWRPYmplY3RWYWxpZGF0aW9uID0gdHJ1ZTtcblx0XHRcdGxldCBwYXNzZWRQcm9wZXJ0eVZhbGlkYXRpb24gPSB0cnVlO1xuXG5cdFx0XHRpZiAodGhpcy5yb2xlID09PSAnc2VydmVyJykge1xuXHRcdFx0XHRjb25zdCB2YWxpZGF0b3IgPVxuXHRcdFx0XHRcdG9iaiAmJiAob2JqWyd2YWxpZGF0ZVNlcnZlckluY29taW5nT2JqZWN0J10gfHwgdGhpcy5jb250cm9sbGVyWyd2YWxpZGF0ZVNlcnZlckluY29taW5nT2JqZWN0J10pO1xuXG5cdFx0XHRcdGxldCB2YWxpZGF0b3JUaGlzO1xuXG5cdFx0XHRcdGlmIChvYmogJiYgb2JqWyd2YWxpZGF0ZVNlcnZlckluY29taW5nT2JqZWN0J10pIHtcblx0XHRcdFx0XHR2YWxpZGF0b3JUaGlzID0gb2JqO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHZhbGlkYXRvclRoaXMgPSB0aGlzLmNvbnRyb2xsZXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodmFsaWRhdG9yKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdHZhbGlkYXRvci5jYWxsKHZhbGlkYXRvclRoaXMsIG9iaik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0cGFzc2VkT2JqZWN0VmFsaWRhdGlvbiA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIXRoaXMuX2FwcGx5T2JqZWN0Q2hhbmdlcyhjaGFuZ2VzLCByb2xsYmFjaywgb2JqLCBmb3JjZSkpIHtcblx0XHRcdFx0cGFzc2VkUHJvcGVydHlWYWxpZGF0aW9uID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghb2JqIHx8ICFwYXNzZWRPYmplY3RWYWxpZGF0aW9uIHx8ICFwYXNzZWRQcm9wZXJ0eVZhbGlkYXRpb24pIHtcblx0XHRcdFx0dGhpcy5wcm9jZXNzaW5nU3Vic2NyaXB0aW9uID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMuX3JvbGxiYWNrKHJvbGxiYWNrKTtcblx0XHRcdFx0dGhpcy5fZGVsZXRlQ2hhbmdlcygpO1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0XHR7IGNvbXBvbmVudDogJ3NlbW90dXMnLCBtb2R1bGU6ICdhcHBseUNoYW5nZXMnLCBhY3Rpdml0eTogJ3Byb2Nlc3NpbmcnIH0sXG5cdFx0XHRcdFx0J0NvdWxkIG5vdCBhcHBseSBjaGFuZ2VzIHRvICcgKyBvYmpJZFxuXHRcdFx0XHQpO1xuXHRcdFx0XHR0aGlzLmNoYW5nZVN0cmluZyA9IHt9O1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRsZXQgcGFzc2VkT2JqZWN0c1ZhbGlkYXRpb24gPSB0cnVlO1xuXG5cdFx0aWYgKHRoaXMucm9sZSA9PT0gJ3NlcnZlcicgJiYgdGhpcy5jb250cm9sbGVyWyd2YWxpZGF0ZVNlcnZlckluY29taW5nT2JqZWN0cyddKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIudmFsaWRhdGVTZXJ2ZXJJbmNvbWluZ09iamVjdHMoY2hhbmdlcywgY2FsbENvbnRleHQpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRwYXNzZWRPYmplY3RzVmFsaWRhdGlvbiA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICghcGFzc2VkT2JqZWN0c1ZhbGlkYXRpb24pIHtcblx0XHRcdHRoaXMucHJvY2Vzc2luZ1N1YnNjcmlwdGlvbiA9IGZhbHNlO1xuXHRcdFx0dGhpcy5fcm9sbGJhY2socm9sbGJhY2spO1xuXHRcdFx0dGhpcy5fZGVsZXRlQ2hhbmdlcygpO1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoXG5cdFx0XHRcdHsgY29tcG9uZW50OiAnc2Vtb3R1cycsIG1vZHVsZTogJ2FwcGx5Q2hhbmdlcycsIGFjdGl2aXR5OiAndmFsaWRhdGVTZXJ2ZXJJbmNvbWluZ09iamVjdHMnIH0sXG5cdFx0XHRcdCdGbGFnZ2VkIGJ5IGNvbnRyb2xsZXIgdG8gbm90IHByb2Nlc3MgdGhpcyBjaGFuZ2Ugc2V0Lidcblx0XHRcdCk7XG5cdFx0XHR0aGlzLmNoYW5nZVN0cmluZyA9IHt9O1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXG5cdFx0LyogIFdlIHVzZWQgdG8gZGVsZXRlIGNoYW5nZXMgYnV0IHRoaXMgbWVhbnMgdGhhdCBjaGFuZ2VzIHdoaWxlIGEgbWVzc2FnZSBpcyBwcm9jZXNzZWRcbiAgICAgICAgIGlzIGVmZmVjdGl2ZWx5IGxvc3QuICBOb3cgd2UganVzdCBkb24ndCByZWNvcmQgY2hhbmdlcyB3aGlsZSBwcm9jZXNzaW5nLlxuICAgICAgICAgdGhpcy5fZGVsZXRlQ2hhbmdlcygpO1xuICAgICAgICAgKi9cblx0XHR0aGlzLnByb2Nlc3NpbmdTdWJzY3JpcHRpb24gPSBudWxsO1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKHtcblx0XHRcdGNvbXBvbmVudDogJ3NlbW90dXMnLFxuXHRcdFx0bW9kdWxlOiAnYXBwbHlDaGFuZ2VzJyxcblx0XHRcdGFjdGl2aXR5OiAnZGF0YUxvZ2dpbmcnLFxuXHRcdFx0ZGF0YTogeyBjb3VudDogdGhpcy5jaGFuZ2VDb3VudCwgdmFsdWVzOiB0aGlzLmNoYW5nZVN0cmluZyB9XG5cdFx0fSk7XG5cblx0XHRpZiAoaGFzT2JqZWN0cykge1xuXHRcdFx0cmV0dXJuIDI7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDE7XG5cdH07XG5cblx0LyoqXG5cdCAqIEFwcGx5IGNoYW5nZXMgZm9yIGEgc3BlY2lmaWMgb2JqZWN0XG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gY2hhbmdlcyBhbGwgY2hhbmdlc1xuXHQgKiBAcGFyYW0ge3Vua25vd259IHJvbGxiYWNrIGFuIGFycmF5IG9mIGNoYW5nZXMgdGhhdCB3b3VsZCBoYXZlIHRvIGJlIHJvbGxlZCBiYWNrXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gb2JqIHRoZSBvYmplY3QgaW5zdGFuY2UgdGhhdCB3YXMgY2hhbmdlZFxuXHQgKiBAcGFyYW0ge3Vua25vd259IGZvcmNlIHdoZXRoZXIgY2hhbmdlcyBjYW4gYmUgcm9sbGVkIGJhY2tcblx0ICpcblx0ICogQHJldHVybnMge0Jvb2xlYW59IHdoZXRoZXIgYSByb2xsYmFjayBuZWVkcyB0byBiZSBkb25lXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fYXBwbHlPYmplY3RDaGFuZ2VzID0gZnVuY3Rpb24gYXBwbHlPYmplY3RDaGFuZ2VzKGNoYW5nZXMsIHJvbGxiYWNrLCBvYmosIGZvcmNlKSB7XG5cdFx0Ly8gR28gdGhyb3VnaCBlYWNoIHJlY29yZGVkIGNoYW5nZSB3aGljaCBpcyBhIHBhaXIgb2Ygb2xkIGFuZCBuZXcgdmFsdWVzXG5cdFx0Zm9yICh2YXIgcHJvcCBpbiBjaGFuZ2VzW29iai5fX2lkX19dKSB7XG5cdFx0XHRjb25zdCBjaGFuZ2UgPSBjaGFuZ2VzW29iai5fX2lkX19dW3Byb3BdO1xuXHRcdFx0Y29uc3Qgb2xkVmFsdWUgPSBjaGFuZ2VbMF07XG5cdFx0XHRjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZVsxXTtcblx0XHRcdGNvbnN0IGRlZmluZVByb3BlcnR5ID0gdGhpcy5fZ2V0RGVmaW5lUHJvcGVydHkocHJvcCwgb2JqLl9fdGVtcGxhdGVfXyk7XG5cblx0XHRcdGlmICghZGVmaW5lUHJvcGVydHkpIHtcblx0XHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Y29tcG9uZW50OiAnc2Vtb3R1cycsXG5cdFx0XHRcdFx0XHRtb2R1bGU6ICdhcHBseU9iamVjdENoYW5nZXMnLFxuXHRcdFx0XHRcdFx0YWN0aXZpdHk6ICdwcm9jZXNzaW5nJyxcblx0XHRcdFx0XHRcdGRhdGE6IHsgdGVtcGxhdGU6IG9iai5fX3RlbXBsYXRlX18uX19uYW1lX18sIHByb3BlcnR5OiBwcm9wIH1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGBDb3VsZCBub3QgYXBwbHkgY2hhbmdlIHRvICR7b2JqLl9fdGVtcGxhdGVfXy5fX25hbWVfX30uJHtwcm9wfSBwcm9wZXJ0eSBub3QgZGVmaW5lZCBpbiB0ZW1wbGF0ZWBcblx0XHRcdFx0KTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZGVmaW5lUHJvcGVydHkudHlwZSA9PT0gQXJyYXkpIHtcblx0XHRcdFx0aWYgKCF0aGlzLl92YWxpZGF0ZVNlcnZlckluY29taW5nUHJvcGVydHkob2JqLCBwcm9wLCBkZWZpbmVQcm9wZXJ0eSwgbmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG5ld1ZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRpZiAoIShvYmpbcHJvcF0gaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdFx0XHRcdG9ialtwcm9wXSA9IFtdO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIXRoaXMuX3VzZUdldHRlcnNTZXR0ZXJzICYmICEob2JqWydfXycgKyBwcm9wXSBpbnN0YW5jZW9mIEFycmF5KSkge1xuXHRcdFx0XHRcdFx0b2JqWydfXycgKyBwcm9wXSA9IFtdO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGxldCBsZW5ndGg7XG5cblx0XHRcdFx0XHRpZiAob2xkVmFsdWUpIHtcblx0XHRcdFx0XHRcdGxlbmd0aCA9IE1hdGgubWF4KG5ld1ZhbHVlLmxlbmd0aCwgb2xkVmFsdWUubGVuZ3RoKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGVuZ3RoID0gTWF0aC5tYXgobmV3VmFsdWUubGVuZ3RoLCAwKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRmb3IgKHZhciBpeCA9IDA7IGl4IDwgbGVuZ3RoOyArK2l4KSB7XG5cdFx0XHRcdFx0XHRjb25zdCB1bmFycmF5X25ld1ZhbHVlID0gdW5hcnJheShuZXdWYWx1ZVtpeF0pO1xuXHRcdFx0XHRcdFx0aWYgKG9sZFZhbHVlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChcblx0XHRcdFx0XHRcdFx0XHQhdGhpcy5fYXBwbHlQcm9wZXJ0eUNoYW5nZShcblx0XHRcdFx0XHRcdFx0XHRcdGNoYW5nZXMsXG5cdFx0XHRcdFx0XHRcdFx0XHRyb2xsYmFjayxcblx0XHRcdFx0XHRcdFx0XHRcdG9iaixcblx0XHRcdFx0XHRcdFx0XHRcdHByb3AsXG5cdFx0XHRcdFx0XHRcdFx0XHRpeCxcblx0XHRcdFx0XHRcdFx0XHRcdHVuYXJyYXkob2xkVmFsdWVbaXhdKSxcblx0XHRcdFx0XHRcdFx0XHRcdHVuYXJyYXlfbmV3VmFsdWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRmb3JjZVxuXHRcdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0XHRcdFx0IXRoaXMuX2FwcGx5UHJvcGVydHlDaGFuZ2UoXG5cdFx0XHRcdFx0XHRcdFx0XHRjaGFuZ2VzLFxuXHRcdFx0XHRcdFx0XHRcdFx0cm9sbGJhY2ssXG5cdFx0XHRcdFx0XHRcdFx0XHRvYmosXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRcdFx0XHRcdFx0aXgsXG5cdFx0XHRcdFx0XHRcdFx0XHRudWxsLFxuXHRcdFx0XHRcdFx0XHRcdFx0dW5hcnJheV9uZXdWYWx1ZSxcblx0XHRcdFx0XHRcdFx0XHRcdGZvcmNlXG5cdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGlzLl90cmltQXJyYXkob2JqW3Byb3BdKTtcblx0XHRcdFx0fSBlbHNlIGlmIChvbGRWYWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0b2JqW3Byb3BdID0gbnVsbDtcblxuXHRcdFx0XHRcdGlmICghdGhpcy5fdXNlR2V0dGVyc1NldHRlcnMpIHtcblx0XHRcdFx0XHRcdG9ialsnX18nICsgcHJvcF0gPSBudWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCF0aGlzLl92YWxpZGF0ZVNlcnZlckluY29taW5nUHJvcGVydHkob2JqLCBwcm9wLCBkZWZpbmVQcm9wZXJ0eSwgbmV3VmFsdWUpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCF0aGlzLl9hcHBseVByb3BlcnR5Q2hhbmdlKGNoYW5nZXMsIHJvbGxiYWNrLCBvYmosIHByb3AsIC0xLCBvbGRWYWx1ZSwgbmV3VmFsdWUsIGZvcmNlKSkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuY2hhbmdlQ291bnQrKztcblx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdGZ1bmN0aW9uIHVuYXJyYXkodmFsdWUpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh2YWx1ZSAmJiBTdHJpbmcodmFsdWUpLnN1YnN0cigwLCAxKSA9PSAnPScpIHtcblx0XHRcdFx0XHRyZXR1cm4gSlNPTi5wYXJzZShTdHJpbmcodmFsdWUpLnN1YnN0cigxKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdmFsdWU7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJldHVybiAnJztcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX3ZhbGlkYXRlU2VydmVySW5jb21pbmdQcm9wZXJ0eSA9IGZ1bmN0aW9uKG9iaiwgcHJvcCwgZGVmaW5lUHJvcGVydHksIG5ld1ZhbHVlKSB7XG5cdFx0Y29uc3QgdmFsaWRhdG9yID1cblx0XHRcdG9iaiAmJiAob2JqWyd2YWxpZGF0ZVNlcnZlckluY29taW5nUHJvcGVydHknXSB8fCB0aGlzLmNvbnRyb2xsZXJbJ3ZhbGlkYXRlU2VydmVySW5jb21pbmdQcm9wZXJ0eSddKTtcblxuXHRcdGxldCB2YWxpZGF0b3JUaGlzO1xuXG5cdFx0aWYgKG9iaiAmJiBvYmpbJ3ZhbGlkYXRlU2VydmVySW5jb21pbmdQcm9wZXJ0eSddKSB7XG5cdFx0XHR2YWxpZGF0b3JUaGlzID0gb2JqO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YWxpZGF0b3JUaGlzID0gdGhpcy5jb250cm9sbGVyO1xuXHRcdH1cblxuXHRcdGlmICh2YWxpZGF0b3IpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhbGlkYXRvci5jYWxsKHZhbGlkYXRvclRoaXMsIG9iaiwgcHJvcCwgZGVmaW5lUHJvcGVydHksIG5ld1ZhbHVlKTtcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXHQvKipcblx0ICogQXBwbHkgY2hhbmdlcyBmb3IgYSBzcGVjaWZpYyBwcm9wZXJ0eSwgY2FzY2FkaW5nIGNoYW5nZXMgaW4gdGhlIGV2ZW50XG5cdCAqIHRoYXQgYSByZWZlcmVuY2UgdG8gYW4gb2JqZWN0IHRoYXQgbmVlZHMgdG8gYmUgY3JlYXRlZCBpcyBwYXJ0IG9mIHRoZSBjaGFuZ2Vcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBjaGFuZ2VzIGFsbCBjaGFuZ2VzXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gcm9sbGJhY2sgYW4gYXJyYXkgb2YgY2hhbmdlcyB0aGF0IHdvdWxkIGhhdmUgdG8gYmUgcm9sbGVkIGJhY2tcblx0ICogQHBhcmFtIHt1bmtub3dufSBvYmogdGhlIG9iamVjdCBpbnN0YW5jZSB0aGF0IHdhcyBjaGFuZ2VkXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gcHJvcCB0aGUgcHJvcGVydHkgb2YgdGhhdCBvYmplY3Rcblx0ICogQHBhcmFtIHt1bmtub3dufSBpeCB0aGUgcG9zaXRpb24gb2YgdGhlIHByb3BlcnR5IGlmIHRoZSBwcm9wZXJ0eSBpcyBhbiBhcnJheVxuXHQgKiBAcGFyYW0ge3Vua25vd259IG9sZFZhbHVlIHRoZSBvbGQgdmFsdWUgYmVmb3JlIHRoZSBjaGFuZ2Ugb2NjdXJlZFxuXHQgKiBAcGFyYW0ge3Vua25vd259IG5ld1ZhbHVlIHRoZSB2YWx1ZSBhZnRlciB0aGUgY2hhbmdlIG9jY3VyZWRcblx0ICogQHBhcmFtIHt1bmtub3dufSBmb3JjZSB3aGV0aGVyIGNoYW5nZXMgY2FuIGJlIHJvbGxlZCBiYWNrXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtCb29sZWFufSB3aGV0aGVyIGEgcm9sbGJhY2sgbmVlZHMgdG8gYmUgZG9uZVxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX2FwcGx5UHJvcGVydHlDaGFuZ2UgPSBmdW5jdGlvbiBhcHBseVByb3BlcnR5Q2hhbmdlKFxuXHRcdGNoYW5nZXMsXG5cdFx0cm9sbGJhY2ssXG5cdFx0b2JqLFxuXHRcdHByb3AsXG5cdFx0aXgsXG5cdFx0b2xkVmFsdWUsXG5cdFx0bmV3VmFsdWUsXG5cdFx0Zm9yY2Vcblx0KSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cdFx0bGV0IGN1cnJlbnRWYWx1ZTtcblxuXHRcdC8vIEdldCBvbGQsIG5ldyBhbmQgY3VycmVudCB2YWx1ZSB0byBkZXRlcm1pbmUgaWYgY2hhbmdlIGlzIHN0aWxsIGFwcGxpY2FibGVcblx0XHR0cnkge1xuXHRcdFx0aWYgKGl4ID49IDApIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gb2JqW3Byb3BdW2l4XTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGN1cnJlbnRWYWx1ZSA9IG9ialtwcm9wXTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0eyBjb21wb25lbnQ6ICdzZW1vdHVzJywgbW9kdWxlOiAnYXBwbHlQcm9wZXJ0eUNoYW5nZScsIGFjdGl2aXR5OiAncHJvY2Vzc2luZycgfSxcblx0XHRcdFx0J0NvdWxkIG5vdCBhcHBseSBjaGFuZ2UgdG8gJyArIG9iai5fX3RlbXBsYXRlX18uX19uYW1lX18gKyAnLicgKyBwcm9wICsgJyBiYXNlZCBvbiBwcm9wZXJ0eSBkZWZpbml0aW9uJ1xuXHRcdFx0KTtcblxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIE5vIGNoYW5nZSBjYXNlXG5cdFx0Y29uc3QgY3VycmVudFZhbHVlQ29udmVydGVkID0gdGhpcy5fY29udmVydFZhbHVlKGN1cnJlbnRWYWx1ZSk7XG5cdFx0Y29uc3Qgb2xkVmFsdWVDb252ZXJ0ZWQgPSB0aGlzLl9jb252ZXJ0VmFsdWUob2xkVmFsdWUpO1xuXG5cdFx0aWYgKG5ld1ZhbHVlID09IGN1cnJlbnRWYWx1ZUNvbnZlcnRlZCAmJiB0aGlzLl91c2VHZXR0ZXJzU2V0dGVycykge1xuXHRcdFx0Ly8gbm8gY2hhbmdlXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHQvLyB1bmlkaXJlY3Rpb25hbCBwcm9wZXJ0aWVzIHdpbGwgZ2V0IG91dCBvZiBzeW5jIG9uIHJlZnJlc2hlcyBzbyBiZXN0IG5vdCB0byBjaGVja1xuXHRcdGNvbnN0IGRlZmluZVByb3BlcnR5ID0gdGhpcy5fZ2V0RGVmaW5lUHJvcGVydHkocHJvcCwgb2JqLl9fdGVtcGxhdGVfXykgfHwge307XG5cdFx0Y29uc3Qgc2luZ2xlRGlyZWN0aW9uID0gZGVmaW5lUHJvcGVydHkudG9TZXJ2ZXIgPT09IGZhbHNlIHx8IGRlZmluZVByb3BlcnR5LnRvQ2xpZW50ID09PSBmYWxzZTtcblxuXHRcdC8vIE1ha2Ugc3VyZSBvbGQgdmFsdWUgdGhhdCBpcyByZXBvcnRlZCBtYXRjaGVzIGN1cnJlbnQgdmFsdWVcblx0XHRpZiAoIXNpbmdsZURpcmVjdGlvbiAmJiAhZm9yY2UgJiYgb2xkVmFsdWVDb252ZXJ0ZWQgIT0gY3VycmVudFZhbHVlQ29udmVydGVkKSB7XG5cdFx0XHQvLyBjb25mbGljdCB3aWxsIGhhdmUgdG8gcm9sbCBiYWNrXG5cdFx0XHRjb25zdCBjb25mbGljdEVycm9yRGF0YSA9IHsgY29tcG9uZW50OiAnc2Vtb3R1cycsIG1vZHVsZTogJ2FwcGx5UHJvcGVydHlDaGFuZ2UnLCBhY3Rpdml0eTogJ3Byb2Nlc3NpbmcnIH07XG5cblx0XHRcdGNvbnN0IGNvbmZsaWN0RXJyb3JTdHJpbmcgPVxuXHRcdFx0XHRgQ291bGQgbm90IGFwcGx5IGNoYW5nZSB0byAke29iai5fX3RlbXBsYXRlX18uX19uYW1lX199LiR7cHJvcH0gZXhwZWN0aW5nICR7dGhpcy5jbGVhblByaXZhdGVWYWx1ZXMocHJvcCwgb2xkVmFsdWVDb252ZXJ0ZWQsIGRlZmluZVByb3BlcnR5KX0gYnV0IHByZXNlbnRseSAke3RoaXMuY2xlYW5Qcml2YXRlVmFsdWVzKHByb3AsIGN1cnJlbnRWYWx1ZUNvbnZlcnRlZCwgZGVmaW5lUHJvcGVydHkpfWA7XG5cblx0XHRcdGlmICh0aGlzLl9fY29uZmxpY3RNb2RlX18gPT0gJ2hhcmQnKSB7XG5cdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKGNvbmZsaWN0RXJyb3JEYXRhLCBjb25mbGljdEVycm9yU3RyaW5nKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5sb2dnZXIud2Fybihjb25mbGljdEVycm9yRGF0YSwgY29uZmxpY3RFcnJvclN0cmluZyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQmFzZWQgb24gdHlwZSBvZiBwcm9wZXJ0eSB3ZSBjb252ZXJ0IHRoZSB2YWx1ZSBmcm9tIGl0J3Mgc3RyaW5nIHJlcHJlc2VudGF0aW9uIGludG9cblx0XHQvLyBlaXRoZXIgYSBmdW5kYW1lbnRhbCB0eXBlIG9yIGEgdGVtcGxhdGVkIG9iamVjdCwgY3JlYXRpbmcgaXQgaWYgbmVlZGVkXG4gICAgICAgIGlmICghQ2hhbmdlcy5hY2NlcHQoZGVmaW5lUHJvcGVydHksIG9iai5fX3RlbXBsYXRlX18sIHRoaXMpKSB7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0eyBjb21wb25lbnQ6ICdzZW1vdHVzJywgbW9kdWxlOiAnYXBwbHlQcm9wZXJ0eUNoYW5nZScsIGFjdGl2aXR5OiAncHJvY2Vzc2luZycgfSxcblx0XHRcdFx0YENvdWxkIG5vdCBhY2NlcHQgY2hhbmdlcyB0byAke29iai5fX3RlbXBsYXRlX18uX19uYW1lX199LiR7cHJvcH0gYmFzZWQgb24gcHJvcGVydHkgZGVmaW5pdGlvbmBcblx0XHRcdCk7XG5cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRjb25zdCB0eXBlID0gZGVmaW5lUHJvcGVydHkub2YgfHwgZGVmaW5lUHJvcGVydHkudHlwZTtcblx0XHRsZXQgb2JqSWQgPSBudWxsO1xuXG5cdFx0aWYgKHR5cGUgPT0gTnVtYmVyKSB7XG5cdFx0XHRpZiAobmV3VmFsdWUgPT0gbnVsbCkge1xuXHRcdFx0XHRuZXdWYWx1ZSA9IG51bGw7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRuZXdWYWx1ZSA9IE51bWJlcihuZXdWYWx1ZSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0eXBlID09IFN0cmluZykge1xuXHRcdH0gLy9UT0RPOiBXaHk/IFRoaXMgc2hvdWxkIG5vdCBiZSBhIHBhdHRlcm4gZm9yIGlmL2Vsc2UgaWZzXG5cdFx0ZWxzZSBpZiAodHlwZSA9PSBCb29sZWFuKSB7XG5cdFx0XHRpZiAobmV3VmFsdWUgPT0gbnVsbCkge1xuXHRcdFx0XHRuZXdWYWx1ZSA9IG51bGw7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAobmV3VmFsdWUgPT0gJ2ZhbHNlJykge1xuXHRcdFx0XHRcdG5ld1ZhbHVlID0gZmFsc2U7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKG5ld1ZhbHVlKSB7XG5cdFx0XHRcdFx0XHRuZXdWYWx1ZSA9IHRydWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG5ld1ZhbHVlID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0eXBlID09IERhdGUpIHtcblx0XHRcdGlmIChuZXdWYWx1ZSA9PSBudWxsKSB7XG5cdFx0XHRcdG5ld1ZhbHVlID0gbnVsbDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5ld1ZhbHVlID0gbmV3IERhdGUobmV3VmFsdWUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PSBPYmplY3QgJiYgbmV3VmFsdWUpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgbmV3VmFsdWUgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0aWYgKG5ld1ZhbHVlICYmIG5ld1ZhbHVlLnN1YnN0cigwLCAxKSA9PSAnPScpIHtcblx0XHRcdFx0XHRcdG5ld1ZhbHVlID0gSlNPTi5wYXJzZShuZXdWYWx1ZS5zdWJzdHIoMSkpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRuZXdWYWx1ZSA9IEpTT04ucGFyc2UobmV3VmFsdWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBjYXRjaCAoZSkge30gLy8gSnVzdCBsZWF2ZSBpdCBhcyBpc1xuXHRcdH0gZWxzZSBpZiAobmV3VmFsdWUgJiYgdHlwZW9mIHR5cGUgPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdG9iaklkID0gbmV3VmFsdWU7XG5cblx0XHRcdGlmIChzZXNzaW9uLm9iamVjdHNbb2JqSWRdKSB7XG5cdFx0XHRcdGlmIChzZXNzaW9uLm9iamVjdHNbb2JqSWRdIGluc3RhbmNlb2YgdHlwZSkge1xuXHRcdFx0XHRcdG5ld1ZhbHVlID0gc2Vzc2lvbi5vYmplY3RzW29iaklkXTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcihcblx0XHRcdFx0XHRcdHsgY29tcG9uZW50OiAnc2Vtb3R1cycsIG1vZHVsZTogJ2FwcGx5UHJvcGVydHlDaGFuZ2UnLCBhY3Rpdml0eTogJ3Byb2Nlc3NpbmcnIH0sXG5cdFx0XHRcdFx0XHRgQ291bGQgbm90IGFwcGx5IGNoYW5nZSB0byAke29iai5fX3RlbXBsYXRlX18uX19uYW1lX199LiR7cHJvcH0gLSBJRCAoJHtvYmpJZH0pIGlzIFRZUEUgJHtzZXNzaW9uLm9iamVjdHNbb2JqSWRdLl9fdGVtcGxhdGVfXy5fX25hbWVfX31gXG5cdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bmV3VmFsdWUgPSB0aGlzLl9jcmVhdGVFbXB0eU9iamVjdCh0eXBlLCBvYmpJZCwgZGVmaW5lUHJvcGVydHkpO1xuXHRcdFx0XHR0aGlzLl9hcHBseU9iamVjdENoYW5nZXMoY2hhbmdlcywgcm9sbGJhY2ssIG5ld1ZhbHVlLCB0cnVlKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBBc3NpZ24gdG8gcHJvcGVydHkgYXMgc2NhbGFyIG9yIGFycmF5IHZhbHVlXG5cdFx0Ly8gRm9yIG5vbi1zZXR0ZXIgY2hhbmdlIHRyYWNraW5nIHdlIGRvbid0IHdhbnQgdGhpcyB0byBiZSB2aWV3ZWQgYXMgYSBjaGFuZ2Vcblx0XHRpZiAobmV3VmFsdWUgIT0gY3VycmVudFZhbHVlIHx8ICF0aGlzLl91c2VHZXR0ZXJzU2V0dGVycykge1xuXHRcdFx0aWYgKGl4ID49IDApIHtcblx0XHRcdFx0b2JqW3Byb3BdW2l4XSA9IG5ld1ZhbHVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl91c2VHZXR0ZXJzU2V0dGVycyAmJiBDaGFuZ2VzLm1hbmFnZShkZWZpbmVQcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHRpZiAoIW9ialsnX18nICsgcHJvcF0pIHtcblx0XHRcdFx0XHRcdG9ialsnX18nICsgcHJvcF0gPSBbXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0b2JqWydfXycgKyBwcm9wXVtpeF0gPSBuZXdWYWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0aGlzLl9fY2hhbmdlVHJhY2tpbmdfXykge1xuXHRcdFx0XHRcdG9iai5fX2NoYW5nZWRfXyA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG9ialtwcm9wXSA9IG5ld1ZhbHVlO1xuXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl91c2VHZXR0ZXJzU2V0dGVycyAmJiBDaGFuZ2VzLm1hbmFnZShkZWZpbmVQcm9wZXJ0eSkpIHtcblx0XHRcdFx0XHRvYmpbJ19fJyArIHByb3BdID0gbmV3VmFsdWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRsZXQgbG9nVmFsdWU7XG5cblx0XHRpZiAob2JqSWQpIHtcblx0XHRcdGxvZ1ZhbHVlID0gJ3snICsgb2JqSWQgKyAnfSc7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChuZXdWYWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdGxvZ1ZhbHVlID0gJ1snICsgbmV3VmFsdWUubGVuZ3RoICsgJ10nO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bG9nVmFsdWUgPSBuZXdWYWx1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoaXggPj0gMCkge1xuXHRcdFx0dGhpcy5jaGFuZ2VTdHJpbmdbYCR7b2JqLl9fdGVtcGxhdGVfXy5fX25hbWVfX31bJHtpeH1dLiR7cHJvcH1gXSA9IHRoaXMuY2xlYW5Qcml2YXRlVmFsdWVzKFxuXHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRsb2dWYWx1ZSxcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHlcblx0XHRcdCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuY2hhbmdlU3RyaW5nW2Ake29iai5fX3RlbXBsYXRlX18uX19uYW1lX199LiR7cHJvcH1gXSA9IHRoaXMuY2xlYW5Qcml2YXRlVmFsdWVzKFxuXHRcdFx0XHRwcm9wLFxuXHRcdFx0XHRsb2dWYWx1ZSxcblx0XHRcdFx0ZGVmaW5lUHJvcGVydHlcblx0XHRcdCk7XG5cdFx0fVxuXG5cdFx0cm9sbGJhY2sucHVzaChbb2JqLCBwcm9wLCBpeCwgY3VycmVudFZhbHVlXSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fTtcblxuXHQvKipcblx0ICogUm9sbCBiYWNrIGNoYW5nZXMgYWNjdW11bGF0ZWQgYXMgcGFydCBvZiB0aGUgYXBwbGljYXRpb24gb2YgY2hhbmdlc1xuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IHJvbGxiYWNrIC0gYXJyYXkgb2YgY2hhbmdlc1xuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX3JvbGxiYWNrID0gZnVuY3Rpb24gcm9sbGJhY2socm9sbGJhY2spIHtcblx0XHRmb3IgKHZhciBpeCA9IDA7IGl4IDwgcm9sbGJhY2subGVuZ3RoOyArK2l4KSB7XG5cdFx0XHRpZiAocm9sbGJhY2tbaXhdWzJdID49IDApIHtcblx0XHRcdFx0cm9sbGJhY2tbaXhdWzBdW3JvbGxiYWNrW2l4XVsxXV1bcm9sbGJhY2tbaXhdWzJdXSA9IHJvbGxiYWNrW2l4XVszXTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJvbGxiYWNrW2l4XVswXVtyb2xsYmFja1tpeF1bMV1dID0gcm9sbGJhY2tbaXhdWzNdO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogUm9sbCBiYWNrIGFsbCBjaGFuZ2VzXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fcm9sbGJhY2tDaGFuZ2VzID0gZnVuY3Rpb24gcm9sbGJhY2tDaGFuZ2VzKCkge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gU2Vzc2lvbnMuZ2V0KHRoaXMpO1xuXHRcdGNvbnN0IGNoYW5nZXMgPSB0aGlzLmdldENoYW5nZXMoKTtcblxuXHRcdGZvciAodmFyIG9iaklkIGluIGNoYW5nZXMpIHtcblx0XHRcdGNvbnN0IG9iaiA9IHNlc3Npb24ub2JqZWN0c1tvYmpJZF07XG5cblx0XHRcdGlmIChvYmopIHtcblx0XHRcdFx0Ly8gR28gdGhyb3VnaCBlYWNoIHJlY29yZGVkIGNoYW5nZSB3aGljaCBpcyBhIHBhaXIgb2Ygb2xkIGFuZCBuZXcgdmFsdWVzXG5cdFx0XHRcdGZvciAodmFyIHByb3AgaW4gY2hhbmdlc1tvYmpJZF0pIHtcblx0XHRcdFx0XHRjb25zdCBvbGRWYWx1ZSA9IGNoYW5nZXNbb2JqSWRdW3Byb3BdWzBdO1xuXG5cdFx0XHRcdFx0aWYgKG9sZFZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdGZvciAodmFyIGl4ID0gMDsgaXggPCBvbGRWYWx1ZS5sZW5ndGg7ICsraXgpIHtcblx0XHRcdFx0XHRcdFx0b2JqW3Byb3BdW2l4XSA9IG9sZFZhbHVlWzBdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRvYmpbcHJvcF0gPSBvbGRWYWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9kZWxldGVDaGFuZ2VzKCk7XG5cdH07XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhbiBlbXB0eSBvYmplY3QgdGhhdCB3aWxsIGhhdmUgcHJvcGVydGllcyB1cGRhdGVkIGFzIHRoZXlcblx0ICogY29tZSB1cCBpbiBhcHBseWluZyB0aGUgcmVtYWluaW5nIGNoYW5nZXMuICBUaGUgb2JqZWN0IGlzIHByZXN1bWFibHlcblx0ICogYWxyZWFkeSBpbiB0aGUgb2JqZWN0IHN0b3JlLiBJZiB0aGUgb2JqZWN0IGFscmVhZHkgZXhpc3RzIGluIHRoZSBvYmplY3Rcblx0ICogc3RvcmUgcmV0dXJuIGEgcmVmZXJlbmNlIHRvIGl0XG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gdGVtcGxhdGUgLSB0aGUgT2JqZWN0VGVtcGxhdGUgdGVtcGxhdGUgZm9yIHRoZSBvYmplY3Rcblx0ICogQHBhcmFtIHt1bmtub3dufSBvYmpJZCAtIHRoZSBpZCB0byBiZSBhc3NpZ25lZFxuXHQgKiBAcGFyYW0ge3Vua25vd259IGRlZmluZVByb3BlcnR5IC0gdGhlIHByb3BlcnR5IGRlZmluaXRpb24gZnJvbSB0aGUgdGVtcGxhdGVcblx0ICogQHBhcmFtIHt1bmtub3dufSBpc1RyYW5zaWVudCAtIHRydWUgaWYgbm90IHRvIGJlIHJlY29yZGVkIGluIHNlc3Npb25cblx0ICpcblx0ICogQHJldHVybnMgeyp9IC0gYW4gaW5zdGFuY2Ugb2YgdGhlIG9iamVjdFxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX2NyZWF0ZUVtcHR5T2JqZWN0ID0gZnVuY3Rpb24gY3JlYXRlRW1wdHlPYmplY3QodGVtcGxhdGUsIG9iaklkLCBkZWZpbmVQcm9wZXJ0eSwgaXNUcmFuc2llbnQpIHtcblx0XHRpZiAoIW9iaklkKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ19jcmVhdGVFbXB0eU9iamVjdCBjYWxsZWQgZm9yICcgKyB0ZW1wbGF0ZS5fX25hbWVfXyArICcgd2l0aG91dCBvYmpJZCBwYXJhbWV0ZXInKTtcblx0XHR9XG5cblx0XHRpZiAoIXRlbXBsYXRlLl9fY2hpbGRyZW5fXykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdfY3JlYXRlRW1wdHlPYmplY3QgY2FsbGVkIGZvciBpbmNvcnJlY3RseSBkZWZpbmVkIHRlbXBsYXRlICcgKyBvYmpJZCk7XG5cdFx0fVxuXG5cdFx0dGVtcGxhdGUgPSB0aGlzLl9yZXNvbHZlU3ViQ2xhc3ModGVtcGxhdGUsIG9iaklkLCBkZWZpbmVQcm9wZXJ0eSk7XG5cbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldCh0aGlzKTtcblx0XHRjb25zdCBzZXNzaW9uUmVmZXJlbmNlID0gc2Vzc2lvbiA/IHNlc3Npb24ub2JqZWN0c1tvYmpJZF0gOiBudWxsO1xuXHRcdGxldCBuZXdWYWx1ZTtcblxuXHRcdGlmIChzZXNzaW9uUmVmZXJlbmNlICYmICFpc1RyYW5zaWVudCkge1xuXHRcdFx0aWYgKHNlc3Npb25SZWZlcmVuY2UuX190ZW1wbGF0ZV9fID09IHRlbXBsYXRlKSB7XG5cdFx0XHRcdG5ld1ZhbHVlID0gc2Vzc2lvblJlZmVyZW5jZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0XHRgX2NyZWF0ZUVtcHR5T2JqZWN0IGNhbGxlZCBmb3IgJHt0ZW1wbGF0ZS5fX25hbWVfX30gYW5kIHNlc3Npb24gb2JqZWN0IHdpdGggdGhhdCBpZCBleGlzdHMgYnV0IGZvciB0ZW1wbGF0ZSAke3Nlc3Npb24ub2JqZWN0c1tvYmpJZF0uX190ZW1wbGF0ZV9fLl9fbmFtZV9ffWBcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGVtcGxhdGUuX19vYmplY3RUZW1wbGF0ZV9fLm5leHREaXNwZW5zZUlkID0gb2JqSWQ7XG5cdFx0XHR0aGlzLm5leHREaXNwZW5zZUlkID0gb2JqSWQ7IC8qKiBNYXkgYmUgcmVkdW5kYW50IHdpdGggcHJldmlvdXMgbGluZSAqL1xuXHRcdFx0Y29uc3Qgd2FzVHJhbnNpZW50ID0gdGhpcy5fX3RyYW5zaWVudF9fO1xuXG5cdFx0XHRpZiAoaXNUcmFuc2llbnQpIHtcblx0XHRcdFx0dGhpcy5fX3RyYW5zaWVudF9fID0gdHJ1ZTsgLy8gcHJldmVudCBzdGFzaE9iamVjdCBmcm9tIGFkZGluZyB0byBzZXNzaW9ucy5vYmplY3RzXG5cdFx0XHR9XG5cblx0XHRcdG5ld1ZhbHVlID0gbmV3IHRlbXBsYXRlKCk7IC8vIF9zdGFzaE9iamVjdCB3aWxsIGFzc2lnbiB0aGlzLm5leHREaXNwZW5zZUlkIGlmIHByZXNlbnRcblxuXHRcdFx0aWYgKCF0aGlzLl9fY2hhbmdlVHJhY2tpbmdfXykge1xuXHRcdFx0XHRuZXdWYWx1ZS5fX2NoYW5nZWRfXyA9IGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9fdHJhbnNpZW50X18gPSB3YXNUcmFuc2llbnQ7XG5cblx0XHRcdGlmIChpc1RyYW5zaWVudCkge1xuXHRcdFx0XHRuZXdWYWx1ZS5fX3RyYW5zaWVudF9fID0gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFuZXdWYWx1ZS5fX29iamVjdFRlbXBsYXRlX18gJiYgdGhpcy5zZXNzaW9ucykge1xuXHRcdFx0XHQvLyAgTm9uLVRTIHRlbXBsYXRlcyB3aWxsIGhhdmUgX19vYmplY3RUZW1wbGF0ZV9fXG5cdFx0XHRcdHRoaXMuc2Vzc2lvbml6ZShuZXdWYWx1ZSwgeyBfX29iamVjdFRlbXBsYXRlX186IHRoaXMgfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMucm9sZSA9PSAnY2xpZW50JyAmJiB0eXBlb2YgbmV3VmFsdWUuY2xpZW50UHJlSW5pdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0bmV3VmFsdWUuY2xpZW50UHJlSW5pdC5jYWxsKCk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMucm9sZSA9PSAnc2VydmVyJyAmJiB0eXBlb2YgbmV3VmFsdWUuc2VydmVyUHJlSW5pdCA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdFx0bmV3VmFsdWUuc2VydmVyUHJlSW5pdC5jYWxsKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG5ld1ZhbHVlO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBBZGQgYSBmdW5jdGlvbiB0aGF0IHdpbGwgZmlyZSBvbiBvYmplY3QgY3JlYXRpb25cblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSB0ZW1wbGF0ZSB1bmtub3duXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gaW5qZWN0b3IgdW5rbm93blxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuaW5qZWN0ID0gZnVuY3Rpb24gaW5qZWN0KHRlbXBsYXRlLCBpbmplY3Rvcikge1xuXHRcdHRlbXBsYXRlLl9faW5qZWN0aW9uc19fLnB1c2goaW5qZWN0b3IpO1xuXHRcdC8vIEdvIHRocm91Z2ggZXhpc3Rpbmcgb2JqZWN0cyB0byBpbmplY3QgdGhlbSBhcyB3ZWxsXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cblx0XHRmb3IgKHZhciBvYmogaW4gc2Vzc2lvbi5vYmplY3RzKSB7XG5cdFx0XHRpZiAodGhpcy5fZ2V0QmFzZUNsYXNzKHNlc3Npb24ub2JqZWN0c1tvYmpdLl9fdGVtcGxhdGVfXykgPT0gdGhpcy5fZ2V0QmFzZUNsYXNzKHRlbXBsYXRlKSkge1xuXHRcdFx0XHRpbmplY3Rvci5jYWxsKHNlc3Npb24ub2JqZWN0c1tvYmpdKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0LyoqKioqKioqKioqKioqKioqKioqKioqKioqKiogTWVzc2FnZSBNYW5hZ2VtZW50IEZ1bmN0aW9ucyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cdC8qKlxuXHQgKiBBZGQgYSByZW1vdGUgY2FsbCB0byB0aGUgcXVldWUgZm9yIHNlcXVlbnRpYWwgdHJhbnNtaXNzaW9uXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gb2JqSWQgLSBUaGUgaWQgb2YgdGhlIG9iamVjdCBvd25pbmcgdGhlIG1ldGhvZFxuXHQgKiBAcGFyYW0ge3Vua25vd259IGZ1bmN0aW9uTmFtZSAtIHRoZSBtZXRob2Rcblx0ICogQHBhcmFtIHt1bmtub3dufSBkZWZlcnJlZCAtIEEgUSBkZWZlcnJlZCBvYmplY3QgY29udGFpbmluZyBhIHByb21pc2Vcblx0ICogQHBhcmFtIHt1bmtub3dufSBhcmdzIC0gYXJndW1lbnRzIHRvIHRoZSBtZXRob2QgY2FsbFxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblxuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fcXVldWVSZW1vdGVDYWxsID0gZnVuY3Rpb24gcXVldWVSZW1vdGVDYWxsKG9iaklkLCBmdW5jdGlvbk5hbWUsIGRlZmVycmVkLCBhcmdzKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cdFx0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3MpOyAvLyBKUyBhcmd1bWVudHMgYXJyYXkgbm90IGFuIGFycmF5IGFmdGVyIGFsbFxuXG5cdFx0c2Vzc2lvbi5yZW1vdGVDYWxscy5wdXNoKHtcblx0XHRcdHR5cGU6ICdjYWxsJyxcblx0XHRcdG5hbWU6IGZ1bmN0aW9uTmFtZSxcblx0XHRcdGlkOiBvYmpJZCxcblx0XHRcdGRlZmVycmVkOiBkZWZlcnJlZCxcblx0XHRcdHN5bmM6IHRydWUsXG5cdFx0XHRhcmd1bWVudHM6IEpTT04uc3RyaW5naWZ5KHRoaXMuX3RvVHJhbnNwb3J0KGFyZ3MpKSxcblx0XHRcdGNoYW5nZXM6IEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0Q2hhbmdlcygpKVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5fZGVsZXRlQ2hhbmdlcygpO1xuXHRcdHRoaXMuX3Byb2Nlc3NRdWV1ZSgpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBUYWtlIG5leHQgbWVzc2FnZSBvdXQgb2YgdGhlIHF1ZXVlIGZvciB0aGUgc2Vzc2lvbiBhbmQgcHJvY2VzcyB0aGVtXG5cdCAqIG1lc3NhZ2VzIGEgc2VyaWFsaXplZCBpbiB0aGF0IGEgcmVzcG9uc2UgbXVzdCBiZSByZWNlaXZlZCBiZWZvcmVcblx0ICogdGhlIG5leHQgb25lIGlzIHNlbnRcblx0ICpcblx0ICogQHByaXZhdGVcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9wcm9jZXNzUXVldWUgPSBmdW5jdGlvbiBwcm9jZXNzUXVldWUoKSB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBTZXNzaW9ucy5nZXQodGhpcyk7XG5cblx0XHRpZiAoc2Vzc2lvbi5zZW5kTWVzc2FnZSAmJiBzZXNzaW9uLnNlbmRNZXNzYWdlRW5hYmxlZCkge1xuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IHRoaXMuZ2V0TWVzc2FnZSgpO1xuXG5cdFx0XHRpZiAobWVzc2FnZSkge1xuXHRcdFx0XHRzZXNzaW9uLnNlbmRNZXNzYWdlKG1lc3NhZ2UpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogQ29udmVydHMgYW4gb2JqZWN0IGludG8gYSB0cmFuc3BvcnRhYmxlIHN0cnVjdHVyZSB0aGF0IGlzIGVucmljaGVkIHdpdGhcblx0ICogdHlwZSBpbmZvcm1hdGlvbiBhbmQgcmVwbGFjZXMgb2JqZWN0IHJlZmVyZW5jZXMgd2l0aCBJZHMuICBUaGlzIGNhbiBvbmx5XG5cdCAqIGJlIGNvbnZlcnRlZCBiYWNrIG9uY2UgYW55IG9iamVjdHMgYXJlIHN5bmNocm9uaXplZCB2aWEgYXBwbHlDaGFuZ2VzKClcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBvYmogLSB0aGUgcm9vdCBvYmplY3Rcblx0ICpcblx0ICogQHJldHVybnMge09iamVjdH0gLSBhbiBlbnJpY2hlZCByb290IG9iamVjdFxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX3RvVHJhbnNwb3J0ID0gZnVuY3Rpb24gY2xvbmUob2JqKSB7XG5cdFx0bGV0IHJlczogYW55ID0ge3R5cGU6IG51bGx9O1xuXG5cdFx0Ly8gUmVwbGFjZSByZWZlcmVuY2VzIHdpdGggYW4gb2JqZWN0IHRoYXQgZGVzY3JpYmVzIHRoZSB0eXBlXG5cdFx0Ly8gYW5kIGhhcyBhIHByb3BlcnR5IGZvciB0aGUgb3JpZ2luYWwgdmFsdWVcblx0XHRpZiAob2JqIGluc3RhbmNlb2YgRGF0ZSkge1xuXHRcdFx0cmVzID0geyB0eXBlOiAnZGF0ZScsIHZhbHVlOiBvYmouZ2V0VGltZSgpIH07XG5cdFx0fSBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0cmVzID0geyB0eXBlOiAnYXJyYXknLCB2YWx1ZTogW10gfTtcblxuXHRcdFx0Zm9yICh2YXIgaXggPSAwOyBpeCA8IG9iai5sZW5ndGg7ICsraXgpIHtcblx0XHRcdFx0cmVzLnZhbHVlW2l4XSA9IHRoaXMuX3RvVHJhbnNwb3J0KG9ialtpeF0pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIG9iaiA9PT0gJ251bWJlcicgfHwgb2JqIGluc3RhbmNlb2YgTnVtYmVyKSB7XG5cdFx0XHRyZXMgPSB7IHR5cGU6ICdudW1iZXInLCB2YWx1ZTogTnVtYmVyKG9iaikgfTtcblx0XHR9IGVsc2UgaWYgKHR5cGVvZiBvYmogPT09ICdzdHJpbmcnIHx8IG9iaiBpbnN0YW5jZW9mIFN0cmluZykge1xuXHRcdFx0cmVzID0geyB0eXBlOiAnc3RyaW5nJywgdmFsdWU6IG9iai50b1N0cmluZygpIH07XG5cdFx0fSBlbHNlIGlmICh0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgb2JqIGluc3RhbmNlb2YgQm9vbGVhbikge1xuXHRcdFx0cmVzID0geyB0eXBlOiAnYm9vbGVhbicsIHZhbHVlOiBvYmogfTtcblx0XHR9IGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIE9iamVjdCkge1xuXHRcdFx0Ly8gRm9yIG9iamVjdHMgY3JlYXRlZCBieSBSZW1vdGVPYmplY3QganVzdCB0cmFuc3BvcnQgdGhlaXIgSURcblx0XHRcdGlmIChvYmouX19pZF9fKSB7XG5cdFx0XHRcdHJlcyA9IHsgdHlwZTogJ2lkJywgdmFsdWU6IG9iai5fX2lkX18gfTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIE90aGVyd2lzZSBncmFiIGVhY2ggaW5kaXZpZHVhbCBwcm9wZXJ0eVxuXHRcdFx0XHRyZXMgPSB7IHR5cGU6ICdvYmplY3QnLCB2YWx1ZToge30gfTtcblx0XHRcdFx0Zm9yICh2YXIgcHJvcCBpbiBvYmopIHtcblx0XHRcdFx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KHByb3ApKSB7XG5cdFx0XHRcdFx0XHRyZXMudmFsdWVbcHJvcF0gPSB0aGlzLl90b1RyYW5zcG9ydChvYmpbcHJvcF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXM7XG5cdH07XG5cblx0LyoqXG5cdCAqIFJlc3RvcmUgYW4gZW5yaWNoZWQgb2JqZWN0IGZyb20gaXRzIHRyYW5zcG9ydCBzdHJ1Y3R1cmUsIHJlcGxhY2luZ1xuXHQgKiBvYmplY3QgcmVmZXJlbmNlcyB0byB0aGUgcmVhbCBvYmplY3RzIGJhc2VkIG9uIHRoZWlyIGlkJ3Ncblx0ICogSW1wb3J0YW50OiBVbmRlciBubyBjaXJjdW1zdGFuY2VzIHdpbGwgdGhpcyBpbnN0YW50aWF0ZSBvdGhlciB0aGFuIGEgcHJpbWl0aXZlIG9iamVjdFxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IG9iaiAtIGFuIG9iamVjdCBwcm9kdWNlZCB3aXRoIHRvVHJhbnNwb3J0KClcblx0ICpcblx0ICogQHJldHVybnMgeyp9IC0gdGhlIG9yaWdpbmFsIG9iamVjdFxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0UmVtb3RlT2JqZWN0VGVtcGxhdGUuX2Zyb21UcmFuc3BvcnQgPSBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldCh0aGlzKTtcblxuXHRcdHN3aXRjaCAob2JqLnR5cGUpIHtcblx0XHRcdGNhc2UgJ2RhdGUnOlxuXHRcdFx0XHRvYmogPSBuZXcgRGF0ZShvYmoudmFsdWUpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnc3RyaW5nJzpcblx0XHRcdFx0b2JqID0gb2JqLnZhbHVlO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnbnVtYmVyJzpcblx0XHRcdFx0b2JqID0gTnVtYmVyKG9iai52YWx1ZSk7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlICdib29sZWFuJzpcblx0XHRcdFx0b2JqID0gb2JqLnZhbHVlO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnYXJyYXknOlxuXHRcdFx0XHRjb25zdCBvYmphID0gW107XG5cblx0XHRcdFx0Zm9yICh2YXIgaXggPSAwOyBpeCA8IG9iai52YWx1ZS5sZW5ndGg7ICsraXgpIHtcblx0XHRcdFx0XHRvYmphW2l4XSA9IHRoaXMuX2Zyb21UcmFuc3BvcnQob2JqLnZhbHVlW2l4XSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvYmogPSBvYmphO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnaWQnOlxuXHRcdFx0XHRvYmogPSBzZXNzaW9uLm9iamVjdHNbb2JqLnZhbHVlXTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgJ29iamVjdCc6XG5cdFx0XHRcdGNvbnN0IG9iam8gPSB7fTtcblxuXHRcdFx0XHRmb3IgKHZhciBwcm9wIGluIG9iai52YWx1ZSkge1xuXHRcdFx0XHRcdG9iam9bcHJvcF0gPSB0aGlzLl9mcm9tVHJhbnNwb3J0KG9iai52YWx1ZVtwcm9wXSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRvYmogPSBvYmpvO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSBudWxsOlxuXHRcdFx0XHRvYmogPSBudWxsO1xuXHRcdH1cblxuXHRcdHJldHVybiBvYmo7XG5cdH07XG5cblx0LyoqKioqKioqKioqKioqKioqKioqKioqKioqKiogSGVscGVyIEZ1bmN0aW9ucyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5cdC8qKlxuXHQgKlxuXHQgKiBIZWxwZXIgdG8gZXh0cmFjdCBhcmd1bWVudHMgZnJvbSB0aGUgcmVtb3RlIGNhbGxcblx0ICpcblx0ICogQHBhcmFtIHtPYmplY3R9IHJlbW90ZUNhbGwgVGhlIGFic3RyYWN0aW9uIG9mIGEgcmVtb3RlQ2FsbCBmb3IgdGhpcyBmbG93LiBIYXMgdGhlIGFyZ3VtZW50c1xuXHQgKlxuXHQgKiBAcmV0dXJucyB7T2JqZWN0fSB0aGUgYXJyYXkgb2YgYXJndW1lbnRzIGZyb20gdGhlIGNhbGxcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9leHRyYWN0QXJndW1lbnRzID0gZnVuY3Rpb24gZXh0cmFjdEFyZ3VtZW50cyhyZW1vdGVDYWxsKSB7XG5cdFx0Y29uc3QgYXJncyA9IEpTT04ucGFyc2UocmVtb3RlQ2FsbC5hcmd1bWVudHMpO1xuXHRcdHJldHVybiB0aGlzLl9mcm9tVHJhbnNwb3J0KGFyZ3MpO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBSZW1vdmUgZXh0cmEgcG9zaXRpb25zIGF0IHRoZSBlbmQgb2YgdGhlIGFycmF5IHRvIGtlZXAgbGVuZ3RoIGNvcnJlY3Rcblx0ICpcblx0ICogQHBhcmFtIHt1bmtub3dufSBhcnJheSB1bmtub3duXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fdHJpbUFycmF5ID0gZnVuY3Rpb24gdHJpbUFycmF5KGFycmF5KSB7XG5cdFx0d2hpbGUgKFxuXHRcdFx0YXJyYXkubGVuZ3RoID4gMCAmJlxuXHRcdFx0KHR5cGVvZiBhcnJheVthcnJheS5sZW5ndGggLSAxXSA9PT0gJ3VuZGVmaW5lZCcgfHwgYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV0gPT0gbnVsbClcblx0XHQpIHtcblx0XHRcdGFycmF5LnNwbGljZShhcnJheS5sZW5ndGggLSAxLCAxKTtcblx0XHR9XG5cdH07XG5cblx0LyoqXG5cdCAqIEdldCB0aGUgY3VycmVudCBzZXNzaW9uIHN0cnVjdHVyZVxuXHQgKlxuXHQgKiBAcmV0dXJucyB7Kn0gdGhlIHNlc3Npb25cblx0ICpcblx0ICogQHByaXZhdGVcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9nZXRTZXNzaW9uID0gZnVuY3Rpb24gX2dldFNlc3Npb24oc2Vzc2lvbklkPykge1xuXHRcdHJldHVybiBTZXNzaW9ucy5nZXQodGhpcywgc2Vzc2lvbklkKTtcblx0fTtcblxuXHQvKipcblx0ICogUHVycG9zZSB1bmtub3duXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gc2Vzc2lvbklkIHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMge3Vua25vd259IHVua25vd25cblx0ICpcblx0ICogQHByaXZhdGVcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9nZXRTdWJzY3JpcHRpb25zID0gZnVuY3Rpb24gX2dldFN1YnNjcmlwdGlvbnMoc2Vzc2lvbklkPykge1xuXHRcdHJldHVybiBTdWJzY3JpcHRpb25zLmdldFN1YnNjcmlwdGlvbnModGhpcywgc2Vzc2lvbklkKTtcblx0fTtcblxuXHQvKipcblx0ICogUHVycG9zZSB1bmtub3duXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5fZGVsZXRlQ2hhbmdlcyA9IGZ1bmN0aW9uIGRlbGV0ZUNoYW5nZXMoKSB7XG5cdFx0Y29uc3QgdHlwZXMgPSBbJ2FycmF5JywgJ2FycmF5RGlydHknLCAnY2hhbmdlJ107XG5cdFx0dHlwZXMuZm9yRWFjaCgodHlwZSkgPT4gQ2hhbmdlR3JvdXBzLnJlbW92ZUFsbCh0eXBlLCB0aGlzKSk7XG5cdH07XG5cblx0LyoqXG5cdCAqIFB1cnBvc2UgdW5rbm93blxuXHQgKlxuXHQgKiBAcGFyYW0ge3Vua25vd259IHN1YnNjcmlwdGlvbklkIHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMge3Vua25vd259IHVua25vd25cblx0ICpcblx0ICogQHByaXZhdGVcblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLl9nZXRTdWJzY3JpcHRpb24gPSBmdW5jdGlvbiBfZ2V0U3Vic2NyaXB0aW9uKHN1YnNjcmlwdGlvbklkKSB7XG5cdFx0cmV0dXJuIFN1YnNjcmlwdGlvbnMuZ2V0U3Vic2NyaXB0aW9uKHRoaXMsIHN1YnNjcmlwdGlvbklkKTtcblx0fTtcblxuXHQvKipcblx0ICogUHVycG9zZSB1bmtub3duXG5cdCAqXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gcHJvcCB1bmtub3duXG5cdCAqIEBwYXJhbSB7dW5rbm93bn0gbG9nVmFsdWUgdW5rbm93blxuXHQgKiBAcGFyYW0ge3Vua25vd259IGRlZmluZVByb3BlcnR5IHVua25vd25cblx0ICpcblx0ICogQHJldHVybnMge3Vua25vd259IHVua25vd25cblx0ICovXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLmNsZWFuUHJpdmF0ZVZhbHVlcyA9IGZ1bmN0aW9uIGNsZWFuUHJpdmF0ZVZhbHVlcyhwcm9wLCBsb2dWYWx1ZSwgZGVmaW5lUHJvcGVydHkpIHtcblx0XHRpZiAocHJvcC5tYXRjaCgvcGFzc3dvcmR8c3NufHNvY2lhbHNlY3VyaXR5fHBpbi9pKSAmJiBkZWZpbmVQcm9wZXJ0eS5sb2dDaGFuZ2VzICE9ICdmYWxzZScpIHtcblx0XHRcdHJldHVybiAnKioqJztcblx0XHR9XG5cblx0XHRyZXR1cm4gbG9nVmFsdWU7XG5cdH07XG5cbiAgICBSZW1vdGVPYmplY3RUZW1wbGF0ZS5iaW5kRGVjb3JhdG9ycyA9IGZ1bmN0aW9uIChvYmplY3RUZW1wbGF0ZSkge1xuICAgICAgICBvYmplY3RUZW1wbGF0ZSA9IG9iamVjdFRlbXBsYXRlIHx8IHRoaXM7XG5cbiAgICAgICAgdGhpcy5zdXBlcnR5cGVDbGFzcyA9IHN1cGVydHlwZUNsYXNzLmJpbmQodGhpcywgb2JqZWN0VGVtcGxhdGUsIFN1cGVydHlwZU1vZHVsZSk7XG4gICAgICAgIHRoaXMuU3VwZXJ0eXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFN1cGVydHlwZSh0aGlzLCBvYmplY3RUZW1wbGF0ZSwgU3VwZXJ0eXBlTW9kdWxlLlN1cGVydHlwZSk7IC8vIFRoaXMgaXMgdGhlIGNsYXNzIGRlZmluaXRpb24gaXRzZWxmXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuU3VwZXJ0eXBlLnByb3RvdHlwZSA9IFN1cGVydHlwZU1vZHVsZS5TdXBlcnR5cGUucHJvdG90eXBlO1xuICAgICAgICB0aGlzLnByb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BzKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJvcGVydHkob2JqZWN0VGVtcGxhdGUsIFN1cGVydHlwZU1vZHVsZSwgcHJvcHMsIHRoaXMudG9DbGllbnRSdWxlU2V0LCB0aGlzLnRvU2VydmVyUnVsZVNldCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMucmVtb3RlID0gcmVtb3RlLmJpbmQobnVsbCwgb2JqZWN0VGVtcGxhdGUpO1xuICAgIH07XG5cblxuICAgIFJlbW90ZU9iamVjdFRlbXBsYXRlLlBlcnNpc3RhYmxlID0gUGVyc2lzdGFibGU7XG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLlJlbW90ZWFibGUgPSBSZW1vdGVhYmxlO1xuXHRSZW1vdGVPYmplY3RUZW1wbGF0ZS5CaW5kYWJsZSA9IEJpbmRhYmxlO1xuXG5cdFJlbW90ZU9iamVjdFRlbXBsYXRlLmJpbmREZWNvcmF0b3JzKCk7IC8vRGVmYXVsdCB0byBiaW5kaW5nIHRvIHlvdXJzZWxmXG5cblx0cmV0dXJuIFJlbW90ZU9iamVjdFRlbXBsYXRlO1xufSk7XG4iXX0=