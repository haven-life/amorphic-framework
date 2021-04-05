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

import {ArrayTypes, ProcessCallPayload, RemoteCall, SavedSession, Semotus, SendMessage} from './helpers/Types';
import {property, remote, Supertype, supertypeClass} from './decorators';
import {Bindable, Persistable, Remoteable} from './setupExtends';
import * as Sessions from './helpers/Sessions';
import * as Subscriptions from './helpers/Subscriptions';
import {delay} from './helpers/Utilities';
import * as Changes from './helpers/Changes';
import * as ChangeGroups from './helpers/ChangeGroups';
import {processCall} from "./helpers/ProcessCall";

declare var define;

// @TODO: Check if we attach Promise as a keyword in the webpack build
(function (root, factory) {
	'use strict';
	if (typeof define === 'function' && define.amd) {
		define(['q', 'underscore', '@haventech/supertype'], factory);
	}
	else if (typeof exports === 'object') {
		module.exports = factory(require('q'), require('underscore'), require('@haventech/supertype'));
	}
	else {
		root.RemoteObjectTemplate = factory(root.Q, root._, root.ObjectTemplate);
	}
})(this, function (Q, _, SupertypeModule) {

	var ObjectTemplate = SupertypeModule.default;
	const RemoteObjectTemplate: Semotus = ObjectTemplate._createObject();

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

	RemoteObjectTemplate.syncState = '';

	RemoteObjectTemplate.setSyncState = function (str) {
		this.syncState = str;
	}

	RemoteObjectTemplate.getSyncState = function () {
		return this.syncState;
	}

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

		let extraID = '';

		if (this.reqSession && this.reqSession.loggingID) {
			extraID = '-' + this.reqSession.loggingID;
		}

		const t = new Date();

		const time =
			t.getFullYear() +
			'-' +
			(t.getMonth() + 1) +
			'-' +
			t.getDate() +
			' ' +
			t.toTimeString().replace(/ .*/, '') +
			':' +
			t.getMilliseconds();

		const message = time + '(' + this.currentSession + extraID + ') ' + 'RemoteObjectTemplate:' + data;

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
	RemoteObjectTemplate.createSession = function createSession(role, sendMessage: SendMessage, sessionId) {
		return Sessions.create(this, role, sendMessage, sessionId);
	};

	/**
	 * Remove the session from the sessions map, rejecting any outstanding promises
	 *
	 * @param {unknown} sessionId unknown
	 */
	RemoteObjectTemplate.deleteSession = function deleteSession(sessionId: string | number) {
		return Sessions.remove(this, sessionId)
	};

	/**
	 * After resynchronizing sessions we need to set a new sequence number to be used in
	 * new objects to avoid conflicts with any existing ones the remote session may have
	 *
	 * @param {unknown} nextObjId unknown
	 */
	RemoteObjectTemplate.setMinimumSequence = function setMinimumSequence(nextObjId) {
        const session = Sessions.get(this);
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
        const session = Sessions.get(this, sessionId);

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
	RemoteObjectTemplate.restoreSession = function restoreSession(sessionId, savedSession: SavedSession, sendMessage: SendMessage) {
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
        const session = Sessions.get(this, sessionId);
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
	 * @param req
	 * @param res
	 * @returns {unknown} unknown
	 */
	RemoteObjectTemplate.processMessage = function processMessage(remoteCall: RemoteCall, subscriptionId, restoreSessionCallback, req?: Express.request, res?: Express.response ) {
		if (!remoteCall) {
			return;
		}

		let callContext;
		let hadChanges = 0;
        const session = Sessions.get(this);
		const remoteCallId = remoteCall.remoteCallId;

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
					this.logger.error(
						{
							component: 'semotus',
							module: 'processMessage',
							activity: 'syncError'
						},
						'Could not apply changes on sync message'
					);
					this._convertArrayReferencesToChanges();
					this._deleteChanges();
					this._processQueue();
				}

				break;

			case 'call':
				if (this.memSession && this.memSession.semotus) {
					if (!this.memSession.semotus.callStartTime) {
						this.memSession.semotus.callStartTime = new Date().getTime();
					} else {
						//TODO: Why is this not an else if clause?
						if (this.memSession.semotus.callStartTime + this.maxCallTime > new Date().getTime()) {
							delay(5000).then(
								function a() {
									this.logger.warn(
										{
											component: 'semotus',
											module: 'processMessage',
											activity: 'blockingCall',
											data: {
												call: remoteCall.name,
												sequence: remoteCall.sequence
											}
										},
										remoteCall.name
									);
									session.sendMessage({
										type: 'response',
										sync: false,
										changes: '',
										remoteCallId: remoteCallId
									});
									this._deleteChanges();
									this._processQueue();
								}.bind(this)
							);

							break;
						}
					}
				}

				callContext = {retries: 0, startTime: new Date()};

				let HTTPObjs = undefined;

				if (req && res) {
					HTTPObjs = {
						request: req,
						response: res
					}
				}

				const payload: ProcessCallPayload = {
					callContext: callContext,
					remoteCall: remoteCall,
					restoreSessionCallback: restoreSessionCallback,
					semotus: this,
					session: session,
					subscriptionId: subscriptionId,
					remoteCallId: remoteCallId,
					HTTPObjs: HTTPObjs
				};
				return processCall(payload);

			case 'response':
			case 'error':
				let doProcessQueue = true;

				this.logger.info({
					component: 'semotus',
					module: 'processMessage',
					activity: remoteCall.type,
					data: { call: remoteCall.name, sequence: remoteCall.sequence }
				});

				// If we are out of sync queue up a set Root if on server.  This could occur
				// if a session is restored but their are pending calls
				if (!session.pendingRemoteCalls[remoteCallId]) {
					this.logger.error(
						{
							component: 'semotus',
							module: 'processMessage',
							activity: remoteCall.type,
							data: { call: remoteCall.name, sequence: remoteCall.sequence }
						},
						'No remote call pending'
					);
				} else {
					if (typeof remoteCall.sync !== 'undefined') {
						if (remoteCall.sync) {
							if (session.pendingRemoteCalls[remoteCallId].deferred.resolve) {
								hadChanges = this._applyChanges(JSON.parse(remoteCall.changes), true, subscriptionId);

								if (remoteCall.type == 'error') {
									session.pendingRemoteCalls[remoteCallId].deferred.reject(remoteCall.value);
								} else {
									session.pendingRemoteCalls[remoteCallId].deferred.resolve(
										this._fromTransport(JSON.parse(remoteCall.value))
									);
								}
							}
						} else {
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
        const session = Sessions.get(this);
		const idMap = {};
		let objectKey = '';
		let propKey = '';
		const itemsBefore = count(session.objects);
		const serial = serialize.call(this, this.controller);
		session.objects = idMap;
		const itemsAfter = count(idMap);

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
						} else {
							idMap[value.__id__.toString()] = value;
						}
					} else {
						propKey = key;
					}

					return value;
				});
			} catch (e) {
				this.logger.error(
					{
						component: 'semotus',
						module: 'serializeAndGarbageCollect',
						activity: 'post',
						data: { last_object_ref: objectKey, last_prop_ref: propKey }
					},
					'Error serializing session ' + e.message + e.stack
				);
				return null;
			}
		}

		function count(idMap) {
			let ix = 0;

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
        const session = Sessions.get(this, sessionId);
		let message = session.remoteCalls.shift();

		if (message) {
			const remoteCallId = session.nextPendingRemoteCallId++;
			message.remoteCallId = remoteCallId;
			session.pendingRemoteCalls[remoteCallId] = message;
		} else if (forceMessage) {
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
        const session = Sessions.get(this, sessionId);
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
		const changes = ChangeGroups.getPropChangeGroup(subscriptionId, this);

		return changes;
	};

	/**
	 * Diagnostic function to return summary of changes (lengths of change groups)
	 *
	 * @returns {unknown} unknown
	 */
	RemoteObjectTemplate.getChangeStatus = function getChangeStatus() {
        Sessions.get(this); // necessary?

		let a = 0;
		let c = 0;

		for (var subscriptionId in this.subscriptions) {
			const changes = ChangeGroups.getPropChangeGroup(subscriptionId, this);

			c += Object.keys(changes).length;

			const arrays = ChangeGroups.getArrayChangeGroup('array', subscriptionId, this);

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
		const executeInit = !!this.nextDispenseId; // If coming from createEmptyObject

		if (!obj.__id__) {
			// If this comes from a delayed sessionize call don't change the id
			const objectId = this.nextDispenseId || this.role + '-' + template.__name__ + '-' + this.nextObjId++;
			obj.__id__ = objectId;
		}
		this.nextDispenseId = null;

        const session = Sessions.get(this, undefined); // May not have one if called from new
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
	RemoteObjectTemplate.sessionize = function(obj, referencingObj) {
		// Normally passed a referencingObject from which we can get an objectTemplate
		// But in the the case where the app calls sessionize the object template is bound to this
		const objectTemplate = referencingObj ? referencingObj.__objectTemplate__ : this;

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
				obj.__pendingChanges__.forEach(function(params) {
					objectTemplate._changedValue.apply(objectTemplate, params);
				});
				obj.__pendingChanges__ = undefined;
			}

			// Spread the love to objects that the object may have referenced
			if (obj.__referencedObjects__) {
				for (var id in obj.__referencedObjects__) {
					const referencedObj = obj.__referencedObjects__[id];
					objectTemplate.sessionize(referencedObj, obj);
				}
				obj.__referencedObjects__ = undefined;
			}
			return obj;
		} else {
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
	 * @param serverValidation
	 * @param isPublic
	 * @param template
	 * @returns {*} - the original function or a wrapper to make a remote call
	 */
	RemoteObjectTemplate._setupFunction = function setupFunction(
		propertyName,
		propertyValue,
		role,
		validate,
		serverValidation,
		isPublic: boolean,
		template
	) {
		/** @type {RemoteObjectTemplate} */
		let objectTemplate = this;
		const self = this;

		if (!role || role == this.role) {
			if (role === 'server') {
				propertyValue.serverValidation = serverValidation;
				propertyValue.remotePublic = isPublic;
			}
			return propertyValue;
		} else {
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
					data: {call: propertyName}
				});

				// @TODO: remove dependency on Q for future optimizations on FE (perhaps part of ESNext effort)
				const deferred = Q.defer();
				objectTemplate._queueRemoteCall(this.__id__, propertyName, deferred, arguments);

				if (self.controller && self.controller.handleRemoteError) {
					delay(0).then(function d() {
						return deferred.promise.then(null, function e(error) {
							self.controller && self.controller.handleRemoteError(error);
							return Promise.resolve(true);
						});
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
	RemoteObjectTemplate._setupProperty = function setupProperty(
		propertyName,
		defineProperty,
		objectProperties,
		defineProperties
	) {
		//determine whether value needs to be re-initialized in constructor
		let value = null;

		if (typeof defineProperty.value !== 'undefined') {
			value = defineProperty.value;
		}

		if (objectProperties) {
			if (defineProperty.isVirtual) {
				objectProperties[propertyName] = {
					init: undefined,
					type: defineProperty.type,
					of: defineProperty.of,
					byValue: !(
						typeof value === 'boolean' ||
						typeof value === 'number' ||
						typeof value === 'string' ||
						value == null
					)
				};
			} else {
				objectProperties[propertyName] = {
					init: value,
					type: defineProperty.type,
					of: defineProperty.of,
					byValue: !(
						typeof value === 'boolean' ||
						typeof value === 'number' ||
						typeof value === 'string' ||
						value == null
					)
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
		const userGetter = defineProperty.userGet;
		const userSetter = defineProperty.userSet;

		// In the case where there are now getters and setters, the __prop represents
		// the original value

		// Setter
		const objectTemplate = this;

		// Only called on the server
		if (this._useGettersSetters && Changes.manage(defineProperty)) {
			// Determine initially if we should create changes for these properties
			const createChanges = Changes.create(defineProperty, undefined, this);

			defineProperty.set = (function set() {
				// use a closure to record the property name which is not passed to the setter
				const prop = propertyName;

				return function f(value) {
					const currentObjectTemplate = this.__objectTemplate__ ? this.__objectTemplate__ : objectTemplate;

					// Sessionize reference if it is missing an __objectTemplate__
					if (
						defineProperty.type &&
						defineProperty.type.isObjectTemplate &&
						value &&
						!value.__objectTemplate__
					) {
						currentObjectTemplate.sessionize(value, this);
					}

					// When we assign an array go through the values and attempt to sessionize
					if (defineProperty.of && defineProperty.of.isObjectTemplate && value instanceof Array) {
						value.forEach(
							function(value) {
								if (!value.__objectTemplate__) {
									currentObjectTemplate.sessionize(value, this);
								}
							}.bind(this)
						);
					}

					if (userSetter) {
						value = userSetter.call(this, value);
					}

					if (
						!defineProperty.isVirtual &&
						this.__id__ &&
						createChanges &&
						transform(this['__' + prop]) !== transform(value)
					) {
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
									let digest = '';

									for (var ix = 0; ix < data.length; ++ix) {
										digest += data[ix].__id__;
									}

									return digest;
								} else {
									return '[]';
								}
							} else {
								return JSON.stringify(data);
							}
						} else if (defineProperty.type.isObjectTemplate) {
							return data.__id__;
						} else {
							return JSON.stringify(data);
						}
					} catch (e) {
						objectTemplate.logger.error(
							{ component: 'semotus', module: 'setter', activity: 'stingify', data: { property: prop } },
							'caught exception trying to stringify ' + prop
						);
						return data;
					}
				}
			})();

			// Getter
			defineProperty.get = (function g() {
				// use closure to record property name which is not passed to the getter
				const prop = propertyName;

				return function z() {
					const currentObjectTemplate = this.__objectTemplate__ ? this.__objectTemplate__ : objectTemplate;

					if (!defineProperty.isVirtual && this['__' + prop] instanceof Array) {
						currentObjectTemplate._referencedArray(this, prop, this['__' + prop]);
					}

					if (userGetter) {
						return userGetter.call(this, this['__' + prop]);
					} else {
						return this['__' + prop];
					}
				};
			})();
		} else if (defineProperty.userGet || defineProperty.userSet) {
			defineProperty.set = (function h() {
				// use a closure to record the property name which is not passed to the setter
				const prop = propertyName;

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
				const prop = propertyName;

				return function k() {
					if (userGetter) {
						if (defineProperty.isVirtual) {
							return userGetter.call(this, undefined);
						}

						return userGetter.call(this, this['__' + prop]);
					} else {
						return this['__' + prop];
					}
				};
			})();

			if (!defineProperty.isVirtual) {
				defineProperties['__' + propertyName] = { enumerable: false, writable: true };
			}

			delete defineProperty.value;
			delete defineProperty.writable;
		} else {
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
		const prevChangeTracking = this.__changeTracking__;
		this.__changeTracking__ = false;
		cb();
		this.__changeTracking__ = prevChangeTracking;
	};

	/**
	 *
	 * Called from a setter when a value has changed. Record old and new values
	 * changes are accumulated for each change subscriber.
	 * The change structure in the subscription log is a key/value store
	 * where the key is the object and id and the value is an array
	 * - the first position in the array is the old value
	 * - and the second is the new value
	 * Note that objects created with RemoteObjectTemplate have and id and that
	 * only the id is stored
	 *
	 * This is triggered either by property value changes directly (through setupProperty, through the decorator)
	 * Or through LogChanges
	 *
	 * @param {unknown} obj the object instance
	 * @param {unknown} prop the object property
	 * @param {unknown} value the new value
	 *
	 * @private
	 */
	RemoteObjectTemplate._changedValue = function changedValue(obj, prop, value) {
		if (obj.__transient__ || Changes.isIsolatedObject(this, obj)) {
			return;
		}

		const subscriptions = this._getSubscriptions();
		if (!subscriptions) {
			obj.__pendingChanges__ = obj.__pendingChanges__ || [];
			obj.__pendingChanges__.push([obj, prop, value]);
			return;
		}

		for (var subscription in subscriptions) {
			if (subscriptions[subscription] != this.processingSubscription) {
				const changeGroup = ChangeGroups.getPropChangeGroup(subscription, this);

				// Get normalized values substituting ids for ObjectTemplate objects
				const newValue = this._convertValue(value);
				const oldValue = this._convertValue(obj['__' + prop]);

				// Create a new key in the change group if needed
				if (!changeGroup[obj.__id__]) {
					changeGroup[obj.__id__] = {};
				}

				// For subsequent changes to the same element only store the new value and leave
				// the original old value intact
				if (changeGroup[obj.__id__][prop]) {
					changeGroup[obj.__id__][prop][1] = newValue;
				} else {
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
		if (obj.__transient__ || Changes.isIsolatedObject(this, obj)) { // Should not be transported
			return;
		}

		// Track this for each subscription
		const subscriptions = this._getSubscriptions(sessionId);
		if (subscriptions) {
			// sessionized?
			// Create the change group for array references and for dirty tracking of array references
			processSubscriptions.call(this, 'array', obj.__pendingArrayReferences__);
			if (this.__changeTracking__) {
				processSubscriptions.call(this, 'arrayDirty', obj.__pendingArrayDirtyReferences__);
			}
			obj.__pendingArrayReferences__ = undefined;
			obj.__pendingArrayDirtyReferences__ = undefined;
		} else {
			// Record the change group right in the object
			obj.__pendingArrayReferences__ = obj.__pendingArrayReferences__ || [];
			processChangeGroup(obj.__pendingArrayReferences__);
			obj.__pendingArrayDirtyReferences__ = obj.__pendingArrayReferences__ || [];
			processChangeGroup(obj.__pendingArrayDirtyReferences__);
		}

		// Create a change group entries either from the referenced array or from a previously saved copy of the array

		// Only array or dirty
		function processSubscriptions(changeType: ArrayTypes, existingChangeGroup) {
			for (var subscription in subscriptions) {
				const changeGroup = ChangeGroups.getArrayChangeGroup(changeType, subscription, this);
				if (subscriptions[subscription] != this.processingSubscription) {
					if (existingChangeGroup) {
						copyChangeGroup(changeGroup, existingChangeGroup);
					} else {
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
			const key = obj.__id__ + '/' + prop;

			// Only record the value on the first reference
			if (!changeGroup[key]) {
				const old = [];

				// Walk through the array and grab the reference
				if (arrayRef) {
					for (var ix = 0; ix < arrayRef.length; ++ix) {
						const elem = arrayRef[ix];

						if (typeof elem !== 'undefined' && elem != null) {
							if (elem != null && elem.__id__) {
								old[ix] = elem.__id__;
							} else {
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
        const session = Sessions.get(this);
		const subscriptions = this._getSubscriptions();

		// Iterate
		for (var subscription in subscriptions) {
			if (subscriptions[subscription] != this.processingSubscription) {
				const changeGroup = ChangeGroups.getPropChangeGroup(subscription, this);
				const refChangeGroup = ChangeGroups.getArrayChangeGroup('array', subscription, this);

				// Look at every array reference
				for (var key in refChangeGroup) {
					// split the key into an id and property name
					const param = key.split('/');
					const id = param[0];
					const prop = param[1];

					// Get the current and original (at time of reference) values
					const obj = session.objects[id];

					if (!obj) {
						continue;
					}

					let curr;

					if (this._useGettersSetters) {
						curr = obj['__' + prop];
					} else {
						curr = obj[prop];
					}

					let orig = refChangeGroup[key];

					if (!curr) {
						curr = [];
					}

					if (!orig) {
						orig = [];
					}

					// Walk through all elements (which ever is longer, original or new)

					//@TODO: Double check this. Fixing this semotus bug might break other parts
					const len = Math.max(curr.length, orig.length);

					for (var ix = 0; ix < len; ++ix) {
						// See if the value has changed
						let currValue = undefined;

						if (typeof curr[ix] !== 'undefined' && curr[ix] != null) {
							currValue = curr[ix].__id__ || '=' + JSON.stringify(curr[ix]);
						}

						const origValue = orig[ix];

						if (
							origValue !== currValue ||
							(changeGroup[obj.__id__] &&
								changeGroup[obj.__id__][prop] &&
								changeGroup[obj.__id__][prop][1][ix] != currValue)
						) {
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
							} else {
								// Create an old and new value array with identical values and then
								// substitute the one changed value in the appropriate position
								const values = this._convertValue(orig);
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
        const session = Sessions.get(this);
		const subscriptions = this._getSubscriptions();

		for (var subscription in subscriptions) {
			if (subscriptions[subscription] != this.processingSubscription) {
				const refChangeGroup = ChangeGroups.getArrayChangeGroup('arrayDirty', subscription, this);

				// Look at every array reference
				for (var key in refChangeGroup) {
					// split the key into an id and property name
					const param = key.split('/');
					const id = param[0];
					const prop = param[1];

					// Get the current and original (at time of reference) values
					const obj = session.objects[id];

					if (!obj) {
						continue;
					}

					let curr;

					if (this._useGettersSetters) {
						curr = obj['__' + prop];
					} else {
						curr = obj[prop];
					}

					let orig = refChangeGroup[key];

					if (!curr) {
						curr = [];
					}

					if (!orig) {
						orig = [];
					}

					// Walk through all elements (which ever is longer, original or new)
					const len = Math.max(curr.length, orig.length);

					for (var ix = 0; ix < len; ++ix) {
						// See if the value has changed
						let currValue = undefined;

						if (typeof curr[ix] !== 'undefined' && curr[ix] != null) {
							currValue = curr[ix].__id__ || '=' + JSON.stringify(curr[ix]);
						}

						const origValue = orig[ix];

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
			const newValue = [];

			for (var ix = 0; ix < value.length; ++ix) {
				if (value[ix]) {
					if (typeof value[ix] === 'object') {
						newValue[ix] = value[ix].__id__ || JSON.stringify(value[ix]);
					} else {
						newValue[ix] = value[ix].__id__ || value[ix].toString();
					}
				} else {
					newValue[ix] = null;
				}
			}

			return newValue;
		} else if (value && value.__id__) {
			return value.__id__;
		} else if (value instanceof Date) {
			return value.getTime();
		} else if (typeof value === 'number' && isNaN(value)) {
			return null;
		} else {
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
        const session = Sessions.get(this);
		const obj = session.objects[objId];

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
        const session = Sessions.get(this);
		const rollback = [];

		this.processingSubscription = this._getSubscription(subscriptionId);

		// Walk through change queue looking for objects and applying new values or rolling back
		// if previous values don't match what changer things they are
		this.changeCount = 0;
		this.changeString = {};

		let hasObjects = false;

		for (var objId in changes) {
			let obj = session.objects[objId];

			if (obj) {
				hasObjects = true;
			}

			// If no reference derive template for object ID
			if (!obj) {
				const template = this.__dictionary__[objId.replace(/[^-]*-/, '').replace(/-.*/, '')];

				if (template) {
					force = true;
					obj = this._createEmptyObject(template, objId);
				} else {
					this.logger.error(
						{ component: 'semotus', module: 'applyChanges', activity: 'processing' },
						'Could not find template for ' + objId
					);
				}
			}

			let passedObjectValidation = true;
			let passedPropertyValidation = true;

			if (this.role === 'server') {
				const validator =
					obj && (obj['validateServerIncomingObject'] || this.controller['validateServerIncomingObject']);

				let validatorThis;

				if (obj && obj['validateServerIncomingObject']) {
					validatorThis = obj;
				} else {
					validatorThis = this.controller;
				}

				if (validator) {
					try {
						validator.call(validatorThis, obj);
					} catch (e) {
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
				this.logger.error(
					{ component: 'semotus', module: 'applyChanges', activity: 'processing' },
					'Could not apply changes to ' + objId
				);
				this.changeString = {};
				return 0;
			}
		}

		let passedObjectsValidation = true;

		if (this.role === 'server' && this.controller['validateServerIncomingObjects']) {
			try {
				this.controller.validateServerIncomingObjects(changes, callContext);
			} catch (e) {
				passedObjectsValidation = false;
			}
		}

		if (!passedObjectsValidation) {
			this.processingSubscription = false;
			this._rollback(rollback);
			this._deleteChanges();
			this.logger.error(
				{ component: 'semotus', module: 'applyChanges', activity: 'validateServerIncomingObjects' },
				'Flagged by controller to not process this change set.'
			);
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
			const change = changes[obj.__id__][prop];
			const oldValue = change[0];
			const newValue = change[1];
			const defineProperty = this._getDefineProperty(prop, obj.__template__);

			if (!defineProperty) {
				this.logger.error(
					{
						component: 'semotus',
						module: 'applyObjectChanges',
						activity: 'processing',
						data: { template: obj.__template__.__name__, property: prop }
					},
					`Could not apply change to ${obj.__template__.__name__}.${prop} property not defined in template`
				);
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

					let length;

					if (oldValue) {
						length = Math.max(newValue.length, oldValue.length);
					} else {
						length = Math.max(newValue.length, 0);
					}

					for (var ix = 0; ix < length; ++ix) {
						const unarray_newValue = unarray(newValue[ix]);
						if (oldValue) {
							if (
								!this._applyPropertyChange(
									changes,
									rollback,
									obj,
									prop,
									ix,
									unarray(oldValue[ix]),
									unarray_newValue,
									force
								)
							) {
								return false;
							}
						} else {
							if (
								!this._applyPropertyChange(
									changes,
									rollback,
									obj,
									prop,
									ix,
									null,
									unarray_newValue,
									force
								)
							) {
								return false;
							}
						}
					}

					this._trimArray(obj[prop]);
				} else if (oldValue instanceof Array) {
					obj[prop] = null;

					if (!this._useGettersSetters) {
						obj['__' + prop] = null;
					}
				}
			} else {
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
			} catch (e) {
				return '';
			}
		}
	};

	RemoteObjectTemplate._validateServerIncomingProperty = function(obj, prop, defineProperty, newValue) {
		const validator =
			obj && (obj['validateServerIncomingProperty'] || this.controller['validateServerIncomingProperty']);

		let validatorThis;

		if (obj && obj['validateServerIncomingProperty']) {
			validatorThis = obj;
		} else {
			validatorThis = this.controller;
		}

		if (validator) {
			try {
				validator.call(validatorThis, obj, prop, defineProperty, newValue);
			} catch (error) {
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
	RemoteObjectTemplate._applyPropertyChange = function applyPropertyChange(
		changes,
		rollback,
		obj,
		prop,
		ix,
		oldValue,
		newValue,
		force
	) {
        const session = Sessions.get(this);
		let currentValue;

		// Get old, new and current value to determine if change is still applicable
		try {
			if (ix >= 0) {
				currentValue = obj[prop][ix];
			} else {
				currentValue = obj[prop];
			}
		} catch (e) {
			this.logger.error(
				{ component: 'semotus', module: 'applyPropertyChange', activity: 'processing' },
				'Could not apply change to ' + obj.__template__.__name__ + '.' + prop + ' based on property definition'
			);

			return false;
		}

		// No change case
		const currentValueConverted = this._convertValue(currentValue);
		const oldValueConverted = this._convertValue(oldValue);

		if (newValue == currentValueConverted && this._useGettersSetters) {
			// no change
			return true;
		}

		// unidirectional properties will get out of sync on refreshes so best not to check
		const defineProperty = this._getDefineProperty(prop, obj.__template__) || {};
		const singleDirection = defineProperty.toServer === false || defineProperty.toClient === false;

		// Make sure old value that is reported matches current value
		if (!singleDirection && !force && oldValueConverted != currentValueConverted) {
			// conflict will have to roll back
			const conflictErrorData = { component: 'semotus', module: 'applyPropertyChange', activity: 'processing' };

			const conflictErrorString =
				`Could not apply change to ${obj.__template__.__name__}.${prop} expecting ${this.cleanPrivateValues(prop, oldValueConverted, defineProperty)} but presently ${this.cleanPrivateValues(prop, currentValueConverted, defineProperty)}`;

			if (this.__conflictMode__ == 'hard') {
				this.logger.error(conflictErrorData, conflictErrorString);
				return false;
			} else {
				this.logger.warn(conflictErrorData, conflictErrorString);
			}
		}

		// Based on type of property we convert the value from it's string representation into
		// either a fundamental type or a templated object, creating it if needed
        if (!Changes.accept(defineProperty, obj.__template__, this)) {
			this.logger.error(
				{ component: 'semotus', module: 'applyPropertyChange', activity: 'processing' },
				`Could not accept changes to ${obj.__template__.__name__}.${prop} based on property definition`
			);

			return false;
		}

		const type = defineProperty.of || defineProperty.type;
		let objId = null;

		if (type == Number) {
			if (newValue == null) {
				newValue = null;
			} else {
				newValue = Number(newValue);
			}
		} else if (type == String) {
		} //TODO: Why? This should not be a pattern for if/else ifs
		else if (type == Boolean) {
			if (newValue == null) {
				newValue = null;
			} else {
				if (newValue == 'false') {
					newValue = false;
				} else {
					if (newValue) {
						newValue = true;
					} else {
						newValue = false;
					}
				}
			}
		} else if (type == Date) {
			if (newValue == null) {
				newValue = null;
			} else {
				newValue = new Date(newValue);
			}
		} else if (type == Object && newValue) {
			try {
				if (typeof newValue === 'string') {
					if (newValue && newValue.substr(0, 1) == '=') {
						newValue = JSON.parse(newValue.substr(1));
					} else {
						newValue = JSON.parse(newValue);
					}
				}
			} catch (e) {} // Just leave it as is
		} else if (newValue && typeof type === 'function') {
			objId = newValue;

			if (session.objects[objId]) {
				if (session.objects[objId] instanceof type) {
					newValue = session.objects[objId];
				} else {
					this.logger.error(
						{ component: 'semotus', module: 'applyPropertyChange', activity: 'processing' },
						`Could not apply change to ${obj.__template__.__name__}.${prop} - ID (${objId}) is TYPE ${session.objects[objId].__template__.__name__}`
					);

					return false;
				}
			} else {
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
			} else {
				obj[prop] = newValue;

                if (!this._useGettersSetters && Changes.manage(defineProperty)) {
					obj['__' + prop] = newValue;
				}
			}
		}

		let logValue;

		if (objId) {
			logValue = '{' + objId + '}';
		} else {
			if (newValue instanceof Array) {
				logValue = '[' + newValue.length + ']';
			} else {
				logValue = newValue;
			}
		}

		if (ix >= 0) {
			this.changeString[`${obj.__template__.__name__}[${ix}].${prop}`] = this.cleanPrivateValues(
				prop,
				logValue,
				defineProperty
			);
		} else {
			this.changeString[`${obj.__template__.__name__}.${prop}`] = this.cleanPrivateValues(
				prop,
				logValue,
				defineProperty
			);
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
			} else {
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
        const session = Sessions.get(this);
		const changes = this.getChanges();

		for (var objId in changes) {
			const obj = session.objects[objId];

			if (obj) {
				// Go through each recorded change which is a pair of old and new values
				for (var prop in changes[objId]) {
					const oldValue = changes[objId][prop][0];

					if (oldValue instanceof Array) {
						for (var ix = 0; ix < oldValue.length; ++ix) {
							obj[prop][ix] = oldValue[0];
						}
					} else {
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

        const session = Sessions.get(this);
		const sessionReference = session ? session.objects[objId] : null;
		let newValue;

		if (sessionReference && !isTransient) {
			if (sessionReference.__template__ == template) {
				newValue = sessionReference;
			} else {
				throw new Error(
					`_createEmptyObject called for ${template.__name__} and session object with that id exists but for template ${session.objects[objId].__template__.__name__}`
				);
			}
		} else {
			template.__objectTemplate__.nextDispenseId = objId;
			this.nextDispenseId = objId; /** May be redundant with previous line */
			const wasTransient = this.__transient__;

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
        const session = Sessions.get(this);

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
        const session = Sessions.get(this);
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
        const session = Sessions.get(this);

		if (session.sendMessage && session.sendMessageEnabled) {
			const message = this.getMessage();

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
		let res: any = {type: null};

		// Replace references with an object that describes the type
		// and has a property for the original value
		if (obj instanceof Date) {
			res = { type: 'date', value: obj.getTime() };
		} else if (obj instanceof Array) {
			res = { type: 'array', value: [] };

			for (var ix = 0; ix < obj.length; ++ix) {
				res.value[ix] = this._toTransport(obj[ix]);
			}
		} else if (typeof obj === 'number' || obj instanceof Number) {
			res = { type: 'number', value: Number(obj) };
		} else if (typeof obj === 'string' || obj instanceof String) {
			res = { type: 'string', value: obj.toString() };
		} else if (typeof obj === 'boolean' || obj instanceof Boolean) {
			res = { type: 'boolean', value: obj };
		} else if (obj instanceof Object) {
			// For objects created by RemoteObject just transport their ID
			if (obj.__id__) {
				res = { type: 'id', value: obj.__id__ };
			} else {
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
        const session = Sessions.get(this);

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
				const obja = [];

				for (var ix = 0; ix < obj.value.length; ++ix) {
					obja[ix] = this._fromTransport(obj.value[ix]);
				}

				obj = obja;
				break;

			case 'id':
				obj = session.objects[obj.value];
				break;

			case 'object':
				const objo = {};

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
		const args = JSON.parse(remoteCall.arguments);
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
		while (
			array.length > 0 &&
			(typeof array[array.length - 1] === 'undefined' || array[array.length - 1] == null)
		) {
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
	RemoteObjectTemplate._getSession = function _getSession(sessionId?) {
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
	RemoteObjectTemplate._getSubscriptions = function _getSubscriptions(sessionId?) {
		return Subscriptions.getSubscriptions(this, sessionId);
	};

	/**
	 * Purpose unknown
	 *
	 * @private
	 */
	RemoteObjectTemplate._deleteChanges = function deleteChanges() {
		const types = ['array', 'arrayDirty', 'change'];
		types.forEach((type) => ChangeGroups.removeAll(type, this));
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

        this.supertypeClass = supertypeClass.bind(this, objectTemplate, SupertypeModule);
        this.Supertype = function () {
            return Supertype(this, objectTemplate, SupertypeModule.Supertype); // This is the class definition itself
        };
        this.Supertype.prototype = SupertypeModule.Supertype.prototype;
        this.property = function (props) {
            return property(objectTemplate, SupertypeModule, props, this.toClientRuleSet, this.toServerRuleSet);
        };
        this.remote = remote.bind(null, objectTemplate);
    };


    RemoteObjectTemplate.Persistable = Persistable;
	RemoteObjectTemplate.Remoteable = Remoteable;
	RemoteObjectTemplate.Bindable = Bindable;

	RemoteObjectTemplate.bindDecorators(); //Default to binding to yourself

	return RemoteObjectTemplate;
});
