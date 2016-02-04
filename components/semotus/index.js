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
if (typeof(require) != 'undefined') {
    var Q = require('q');
    /** type {ObjectTemplate} */
    var ObjectTemplate = require('supertype');
}
var RemoteObjectTemplate = ObjectTemplate._createObject();
//RemoteObjectTemplate._useGettersSetters = typeof(window) == "undefined" ? true : (document.addEventListener ? true : false);
RemoteObjectTemplate._useGettersSetters = typeof(window) == "undefined" ? true : false;
RemoteObjectTemplate.role = (typeof(window) == "undefined") ? "server" : "client";
RemoteObjectTemplate.__changeTracking__ = true; // Set __changed__ when setter fires

/**************************** Public Interface **********************************/

RemoteObjectTemplate.logLevel = 0;
RemoteObjectTemplate.maxClientSequence = 1;

RemoteObjectTemplate.log = function (level, data) {
    if (level > this.logLevel)
        return;
    var t = new Date();
    var time = t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate() + " " +
        t.toTimeString().replace(/ .*/, '') + ":" + t.getMilliseconds();
    if (level == 0 && this.changeString)
        console.log(time + "(" + this.currentSession +") " + (level == 0 ? 'ERROR: ' : '') + "RemoteObjectTemplate: Recently applied changes to "
            + this.changeCount + " objects " + this.changeString);
    var message = (time + "(" + this.currentSession +") " + "RemoteObjectTemplate:" + data);
    console.log(message);
    var logger = this.logger
    if (level == 0 && this.logger)
        setTimeout(function () {logger.call(null, message)}, 0);

}

/**
 * Obtain a session for tracking subscriptions
 *
 * @return {*}
 */
RemoteObjectTemplate.createSession = function(role, sendMessage, sessionId) {

    if (!this.sessions) {
        this.nextSubscriptionId = 0;
        this.nextSessionId = 1;
        this.sessions = {};
    }

    var sessionId = sessionId ? sessionId : this.nextSessionId++;
    this.setSession(sessionId);
    this.sessions[sessionId] = {
        subscriptions: {},              // Change listeners
        sendMessage: sendMessage,       // Send message callback
        sendMessageEnabled: sendMessage ? true : false,
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
    if (role instanceof  Array)
        for (var ix = 0; ix < role.length; ++ix)
            this.subscribe(role[ix]);
    else
        this.subscribe(role)
    this.role = role instanceof  Array ? role[1] : role;
    return sessionId;
}
RemoteObjectTemplate.deleteSession = function(sessionId) {
    if (this.sessions[sessionId])
        delete  this.sessions[sessionId];
}
RemoteObjectTemplate.setMinimumSequence = function(nextObjId) {
    this._getSession().nextObjId = Math.max(nextObjId, this._getSession().nextObjId);
}

/**
 * Save the session data in a way that can be serialized/de-serialized
 *
 * @param sessionId
 * @return {Object}
 */
RemoteObjectTemplate.saveSession = function(sessionId) {
    var session = this._getSession(sessionId);
    var callCount = 0;
    for (var calls in session.pendingRemoteCalls)
        ++callCount
    session.nextSaveSessionId = session.nextSaveSessionId + 1;
    session.savedSessionId = session.nextSaveSessionId;
    var objects = session.objects;
    session.objects = {}
    var str = {
        callCount: this.getPendingCallCount(sessionId), // Can't just restore on another server and carry on
        revision: session.savedSessionId,               // Used to see if our memory copy good enough
        referenced: new Date().getTime(),               // Used for reaping old sessions
        data: JSON.stringify(session)                   // All the session data
    }
    session.objects = objects;
    this.log(2, "Saved session");
    return str;
}

RemoteObjectTemplate.getPendingCallCount = function(sessionId) {
    var session = this._getSession(sessionId);
    var callCount = 0;
    for (var calls in session.pendingRemoteCalls)
        ++callCount;
    return callCount;
}

/**
 * Restore session that was potentially serialized/de-searialized
 *
 * A revision number is used to determine whether the in-memory copy is good
 *
 * @param sessionId - the id under which it was created with createSession
 * @param savedSession - the POJO version of the sesion data
 * @param sendMessage - new message function to be in effect
 * @return {Boolean} false means that messages were in flight and a reset is needed
 */
RemoteObjectTemplate.restoreSession = function(sessionId, savedSession, sendMessage) {
    this.setSession(sessionId);
    var session = this.sessions[sessionId];
    this.log(2, "Restored session");
    if (session)
        if (session.savedSessionId == savedSession.revision)
            return true;
        else
            delete this.sessions[sessionId];
    this.sessions[sessionId] = JSON.parse(savedSession.data)
    this.sessions[sessionId].sendMessage = sendMessage;
    return savedSession.callCount > 0;
}

/**
 * Indicate that all changes have been accepted outside of the message
 * mechanism as would usually happen when a session is starting up
 *
 * @param sessionId
 */
RemoteObjectTemplate.syncSession = function(sessionId) {
    var session = this._getSession(sessionId);
    this.getChanges();
    this._deleteChanges();
}

/**
 * Set the current session to a session id returned from createSession()
 * Relies on a single threaded model such as node.js
 *
 * @param sessionId
 */
RemoteObjectTemplate.setSession = function(sessionId) {
    this.currentSession = sessionId;
}

/**
 * Enable/Disable sending of messages and optionally provide a new callback
 *
 * @param value boolean to enable/disable
 * @param messageCallback optional call back function
 * @param sessionId optional session id
 */
RemoteObjectTemplate.enableSendMessage = function (value, messageCallback, sessionId) {
    var session = this._getSession(sessionId);
    session.sendMessageEnabled = value;
    if (messageCallback)
        session.sendMessage = messageCallback;
}

/**
 * Subscribe to changes and optionally establish subscription as the
 * sole recipient of remote call messages.  Change tracking is then managed
 * by the functions that follow.
 *
 * @param role
 * @param sendMessage and optional call back for sending messages
 * @return {*}
 */
RemoteObjectTemplate.subscribe = function (role) {
    var subscriptionId = this._getSession().nextSubscriptionId++
    this._getSession().subscriptions[subscriptionId] = {
        role: role,
        log: {
            array: {},
            change: {}
        }
    };
    return subscriptionId;
}

/**
 * Process a remote call message that was created and passed to the sendMessage callback
 *
 * @param remoteCall - key/value set containing the remote call details and pending sync chnages
 */
RemoteObjectTemplate.processMessage = function(remoteCall, subscriptionId, restoreSessionCallback) {
    if (!remoteCall)
        return;
    var hadChanges = 0;
    var session = this._getSession();
    var remoteCallId = remoteCall.remoteCallId;
    switch (remoteCall.type) {

        case 'ping':

            this.log(1, "ping");
            session.sendMessage({type: 'pinged', sync: true, value: null, name: null, changes: null});
            break;

        case 'sync':

            this.log(1, "sync");

            // Apply any pending changes passed along as part of the call and then either
            // Call the method, sending back the result in a response message
            // or return an error response so the caller will roll back
            if (!this._applyChanges(JSON.parse(remoteCall.changes), this.role == 'client', subscriptionId)) {
                this.log(0, "Could not apply changes on sync message");
                this._convertArrayReferencesToChanges();
                this._deleteChanges();
                this._processQueue();
            }
            break;

        case 'call':

            this.log(1, "calling " + remoteCall.name + " [" + remoteCall.sequence + "]");
            var callContext = {retries: 0};
            return processCall.call(this);

        /**
         * We process the call the remote method in stages starting by letting the controller examine the
         * changes (preCallHook) and giving it a chance to refresh data if it needs to.  Then we apply any
         * changes in the messages and give the object owning the method a chance to validate that the
         * call is valid and take care of any authorization concerns.  Finally we let the controller perform
         * any post-call processing such as commiting data and then we deal with a failure or success.
         */
        function processCall (forceupdate) {
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
         * @returns {*}
         */
        function retryCall () {
            if (restoreSessionCallback)
                restoreSessionCallback();
            return processCall.call(this, true);
        }
        /**
         * Determine what objects changed and pass this to the preServerCall method on the controller
         */
        function preCallHook (forceupdate) {
            if (this.controller && this.controller['preServerCall']) {
                var changes = {};
                for (var objId in JSON.parse(remoteCall.changes))
                    changes[this.__dictionary__[objId.replace(/[^-]*-/,'').replace(/-.*/,'')].__name__] = true;
                return this.controller['preServerCall'].call(this.controller, remoteCall.changes.length > 2, changes, callContext, forceupdate)
            } else
                return true;
        }

        /**
         * Apply changes in the message and then validate the call.  Throw "Sync Error" if changes can't be applied
         */
        function applyChangesAndValidateCall () {
            this.log(1, "Calling " + remoteCall.name);
            var arguments = this._fromTransport(JSON.parse(remoteCall.arguments));
            if (this._applyChanges(JSON.parse(remoteCall.changes), this.role == 'client', subscriptionId)) {
                var obj = session.objects[remoteCall.id];
                if (!obj)
                    throw  new Error("Cannot find object for remote call " + remoteCall.id);
                if (this.role == 'server' && obj['validateServerCall'])
                    return obj['validateServerCall'].call(obj, remoteCall.name, callContext);
                else
                    return true;
            } else
                throw "Sync Error";
        }

        /**
         * If the changes could be applied and the validation was successful call the method
         * @param isValid
         */
        function callIfValid(isValid) {
            if (!isValid)
                throw  new Error(remoteCall.name + " refused");
            var obj = session.objects[remoteCall.id];
            var arguments = this._fromTransport(JSON.parse(remoteCall.arguments));
            return obj[remoteCall.name].apply(obj, arguments);
        }

        /**
         * Let the controller know that the method was completed and give it a chance to commit changes
         */
        function postCallHook (returnValue) {
            if (this.controller && this.controller['postServerCall'])
                return Q(this.controller['postServerCall'].call(this.controller, remoteCall.changes.length > 2, callContext))
                    .then(function () {
                        return returnValue
                    })
            else
                return returnValue;
        }

        /**
         * Package up any changes resulting from the execution and send them back in the message, clearing
         * our change queue to accumulate more changes for the next call
         * @param ret
         */
        function postCallSuccess(ret) {
            this.log(1, "replying to " + remoteCall.name + " [" + remoteCall.sequence + "]");
            packageChanges.call(this, {type: 'response', sync: true, value: JSON.stringify(this._toTransport(ret)),
                name: remoteCall.name,  remoteCallId: remoteCallId});
        }

        /**
         * Handle errors by returning an apropriate message.  In all cases changes sent back though they
         * @param err
         */
        function postCallFailure(err) {
            if (err == "Sync Error") {
                this.log(0, "Could not apply changes on calling " + remoteCall.name+ "[" + remoteCall.sequence + "]");
                packageChanges.call(this, {type: 'response', sync: false,
                    changes: "", remoteCallId: remoteCallId});
            } else if (err.message == "Update Conflict") { // Not this may be caught in the trasport (e.g. Amorphic) and retried)
                this.log(0, "Update Conflict" + remoteCall.name+ "[" + remoteCall.sequence + "]");
                if (callContext.retries++ < 5)
                    return retryCall.call(this);
                else
                    packageChanges.call(this, {type: 'retry', sync: false, remoteCallId: remoteCallId});
            } else {
                this.log(1, "replying to " + remoteCall.name + " [" + remoteCall.sequence + "] error " + err.toString());
                packageChanges.call(this, {type: 'error', sync: true, value: getError.call(this, err), name: remoteCall.name,
                    remoteCallId: remoteCallId});
            }
        }

        /**
         * Distinquish between an actual error (will throw an Error object) and a string that the application may
         * throw which is to get piped back to the caller.  For an actual error we want to log the stack trace
         * @param err
         * @returns {*}
         */
        function getError(err) {
            var errToSend = err instanceof Error
                ? {code: "internal_error", text: "An internal error occurred"}
                : typeof(err) == "string" ? {message: err} : err;
            if (err instanceof Error) // A non-thrown exception
                this.log(0, "Exception " + err.toString() + (err.stack ? " " + err.stack : ""));
            return errToSend;
        }

        /**
         * Deal with changes going back to the caller
         * @param message
         */
        function packageChanges(message) {
            this._convertArrayReferencesToChanges();
            message.changes = JSON.stringify(this.getChanges());
            session.sendMessage(message);
            this._deleteChanges();
            this._processQueue();
        }

            break;

        case 'response':
        case 'error':
            var doProcessQueue = true;
            this.log(1, "got remote response for " + remoteCall.name + "[" + remoteCall.sequence + "]");
            // If we are out of sync queue up a set Root if on server.  This could occur
            // if a session is restored but their are pending calls
            if (!session.pendingRemoteCalls[remoteCallId])
                this.log(0, "No remote call pending for " + remoteCallId + "[" + remoteCall.sequence + "]");
            else {
                if (typeof(remoteCall.sync) != 'undefined') {
                    if (remoteCall.sync) {
                        if (session.pendingRemoteCalls[remoteCallId].deferred.resolve) {
                            hadChanges = this._applyChanges(JSON.parse(remoteCall.changes), true, subscriptionId);
                            if (remoteCall.type == 'error')
                                session.pendingRemoteCalls[remoteCallId].deferred.reject(remoteCall.value);
                            else
                                session.pendingRemoteCalls[remoteCallId].deferred.resolve(this._fromTransport(JSON.parse(remoteCall.value)));
                        }
                    } else {
                        this._rollbackChanges();
                        session.pendingRemoteCalls[remoteCallId].deferred.reject({code: "internal_error_rollback", text:"An internal error occured"});
                        if (this.role == 'client') // client.js in amorphic will take care of this
                            doProcessQueue = false;
                    }
                }
                delete session.pendingRemoteCalls[remoteCallId];
            }
            if (doProcessQueue)
                this._processQueue();
            return hadChanges == 2 ? true : false;
    }
};

/**
 * Pick up next message (alternate interface to using a callback)
 *
 * @return {*} the message or null
 */
RemoteObjectTemplate.getMessage = function(sessionId, forceMessage) {
    var session = this._getSession(sessionId);
    var message = session.remoteCalls.shift();
    if (message) {
        var remoteCallId = session.nextPendingRemoteCallId++;
        message.remoteCallId = remoteCallId;
        session.pendingRemoteCalls[remoteCallId] = message;
    } else if (forceMessage) {
        message = {type: 'sync', sync: true, value: null, name: null, remoteCallId: null,
            changes: JSON.stringify(this.getChanges())};
        this._deleteChanges();
    }
    return message;
}

/**
 * Pick up all messages
 *
 * @return {[]} the messages in an array
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

RemoteObjectTemplate.getChangeGroup = function(type, subscriptionId) {
    return this._getSubscription(subscriptionId).log[type];
};

RemoteObjectTemplate.deleteChangeGroup = function(type, subscriptionId) {
    this._getSubscription(subscriptionId).log[type] = {};
};

RemoteObjectTemplate.getChanges = function(subscriptionId) {
    if (!this._useGettersSetters)
        this._generateChanges();
    this._convertArrayReferencesToChanges();
    var changes = this.getChangeGroup('change', subscriptionId);
    return changes;
};

RemoteObjectTemplate.getChangeStatus = function() {
    var session = this._getSession();
    var a = 0;
    var c = 0;
    for (var subscriptionId in this.subscriptions) {
        var changes = this.getChangeGroup('change', subscriptionId);
        for (var change in changes)
            ++c;
        var arrays = this.getChangeGroup('array', subscriptionId);
        for (var array in arrays)
            ++a
    }
    return + " " + a + " arrays " + c + " changes ";
}

/**
 *
 * Give an object a unique id and stash an object into the global object store
 *
 * @param obj
 * @private
 */
RemoteObjectTemplate._stashObject = function(obj, template) {
    var session = this._getSession(obj.__template__.remoteSessionId);
    var isRemote = session.dispenseNextId ? true : false;
    var objectId = session.dispenseNextId || (this.role + "-" + template.__name__ + "-" +  session.nextObjId++);
    session.dispenseNextId = null;
    if (!obj.__id__) {
        obj.__id__ = objectId;
        if (!this.__transient__)
            session.objects[obj.__id__] = obj;
    }
    if (obj.__id__.match(/^client.*?-([0-9]*)$/))
        this.maxClientSequence = Math.max(this.maxClientSequence, RegExp.$1);
    return isRemote;
};

RemoteObjectTemplate._injectIntoObject = function(obj) {
    ObjectTemplate._injectIntoObject(obj);
};

RemoteObjectTemplate._injectIntoTemplate = function(template) {
    ObjectTemplate._injectIntoTemplate(template);
};

/**
 * Function called to wrap a function as remote call that returns a promise
 * that is wrapped such that "this" points to the object.  This is only done
 * if this is a remote function, meaning that the role established when defining
 * the template is different than the role for RemoteObjectTemplate as a whole.
 *
 * @param propertyName - the name of the function
 * @param propertyValue - the function to be wrapped
 * @return {*} - the original function or a wrapper to make a remote call
 */
RemoteObjectTemplate._setupFunction = function(propertyName, propertyValue, role, validate) {
    /** @type {RemoteObjectTemplate} */
    var objectTemplate = this;
    var self = this;
    if (role == null || role == this.role)
        return propertyValue;
    else
    // Function wrapper it self will return a promise wrapped to setup the this pointer
    // the function body will queue a remote call to the client/server
        return function () {
            if(validate && this.controller)
                if (!validate.call(this.controller))
                    return Q.reject("validation failure");
            self.log(1, "sending remote call for " + propertyName);
            var deferred = Q.defer();
            objectTemplate._queueRemoteCall(this.__id__, propertyName, deferred, arguments);
            if (self.controller && self.controller.handleRemoteError) {
                deferred.promise.originalThen = deferred.promise.then;
                var handledRejection = false;
                deferred.promise.then = function (res, rej, not) {
                    if (rej)
                        handledRejection = true;
                    return deferred.promise.originalThen(res, rej, not)
                }
                Q.delay(0).then(function () {
                    if (!handledRejection)
                        return deferred.promise.then(null, function (error) {
                            self.controller && self.controller.handleRemoteError(error);
                            return Q(true);
                        });
                });
            }
            return deferred.promise;
        }
};

/**
 * Overridden method in ObjectTemplate that creates a structure initialize a property in constructor
 * and adds any getters and setters to the property so changes can be tracked
 *
 * @param propertyName - the name of the property
 * @param defineProperty - the property definition as passed to ObjectTemplate
 * @param objectProperties - the property definitions that will be hand processed
 * @param defineProperties - the property definitions to be processed by Object.defineProperty
 * @private
 */
RemoteObjectTemplate._setupProperty = function(propertyName, defineProperty, objectProperties, defineProperties, parentTemplate) {
    //determine whether value needs to be re-initialized in constructor
    var value = typeof(defineProperty.value) == 'undefined' ? null : defineProperty.value;
    objectProperties[propertyName] = {
        init:	 value,
        type:	 defineProperty.type,
        of:		 defineProperty.of,
        byValue: !(typeof(value) == 'boolean' || typeof(value) == 'number' || typeof(value) == 'string' || value == null)
    };

    // Don't redefine if in superclass
    var existingDefineProperty = parentTemplate ? this._getDefineProperty(propertyName, parentTemplate) : null;
    if (!existingDefineProperty) {
        // One property for real name which will have a getter and setter
        // and another property for the actual value __propertyname
        defineProperties[propertyName] = defineProperty;
        defineProperties['__' + propertyName] = {enumerable: false, writable: true};
    }

    // In the case where there are now getters and setters, the __prop represents
    // the original value

    // Setter
    var objectTemplate = this;
    if (this._useGettersSetters && this._manageChanges(defineProperty))
    {
        var createChanges = this._createChanges(defineProperty);

        defineProperty.set = (function() {
            // use a closure to record the property name which is not passed to the setter
            var prop = propertyName; return function (value) {
                if (this.__id__ && createChanges && transform(this["__" + prop]) !== transform(value)) {
                    objectTemplate._changedValue(this, prop, value);
                    if (objectTemplate.__changeTracking__)
                        this.__changed__ = true;
                }
                this["__" + prop] = value;
            }
            function transform(data) {
                try {
                    if (defineProperty.type == String || defineProperty.type == Number || !data)
                        return data;
                    if (defineProperty.type == Date)
                        return data.getTime();
                    if (defineProperty.type == Array) {
                        if (defineProperty.of.isObjectTemplate) {
                            if (data.length) {
                                var digest = "";
                                for (var ix = 0; ix < data.length; ++ix)
                                    digest += data[ix].__id__;
                                return digest;
                            }
                        } else
                            return JSON.stringify(data);
                    } else if(defineProperty.type.isObjectTemplate)
                        return data.__id__;
                    else
                        return JSON.stringify(data);
                } catch (e) {
                    console.log("caught exception trying to stringify " + prop);
                    return data;
                }
            }
        })();

        // Getter
        defineProperty.get = (function () {
            // use closure to record property name which is not passed to the getter
            var prop = propertyName; return function () {
                if (this["__" + prop] instanceof Array)
                    objectTemplate._referencedArray(this, prop, this["__" + prop]);
                return this["__"+prop];
            }
        })();
    } else
        objectProperties['__' + propertyName] = objectProperties[propertyName];


// Setters and Getters cannot have value or be writable
    if (this._useGettersSetters && this._manageChanges(defineProperty)) {
        delete defineProperty.value;
        delete defineProperty.writable;
    }
};

/**
 * Determine whether changes need to be created for a property
 * @param defineProperty
 * @return {Boolean}
 * @private
 */
RemoteObjectTemplate._createChanges = function (defineProperty, template)
{
    template = template || {};
    return !((defineProperty.isLocal == true) ||
    (defineProperty.toServer == false && this.role == "client") ||
    (defineProperty.toClient == false && this.role == "server") ||
    (template.__toServer__ == false && this.role == "client") ||
    (template.__toClient__ == false && this.role == "server"));
}

/**
 * Determine whether changes should be accepted for a property
 * @param defineProperty
 * @return {Boolean}
 * @private
 */
RemoteObjectTemplate._acceptChanges = function (defineProperty, template)
{
    template = template || {};
    return !((defineProperty.isLocal == true) ||
    (defineProperty.toServer == false && this.role == "server") ||
    (defineProperty.toClient == false && this.role == "client") ||
    (template.__toServer__ == false && this.role == "client") ||
    (template.__toClient__ == false && this.role == "server"));
}

/**
 * Determine whether any tracking of old values is needed
 * @param defineProperty
 * @return {Boolean}
 * @private
 */
RemoteObjectTemplate._manageChanges = function (defineProperty) {
    return !(defineProperty.isLocal == true || (defineProperty.toServer == false && defineProperty.toClient == false));
}

/**************************** Change Management Functions **********************************/

RemoteObjectTemplate._generateChanges = function () {
    var session = this._getSession();
    for (var obj in session.objects)
        this._logChanges(session.objects[obj]);
}

/**
 * Simulate getters and setters by tracking the old value and if it
 * has changed, creating a change log.  local properties are ignored
 * and properties not to be transmitted to the other party do not
 * generate changes but still track the old value so that changes
 * can be applied from the other party
 *
 * @param obj - object to be processed
 * @private
 */
RemoteObjectTemplate._logChanges = function (obj)
{
    // Go through all the properties and transfer them to newly created object
    var props = obj.__template__.getProperties();
    for (var prop in props) {
        var defineProperty = props[prop];
        var type = defineProperty.type;
        if (type && this._manageChanges(defineProperty))
        {
            var createChanges = this._createChanges(defineProperty, obj.__template__);

            if (type == Array)
            {
                if (createChanges) {
                    if (obj['__' + prop] && !obj[prop])
                    {
                        // switch to null treated like a property change
                        this._changedValue(obj, prop, obj[prop]);
                    }
                    else if (obj[prop])
                    {
                        // switch from null like an array ref where array will be created
                        if (!obj['__' + prop]) {
                            if (obj[prop].length == 0) // switch to empty array
                                this._changedValue(obj, prop, obj[prop]);
                            obj['__' + prop] = []; // Start from scratch
                        }
                        this._referencedArray(obj, prop, obj['__' + prop]);
                    }
                }
            }
            else
            {
                var currValue = this._convertValue(obj[prop]);
                var prevValue = this._convertValue(obj['__' + prop]);
                if (createChanges && currValue !== prevValue)
                    this._changedValue(obj, prop, obj[prop]);

                obj['__' + prop] = obj[prop];
            }
        }
    }
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
 * @param obj the object instance
 * @param prop the object property
 * @param value the new value
 * @private
 */
RemoteObjectTemplate._changedValue = function (obj, prop, value)
{
    if (obj.__transient__ || this.__transient__ ||
        (this.role == "client" && obj.__template__.__toClient__ == false) ||
        (this.role == "server" && obj.__template__.__toServer__ == false))
        return

    var subscriptions = this._getSubscriptions()
    for (var subscription in subscriptions) {
        if (subscriptions[subscription] != this.processingSubscription)
        {
            var changeGroup = this.getChangeGroup('change', subscription);

            // Get normalized values substituting ids for ObjectTemplate objects
            var newValue = this._convertValue(value);
            var oldValue = this._convertValue(obj['__' + prop]);

            // Create a new key in the change group if needed
            if (!changeGroup[obj.__id__])
                changeGroup[obj.__id__] = {};

            // For subsequent changes to the same element only store the new value and leave
            // the original old value intact
            if (changeGroup[obj.__id__][prop])
                changeGroup[obj.__id__][prop][1] = newValue;
            else
                changeGroup[obj.__id__][prop] = [oldValue, newValue];
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
 * @param obj the object instance
 * @param prop the property of the object (should be an array)
 * @param arrayRef the value returned in the reference (previous value)
 * @private
 */
RemoteObjectTemplate.   _referencedArray = function (obj, prop, arrayRef, sessionId)
{
    if (obj.__transient__ || this.__transient__ ||
        (this.role == "client" && obj.__template__.__toClient__ == false) ||
        (this.role == "server" && obj.__template__.__toServer__ == false))
        return

    // Track this for each subscription
    var subscriptions = this._getSubscriptions(sessionId)
    for (var subscription in subscriptions) {
        var changeGroup = this.getChangeGroup('array', subscription);
        if (subscriptions[subscription] != this.processingSubscription)
        {
            var key = obj.__id__ + "/" + prop;
            // Only record the value on the first reference
            if (!changeGroup[key]) {
                var old = [];
                // Walk through the array and grab the reference
                if (arrayRef)
                    for (var ix = 0; ix < arrayRef.length; ++ix) {
                        var elem = arrayRef[ix];
                        if (typeof(elem) != 'undefined' && elem != null)
                            if (elem != null && elem.__id__)
                                old[ix] = elem.__id__;
                            else // values start with an = to distinguish from ids
                                old[ix] = '=' + JSON.stringify(elem);
                    }
                changeGroup[key] = old;

            }
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
RemoteObjectTemplate._convertArrayReferencesToChanges = function()
{
    var session = this._getSession();
    var subscriptions = this._getSubscriptions();
    for (var subscription in subscriptions) {
        if (subscriptions[subscription] != this.processingSubscription)
        {
            var changeGroup = this.getChangeGroup('change', subscription);
            var refChangeGroup = this.getChangeGroup('array', subscription);

            // Look at every array reference
            for (var key in refChangeGroup) {

                // split the key into an id and property name
                var param = key.split("/");
                var id = param[0];
                var prop = param[1];

                // Get the current and original (at time of reference) values
                var obj = session.objects[id];

                if (!obj)
                    continue;

                var curr = obj[(this._useGettersSetters ? '__' : '') + prop];
                var orig = refChangeGroup[key];

                if (!curr)
                    curr = [];
                if (!orig)
                    orig = [];

                // Walk through all elements (which ever is longer, original or new)
                var len = Math.max(curr.length, orig.length);
                for (var ix = 0; ix < len; ++ix)
                {
                    // See if the value has changed
                    var currValue =
                        (typeof(curr[ix]) != 'undefined' && curr[ix] != null) ?
                        curr[ix].__id__ || ('=' + JSON.stringify(curr[ix])) : undefined;
                    var origValue = orig[ix];
                    if (origValue !== currValue ||
                        (changeGroup[obj.__id__] && changeGroup[obj.__id__][prop] && changeGroup[obj.__id__][prop][1][ix] != currValue))
                    {
                        // Create a new change group key if needed
                        if (!changeGroup[obj.__id__])
                            changeGroup[obj.__id__] = {};

                        // If this is a subsequent change just replace the new value
                        if (changeGroup[obj.__id__][prop]) {
                            if (changeGroup[obj.__id__][prop][1] instanceof Array)  // whole array could be getting null
                                changeGroup[obj.__id__][prop][1][ix] = currValue;
                        } else {
                            // Create an old and new value array with identical values and then
                            // substitute the one changed value in the appropriate position
                            var values = this._convertValue(orig);
                            changeGroup[obj.__id__][prop] = [this.clone(values), this.clone(values)];
                            changeGroup[obj.__id__][prop][1][ix] = currValue;
                        }
                    }
                    // Update previous value since change has been recorded
                    if (!this._useGettersSetters) {
                        if (!obj['__' + prop])
                            obj['__' + prop] = [];
                        obj['__' + prop][ix] = obj[prop][ix];
                    }
                }

            }
            this.deleteChangeGroup('array', subscription);
        }
    }
};

/**
 * Convert property value to suitabile change format which is always a string
 * ObjectTemplate objects always represented by their id
 *
 * @param value {Object}
 * @return {String} or Array of Strings
 * @private
 */
RemoteObjectTemplate._convertValue = function (value)
{
    if (value instanceof Array) {
        var newValue = [];
        for (var ix = 0; ix < value.length; ++ix)
            newValue[ix] =  value[ix] ? value[ix].__id__ ||
            (typeof(value[ix]) == 'object' ? JSON.stringify(value[ix]) : value[ix].toString()) : null;
        return newValue;
    } else if (value && value.__id__)
        return value.__id__;
    else if (value instanceof Date)
        return value.getTime();
    else
        return value ? (typeof(value) == 'object' ? JSON.stringify(value) : value.toString()) : value;
};

RemoteObjectTemplate.getObject = function(objId, template) {
    var session = this._getSession();
    var obj = session.objects[objId];
    return obj && obj.__template__ && obj.__template__ == template ? obj : null;
}

/**
 * Apply changes across all objects
 *
 * @param changes a property for each object changed with the details of the change
 * @param force if true changes will be accepted without rolling back
 * @param subscriptionId optional subscription id for changes
 * @return Number   0 - whether a rollback had to be done
 *                  1 - no objects processed
 *                  2 - objects processed
 * @private
 */
RemoteObjectTemplate._applyChanges = function(changes, force, subscriptionId)
{
    var session = this._getSession();	var rollback = [];
    this.processingSubscription = this._getSubscription(subscriptionId);

    // Walk through change queue looking for objects and applying new values or rolling back
    // if previous values don't match what changer things they are
    this.changeCount = 0;
    this.changeString = "";
    var hasObjects = false;
    for (var objId in changes) {
        var obj = session.objects[objId];
        if (obj)
            hasObjects = true;
        // If no reference derive template for object ID
        if (!obj) {
            var template = this.__dictionary__[objId.replace(/[^-]*-/,'').replace(/-.*/,'')];
            if (template) {
                force = true;
                obj = this._createEmptyObject(template, objId);
            } else
                console.log(0, "Could not find template for " + objId);
        }
        var validator = obj && (obj['validateServerIncomingObject'] || this.controller['validateServerIncomingObject']);
        var validatorThis = (obj && obj['validateServerIncomingObject']) ? obj : this.controller;
        if (validator)
            validator.call(validatorThis, obj)

        if (!obj || !this._applyObjectChanges(changes, rollback, obj, force)) {
            this.processingSubscription = false;
            this._rollback(rollback);
            this._deleteChanges();
            this.log(0, "Could not apply changes to " + objId);
            this.changeString = "";
            return 0;
        }
    }
    /*  We used to delete changes but this means that changes while a message is processed
     is effectively lost.  Now we just don't record changes while processing.
     this._deleteChanges();
     */
    this.processingSubscription = null;
    this.log(2, "Applied changes to " + this.changeCount + " objects " + this.changeString);
    return hasObjects ? 2 : 1;
};

/**
 * Apply changes for a specific object
 *
 * @param changes all changes
 * @param rollback an array of changes that would have to be rolled back
 * @param obj the object instance that was changed
 * @param force whether changes can be rolled back
 * @return {Boolean} whether a rollback needs to be done
 * @private
 */
RemoteObjectTemplate._applyObjectChanges = function(changes, rollback, obj, force)
{
    // Go through each recorded change which is a pair of old and new values
    for (var prop in changes[obj.__id__]) {
        var change = changes[obj.__id__][prop];
        var oldValue = change[0];
        var newValue = change[1];
        var defineProperty = this._getDefineProperty(prop, obj.__template__);
        if (!defineProperty) {
            this.log(0, "Could not apply change to " + obj.__template__.__name__ + "." + prop +
                " property not defined in template");
            return false;

        }
        if (defineProperty.type === Array) {
            if (newValue instanceof Array) {
                if (!(obj[prop] instanceof Array)) {
                    obj[prop] = [];
                    obj.__tainted__ = true;
                }
                var length = Math.max(newValue.length, oldValue ? oldValue.length : 0);
                for (var ix = 0; ix < length; ++ix) {
                    function unarray(value) {
                        try {return (value && (value + "").substr(0,1) == "=") ? JSON.parse((value + "").substr(1)) : value;
                        } catch (e) {return  "";}
                    }

                    var unarray_newValue = unarray(newValue[ix]);
                    var validator = obj && (obj['validateServerIncomingProperty'] || this.controller['validateServerIncomingProperty']);
                    var validatorThis = (obj && obj['validateServerIncomingProperty']) ? obj : this.controller;
                    if (validator)
                        validator.call(validatorThis, obj, prop, ix, defineProperty, unarray_newValue)

                    if (!this._applyPropertyChange(changes, rollback, obj, prop, ix,
                            oldValue ? unarray(oldValue[ix]) : null, unarray_newValue, force))
                        return false;
                }
                this._trimArray(obj[prop]);
            } else if (oldValue instanceof Array) {
                obj[prop] = null;
                if (!this._useGettersSetters)
                    obj['__' + prop] = null;
                obj.__tainted__ = true;

            }
        } else
        if (!this._applyPropertyChange(changes, rollback, obj, prop, -1, oldValue, newValue, force))
            return false;
    }
    this.changeCount++;
    return true;
};

/**
 * Apply changes for a specific property, cascading changes in the event
 * that a reference to an object that needs to be created is part of the change
 *
 * @param changes all changes
 * @param rollback an array of changes that would have to be rolled back
 * @param obj the object instance that was changed
 * @param prop the property of that object
 * @param ix the position of the property if the property is an array
 * @param oldValue the old value before the change occured
 * @param newValue the value after the change occured
 * @param force whether changes can be rolled back
 * @return {Boolean} whether a rollback needs to be done
 * @private
 */
RemoteObjectTemplate._applyPropertyChange = function(changes, rollback, obj, prop, ix, oldValue, newValue, force)
{
    var session = this._getSession();

    // Get old, new and current value to determine if change is still applicable
    try {
        var currentValue = (ix >= 0) ? obj[prop][ix] : obj[prop];
    } catch (e) {
        this.log(0, "Could not apply change to " + obj.__template__.__name__ + "." + prop +
            " based on property definition");
        return false;
    }

    // No change case
    var currentValueConverted = this._convertValue(currentValue);
    var oldValueConverted = this._convertValue(oldValue);
    if (newValue == currentValueConverted && this._useGettersSetters)  // no change
        return true;

    // unidirectional properties will get out of sync on refreshes so best not to check
    var defineProperty = this._getDefineProperty(prop, obj.__template__) || {};
    var singleDirection = defineProperty.toServer === false || defineProperty.toClient === false;

    // Make sure old value that is reported matches current value
    if (!singleDirection && !force && oldValueConverted != currentValueConverted) { // conflict will have to roll back
        this.log(0, "Could not apply change to " + obj.__template__.__name__ + "." + prop +
            " expecting " +  this.cleanPrivateValues(prop, oldValueConverted) +
            " but presently " + this.cleanPrivateValues(prop, currentValueConverted));
        return false;
    }

    // Based on type of property we convert the value from it's string representation into
    // either a fundemental type or a templated object, creating it if needed
    if (!this._acceptChanges(defineProperty, obj.__template__)) {
        this.log(0, "Could not accept changes to " + obj.__template__.__name__ + "." + prop +
            " based on property definition");
        return false;
    }

    obj.__tainted__ = true; // Can no longer just be persisted (unless untainted)

    var type = (defineProperty.of || defineProperty.type);
    var objId = null;
    if (type == Number)
        newValue = newValue == null ? null : newValue * 1;
    else if (type == String) ;
    else if (type == Boolean)
        newValue = newValue == null ? null : (newValue == "false" ? false : (newValue ? true : false));
    else if (type == Date)
        newValue =  newValue == null ? null : new Date(newValue);
    else if (type == Object && newValue) {
        newValue = (typeof(newValue) == 'string') ?
            (JSON.parse((newValue && newValue.substr(0,1) == '=') ? newValue.substr(1) : newValue))
            : newValue;
    }
    else if (newValue && typeof(type) == "function") {
        objId = newValue;
        if (session.objects[objId]) {
            if (session.objects[objId] instanceof type)
                newValue = session.objects[objId];
            else {
                this.log(0, "Could not apply change to " + obj.__template__.__name__ + "." + prop +
                    " id (" + objId + ") is type " + session.objects[objId].__template__.__name__);
                return false;
            }
        } else {
            newValue = this._createEmptyObject(type, objId, defineProperty);
            this._applyObjectChanges(changes, rollback, newValue, true)
        }
    }
    // Assign to property as scalar or array value
    // For non-setter change tracking we don't want this to be viewed as a change
    if (newValue != currentValue || !this._useGettersSetters) {
        if (ix >= 0) {
            obj[prop][ix] = newValue;
            if (!this._useGettersSetters && this._manageChanges(defineProperty)) {
                if (!obj['__' + prop])
                    obj['__' + prop] = [];
                obj['__' + prop][ix] = newValue;
            }
        } else {
            obj[prop] = newValue;
            if (!this._useGettersSetters && this._manageChanges(defineProperty)) {
                obj['__' + prop] = newValue;
            }
        }
    }
    if (this.logLevel > 0) {
        var logValue = objId ? "{"+  objId + "}" : newValue instanceof Array ? "[" + newValue.length + "]" : newValue;
        this.changeString += (obj.__template__.__name__ + (ix >= 0 ? "[" + ix + "]" : "") + "." + prop +
        " = " + this.cleanPrivateValues(prop, logValue) + "; ");
    }

    rollback.push([obj, prop, ix, currentValue]);
    return true;
};

/**
 * Roll back changes accumulated as part of the application of changes
 *
 * @param rollback - array of changes
 * @private
 */
RemoteObjectTemplate._rollback = function(rollback) {
    for (var ix = 0; ix < rollback.length; ++ix)
        if (rollback[ix][2] >= 0)
            ((rollback[ix][0])[rollback[ix][1]])[rollback[ix][2]] = rollback[ix][3];
        else
            (rollback[ix][0])[rollback[ix][1]] = rollback[ix][3];

};

/**
 * Roll back all changes
 * @private
 */
RemoteObjectTemplate._rollbackChanges = function() {
    var session = this._getSession();
    var changes = this.getChanges();
    for (objId in changes) {
        var obj = session.objects[objId];
        if (obj) {
            // Go through each recorded change which is a pair of old and new values
            for (var prop in changes[objId]) {
                var oldValue = changes[objId][prop][0];
                if (oldValue instanceof Array)
                    for (var ix = 0; ix < oldValue.length; ++ix)
                        obj[prop][ix] = oldValue[0];
                else
                    obj[prop] = oldValue;
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
 * @param template - the ObjectTemplate template for the object
 * @param objId - the id to be assigned
 * @param defineProperty - the property definition from the template
 * @param isTransient - true if not to be recorded in session
 * @return {*} - an instance of the object
 * @private
 */
RemoteObjectTemplate._createEmptyObject = function(template, objId, defineProperty, isTransient) {

    if (!objId)
        throw  new Error("_createEmptyObject called for " + template.__name__ + " without objId parameter");
    if (!template.__children__)
        throw  new Error("_createEmptyObject called for incorrectly defined template");

    template = this._resolveSubClass(template, objId, defineProperty);

    var session = this._getSession();
    var sessionReference = session.objects[objId];
    if (sessionReference && !isTransient) {
        if (sessionReference.__template__ == template)
            var newValue = sessionReference;
        else
            throw  new Error("_createEmptyObject called for " + template.__name__ +
                " and session object with that id exists but for template " + session.objects[objId].__template__.__name__)
    } else {
        this.dispenseId = objId;
        session.dispenseNextId = objId;  // stashObject will use this
        var wasTransient = this.__transient__;
        if (isTransient)
            this.__transient__ = true; // prevent stashObject from adding to sessions.objects
        var newValue = new template();
        this.__transient__ = wasTransient;
        if (isTransient) {
            newValue.__transient__ = true;
        }
    }

    if (this.role == "client" && typeof(newValue.clientPreInit) == "function")
        newValue.clientPreInit.call();
    if (this.role == "server" && typeof(newValue.serverPreInit) == "function")
        newValue.serverPreInit.call();

    return newValue;
};

/**
 * Add a function that will fire on object creation
 *
 * @param injector
 */
RemoteObjectTemplate.inject = function (template, injector) {
    template.__injections__.push(injector);
    // Go through existing objects to inject them as well
    var session = this._getSession();
    for (var obj in session.objects)
        if (this._getBaseClass(session.objects[obj].__template__) == this._getBaseClass(template))
            injector.call(session.objects[obj]);
}

/**************************** Message Management Functions **********************************/

/**
 * Add a remote call to the queue for sequential transmission
 *
 * @param objId - The id of the object owning the method
 * @param functionName - the method
 * @param deferred - A Q deferred object containing a promise
 * @param args - arguments to the method call
 * @private
 */
RemoteObjectTemplate._queueRemoteCall = function(objId, functionName, deferred, args) {
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
RemoteObjectTemplate._processQueue = function() {
    var session = this._getSession();
    if (session.sendMessage && session.sendMessageEnabled) {
        var message = this.getMessage();
        if (message)
            session.sendMessage(message);
    }
};

/**
 * Converts an object into a transportable structure that is enriched with
 * type information and replaces object references with Ids.  This can only
 * be converted back once any objects are synchronized via applyChanges()
 *
 * @param obj - the root object
 * @return {Object} - an enriched root object
 * @private
 */
RemoteObjectTemplate._toTransport = function clone(obj)
{
    var res = {type: null};
    // Replace references with an object that describes the type
    // and has a property for the original value
    if (obj instanceof Date)
        res = {type: "date", value: obj.getTime()};
    else if (obj instanceof Array) {
        res = {type: "array", value: []};
        for (var ix = 0; ix < obj.length; ++ix)
            res.value[ix] = this._toTransport(obj[ix]);
    } else if (typeof(obj) == "number" || obj instanceof Number)
        res = {type: "number", value: obj * 1};
    else if (typeof(obj) == "string" || obj instanceof String)
        res = {type: "string", value: obj.toString()};
    else if (typeof(obj) == "boolean" || obj instanceof Boolean)
        res = {type: "boolean", value: obj};
    else if (obj instanceof Object) {
        // For objects created by RemoteObject just transport their ID
        if (obj.__id__)
            res = {type: "id", value: obj.__id__};
        else {
            // Otherwise grab each individual property
            res = {type: "object", value: {}};
            for (var prop in obj)
                if (obj.hasOwnProperty(prop))
                    res.value[prop] = this._toTransport(obj[prop]);
        }
    }
    return res;
};

/**
 * Restore an enriched object from its transport structure, replacing
 * object references to the real objects based on their id's
 * Important: Under no circumstances will this instantiate other than a primitive object
 *
 * @param obj - an object produced with toTransport()
 * @return {*} - the original object
 * @private
 */
RemoteObjectTemplate._fromTransport = function clone(obj)
{
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
            for (var ix = 0; ix < obj.value.length; ++ix)
                obja[ix] = this._fromTransport(obj.value[ix]);
            obj = obja;
            break;
        case 'id':
            obj = session.objects[obj.value];
            break;
        case 'object':
            var objo = {};
            for (var prop in obj.value)
                objo[prop] = this._fromTransport(obj.value[prop]);
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
 * @param array
 * @private
 */
RemoteObjectTemplate._trimArray = function(array) {
    while (array.length > 0 && (typeof(array[array.length - 1]) == 'undefined' || array[array.length - 1] == null))
        array.splice(array.length - 1, 1);
};

/**
 * Get the current session structure
 * @return {*} the session
 * @private
 */
RemoteObjectTemplate._getSession = function() {
    if (!this.currentSession) {
        this.log(0, "RemoteObjectTemplate: Please create a session first");
        throw  new Error("RemoteObjectTemplate: Please create a session first");
    }
    return this.sessions[this.currentSession];
}

RemoteObjectTemplate._deleteChangeGroups = function(type) {
    for (var subscription in this._getSubscriptions())
        this.deleteChangeGroup(type, subscription);
};

RemoteObjectTemplate._getSubscriptions = function(sessionId) {
    return this._getSession(sessionId).subscriptions;
}

RemoteObjectTemplate._deleteChanges = function() {
    this._deleteChangeGroups('array')
    this._deleteChangeGroups('change');
};

RemoteObjectTemplate._getSubscription = function(subscriptionId) {
    return this._getSession().subscriptions[subscriptionId || 0];
}

RemoteObjectTemplate.cleanPrivateValues = function(prop, logValue) {
    return prop.match(/password|ssn|socialsecurity|pin/i) ? "***" : logValue;
}

if (typeof(module) != 'undefined')
    module.exports = RemoteObjectTemplate;