"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var Utilities_1 = require("./Utilities");
/**
 * We process the call the remote method in stages starting by letting the controller examine the
 * changes (preCallHook) and giving it a chance to refresh data if it needs to.  Then we apply any
 * changes in the messages and give the object owning the method a chance to validate that the
 * call is valid and take care of any authorization concerns.  Finally we let the controller perform
 * any post-call processing such as commiting data and then we deal with a failure or success.
 *
 * @param payload
 * @param {unknown} forceupdate unknown
 *
 * @returns {unknown} unknown
 */
function processCall(payload, forceupdate) {
    return __awaiter(this, void 0, void 0, function () {
        var validation, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 8, , 10]);
                    return [4 /*yield*/, Promise.resolve(forceupdate)];
                case 1:
                    forceupdate = _a.sent();
                    return [4 /*yield*/, preCallHook(payload, forceupdate)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, applyChangesAndValidateCall(payload)];
                case 3:
                    validation = _a.sent();
                    return [4 /*yield*/, customValidation(payload, validation)];
                case 4:
                    validation = _a.sent();
                    return [4 /*yield*/, callIfValid(payload, validation)];
                case 5:
                    result = _a.sent();
                    return [4 /*yield*/, postCallHook(payload, result)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, postCallSuccess(payload, result)];
                case 7:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 8:
                    err_1 = _a.sent();
                    return [4 /*yield*/, postCallFailure(payload, err_1)];
                case 9:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.processCall = processCall;
/**
 * If there is an update conflict we want to retry after restoring the session
 *
 * @returns {*} unknown
 */
function retryCall(payload) {
    return __awaiter(this, void 0, void 0, function () {
        var semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback;
        return __generator(this, function (_a) {
            semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
            if (restoreSessionCallback) {
                restoreSessionCallback();
            }
            return [2 /*return*/, processCall(payload, true)];
        });
    });
}
/**
 * Determine what objects changed and pass this to the preServerCall method on the controller
 *
 * @param payload
 * @param  forceupdate unknown
 *
 * @returns  unknown
 */
function preCallHook(payload, forceupdate) {
    var semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
    semotus.logger.info({
        component: 'semotus',
        module: 'processCall',
        activity: 'preServerCall',
        data: {
            call: remoteCall.name,
            sequence: remoteCall.sequence
        }
    }, remoteCall.name);
    if (semotus.controller && semotus.controller.preServerCall) {
        var changes = {};
        for (var objId in JSON.parse(remoteCall.changes)) {
            changes[semotus.__dictionary__[objId.replace(/[^-]*-/, '').replace(/-.*/, '')].__name__] = true;
        }
        return semotus.controller.preServerCall.call(semotus.controller, remoteCall.changes.length > 2, changes, callContext, forceupdate);
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
function applyChangesAndValidateCall(payload) {
    var semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
    semotus.logger.info({
        component: 'semotus',
        module: 'processCall',
        activity: 'applyChangesAndValidateCall',
        data: {
            call: remoteCall.name,
            sequence: remoteCall.sequence,
            remoteCallId: remoteCall.id
        }
    }, remoteCall.name);
    var changes = JSON.parse(remoteCall.changes);
    if (semotus._applyChanges(changes, semotus.role === 'client', subscriptionId, callContext)) {
        var obj = session.objects[remoteCall.id];
        if (!obj) {
            throw new Error("Cannot find object for remote call " + remoteCall.id);
        }
        // check to see if this function is supposed to be called directly from client
        if (obj.__proto__[remoteCall.name].__on__ !== 'server') {
            throw 'Invalid Function Call; not an API function';
        }
        if (semotus.role === 'server' && obj.validateServerCall) {
            return obj.validateServerCall.call(obj, remoteCall.name, callContext);
        }
        return true;
    }
    else {
        throw 'Sync Error';
    }
}
/**
 * Apply function specific custom serverSide validation functions
 *
 * @param semotus
 * @param {boolean} isValid - Result of previous validation step (applyChangesAndValidateCall)
 * @param session
 * @param remoteCall
 * @returns {boolean} True if passed function
 */
function customValidation(payload, isValid) {
    var semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
    var loggerObject = {
        component: 'semotus',
        module: 'processCall',
        activity: 'customValidation',
        data: {
            call: remoteCall.name,
            sequence: remoteCall.sequence,
            remoteCallId: remoteCall.id
        }
    };
    var remoteObject = session.objects[remoteCall.id];
    semotus.logger.info(loggerObject, remoteCall.name);
    if (!isValid) {
        return false;
    }
    else if (semotus.role === 'server' && remoteObject[remoteCall.name].serverValidation) {
        var args = semotus._extractArguments(remoteCall);
        args.unshift(remoteObject);
        return remoteObject[remoteCall.name].serverValidation.apply(null, args);
    }
    else {
        return true;
    }
}
/**
 * If the changes could be applied and the validation was successful call the method
 *
 * @param semotus
 * @param {boolean} isValid - takes a flag if the call is valid or not, if it is then we proceed normally,
 * otherwise, we throw an error and stop execution
 *
 * @param session
 * @param remoteCall
 * @returns {unknown} unknown
 */
function callIfValid(payload, isValid) {
    return __awaiter(this, void 0, void 0, function () {
        var semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback, loggerObject, obj, args;
        return __generator(this, function (_a) {
            semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
            loggerObject = {
                component: 'semotus',
                module: 'processCall',
                activity: 'callIfValid',
                data: {
                    call: remoteCall.name,
                    sequence: remoteCall.sequence,
                    remoteCallId: remoteCall.id
                }
            };
            semotus.logger.info(loggerObject, remoteCall.name);
            obj = session.objects[remoteCall.id];
            if (!obj[remoteCall.name]) {
                throw new Error(remoteCall.name + ' function does not exist.');
            }
            if (!isValid && remoteCall && remoteCall.name) {
                throw new Error(remoteCall.name + ' refused');
            }
            args = semotus._extractArguments(remoteCall);
            return [2 /*return*/, obj[remoteCall.name].apply(obj, args)];
        });
    });
}
/**
 * Let the controller know that the method was completed and give it a chance to commit changes
 *
 * @param semotus
 * @param  returnValue unknown
 * @param remoteCall
 * @param callContext
 *
 * @returns
 */
function postCallHook(payload, returnValue) {
    return __awaiter(this, void 0, void 0, function () {
        var semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback, hasChanges;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
                    if (!(semotus.controller && semotus.controller.postServerCall)) return [3 /*break*/, 2];
                    hasChanges = remoteCall.changes.length > 2;
                    return [4 /*yield*/, semotus.controller.postServerCall.call(semotus.controller, hasChanges, callContext, semotus.changeString)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, returnValue];
            }
        });
    });
}
/**
 * Package up any changes resulting from the execution and send them back in the message, clearing
 * our change queue to accumulate more changes for the next call
 *
 * @param semotus
 * @param remoteCall
 * @param remoteCallId
 * @param {unknown} ret unknown
 */
function postCallSuccess(payload, ret) {
    var semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
    semotus.logger.info({
        component: 'semotus',
        module: 'processCall',
        activity: 'postCall.success',
        data: {
            call: remoteCall.name,
            callTime: Utilities_1.logTime(callContext),
            sequence: remoteCall.sequence
        }
    }, remoteCall.name);
    packageChanges(semotus, session, {
        type: 'response',
        sync: true,
        value: JSON.stringify(semotus._toTransport(ret)),
        name: remoteCall.name,
        remoteCallId: remoteCallId
    });
}
/**
 * Helper function to identify if there's a postServerErrorHandler callback on the base controller
 * If there is, we execute the handler, and if we catch an error in the handler, we propogate it up to the logger.
 * @param logger
 * @param {*} controller
 * @param type
 * @param remoteCall
 * @param remoteCallId
 * @param callContext
 * @param changeString
 * @param session
 */
function resolveErrorHandler(logger, controller, type, remoteCall, remoteCallId, callContext, changeString, session) {
    return __awaiter(this, void 0, void 0, function () {
        var errorType, functionName, obj, logBody, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(controller && controller.postServerErrorHandler)) return [3 /*break*/, 4];
                    errorType = type;
                    functionName = remoteCall.name;
                    obj = undefined;
                    if (session.objects[remoteCall.id]) {
                        obj = session.objects[remoteCall.id];
                    }
                    logBody = {
                        component: 'semotus',
                        module: 'processCall.failure',
                        activity: 'postCall.resolveErrorHandler',
                        data: {
                            call: remoteCall.name,
                            message: undefined
                        }
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, controller.postServerErrorHandler.call(controller, errorType, remoteCallId, obj, functionName, callContext, changeString)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    if (error_1.message) {
                        logBody.data.message = error_1.message;
                        logger.error(error_1.message);
                    }
                    else {
                        logBody.data.message = JSON.stringify(error_1);
                    }
                    logger.error(logBody, 'User defined postServerErrorHandler threw an error');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Handle errors by returning an apropriate message.  In all cases changes sent back though they
 *
 * @param semotus
 * @param remoteCall
 * @param callContext
 * @param session
 * @param {unknown} err unknown
 *
 * @returns {unknown} A Promise
 */
function postCallFailure(payload, err) {
    return __awaiter(this, void 0, void 0, function () {
        var semotus, remoteCall, callContext, session, subscriptionId, remoteCallId, restoreSessionCallback, logString, packageChangesPayload, updateConflictRetry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    semotus = payload.semotus, remoteCall = payload.remoteCall, callContext = payload.callContext, session = payload.session, subscriptionId = payload.subscriptionId, remoteCallId = payload.remoteCallId, restoreSessionCallback = payload.restoreSessionCallback;
                    logString = '';
                    packageChangesPayload = {};
                    updateConflictRetry = false;
                    if (err === 'Sync Error') {
                        postCallErrorLog(semotus.logger, 'postCall.syncError', undefined, 'error', remoteCall.name, remoteCall, callContext);
                        packageChangesPayload = {
                            type: 'response',
                            sync: false,
                            changes: ''
                        };
                    }
                    else if (err.message == 'Update Conflict') {
                        // Not this may be caught in the transport (e.g. Amorphic) and retried)
                        // increment callContext.retries after checking if < 3. Should retry 3 times.
                        if (callContext.retries++ < 3) {
                            postCallErrorLog(semotus.logger, 'postCall.updateConflict', undefined, 'warn', remoteCall.name, remoteCall, callContext);
                            updateConflictRetry = true;
                            // The following assignment is only used for the error handler
                            packageChangesPayload = {
                                type: 'retry'
                            };
                        }
                        else {
                            postCallErrorLog(semotus.logger, 'postCall.updateConflict', undefined, 'error', remoteCall.name, remoteCall, callContext);
                            packageChangesPayload = {
                                type: 'retry',
                                sync: false
                            };
                        }
                    }
                    else {
                        if (!(err instanceof Error)) {
                            postCallErrorLog(semotus.logger, 'postCall.error', JSON.stringify(err), 'info', remoteCall.name, remoteCall, callContext);
                        }
                        else {
                            if (err.stack) {
                                logString = 'Exception in ' + remoteCall.name + ' - ' + err.message + (' ' + err.stack);
                            }
                            else {
                                logString = 'Exception in ' + remoteCall.name + ' - ' + err.message;
                            }
                            postCallErrorLog(semotus.logger, 'postCall.exception', err.message, 'error', logString, remoteCall, callContext);
                        }
                        packageChangesPayload = {
                            type: 'error',
                            sync: true,
                            value: Utilities_1.getError(err),
                            name: remoteCall.name
                        };
                    }
                    Object.assign(packageChangesPayload, { remoteCallId: remoteCallId });
                    return [4 /*yield*/, resolveErrorHandler(semotus.logger, semotus.controller, 
                        // @ts-ignore
                        packageChangesPayload.type, remoteCall, remoteCallId, callContext, semotus.changeString, session)];
                case 1:
                    _a.sent();
                    if (!updateConflictRetry) return [3 /*break*/, 3];
                    return [4 /*yield*/, Utilities_1.delay(callContext.retries * 1000)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, retryCall(payload)];
                case 3: return [2 /*return*/, packageChanges(semotus, session, packageChangesPayload)];
            }
        });
    });
}
/**
 * Deal with changes going back to the caller - Actually not Async!
 *
 * @param semotus
 * @param session
 * @param {unknown} message unknown
 */
function packageChanges(semotus, session, message) {
    semotus._convertArrayReferencesToChanges();
    message.changes = JSON.stringify(semotus.getChanges());
    if (semotus.memSession && semotus.memSession.semotus && semotus.memSession.semotus.callStartTime) {
        semotus.memSession.semotus.callStartTime = 0;
    }
    session.sendMessage(message);
    semotus._deleteChanges();
    semotus._processQueue();
}
/**
 *  Helper function to log amorphic errors.
 * @param {*} logger
 * @param {*} activity
 * @param {*} message
 * @param {*} logType
 * @param {*} logString
 * @param remoteCall
 * @param callContext
 */
function postCallErrorLog(logger, activity, message, logType, logString, remoteCall, callContext) {
    var logBody = {
        component: 'semotus',
        module: 'processCall.failure',
        data: {
            call: remoteCall.name,
            callTime: Utilities_1.logTime(callContext),
            sequence: remoteCall.sequence,
            message: undefined
        },
        activity: undefined
    };
    logBody.activity = activity;
    if (logger.data) {
        logBody.data.message = message;
    }
    logger[logType](logBody, logString);
}
exports.postCallErrorLog = postCallErrorLog;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvY2Vzc0NhbGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvaGVscGVycy9Qcm9jZXNzQ2FsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUFxRDtBQUlyRDs7Ozs7Ozs7Ozs7R0FXRztBQUVILFNBQXNCLFdBQVcsQ0FBQyxPQUEyQixFQUFFLFdBQXFCOzs7Ozs7O29CQUc5RCxxQkFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFBOztvQkFBaEQsV0FBVyxHQUFHLFNBQWtDLENBQUM7b0JBQ2pELHFCQUFNLFdBQVcsQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLEVBQUE7O29CQUF2QyxTQUF1QyxDQUFDO29CQUN2QixxQkFBTSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsRUFBQTs7b0JBQXZELFVBQVUsR0FBRyxTQUEwQztvQkFDOUMscUJBQU0sZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFBOztvQkFBeEQsVUFBVSxHQUFHLFNBQTJDLENBQUM7b0JBQzFDLHFCQUFNLFdBQVcsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUE7O29CQUEvQyxNQUFNLEdBQUcsU0FBc0M7b0JBQ3JELHFCQUFNLFlBQVksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUE7O29CQUFuQyxTQUFtQyxDQUFDO29CQUNwQyxxQkFBTSxlQUFlLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFBOztvQkFBdEMsU0FBc0MsQ0FBQzs7OztvQkFFdkMscUJBQU0sZUFBZSxDQUFDLE9BQU8sRUFBRSxLQUFHLENBQUMsRUFBQTs7b0JBQW5DLFNBQW1DLENBQUM7Ozs7OztDQUUzQztBQWJELGtDQWFDO0FBR0Q7Ozs7R0FJRztBQUNILFNBQWUsU0FBUyxDQUFDLE9BQTJCOzs7O1lBQ3pDLE9BQU8sR0FBNEYsT0FBTyxRQUFuRyxFQUFFLFVB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U0FBZ0IsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxVQUFzQixFQUFFLFdBQXdCO0lBQzVILElBQUksT0FBTyxHQUFHO1FBQ1YsU0FBUyxFQUFFLFNBQVM7UUFDcEIsTUFBTSxFQUFFLHFCQUFxQjtRQUM3QixJQUFJLEVBQUU7WUFDRixJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDckIsUUFBUSxFQUFFLG1CQUFPLENBQUMsV0FBVyxDQUFDO1lBQzlCLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUTtZQUM3QixPQUFPLEVBQUUsU0FBUztTQUNyQjtRQUNELFFBQVEsRUFBRSxTQUFTO0tBQ3RCLENBQUM7SUFFRixPQUFPLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztJQUU1QixJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUU7UUFDYixPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7S0FDbEM7SUFFRCxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFwQkQsNENBb0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtkZWxheSwgZ2V0RXJyb3IsIGxvZ1RpbWV9IGZyb20gJy4vVXRpbGl0aWVzJztcbmltcG9ydCB7Q2FsbENvbnRleHQsIFByb2Nlc3NDYWxsUGF5bG9hZCwgUmVtb3RlQ2FsbCwgU2Vtb3R1cywgU2Vzc2lvbn0gZnJvbSAnLi9UeXBlcyc7XG5cblxuLyoqXG4gKiBXZSBwcm9jZXNzIHRoZSBjYWxsIHRoZSByZW1vdGUgbWV0aG9kIGluIHN0YWdlcyBzdGFydGluZyBieSBsZXR0aW5nIHRoZSBjb250cm9sbGVyIGV4YW1pbmUgdGhlXG4gKiBjaGFuZ2VzIChwcmVDYWxsSG9vaykgYW5kIGdpdmluZyBpdCBhIGNoYW5jZSB0byByZWZyZXNoIGRhdGEgaWYgaXQgbmVlZHMgdG8uICBUaGVuIHdlIGFwcGx5IGFueVxuICogY2hhbmdlcyBpbiB0aGUgbWVzc2FnZXMgYW5kIGdpdmUgdGhlIG9iamVjdCBvd25pbmcgdGhlIG1ldGhvZCBhIGNoYW5jZSB0byB2YWxpZGF0ZSB0aGF0IHRoZVxuICogY2FsbCBpcyB2YWxpZCBhbmQgdGFrZSBjYXJlIG9mIGFueSBhdXRob3JpemF0aW9uIGNvbmNlcm5zLiAgRmluYWxseSB3ZSBsZXQgdGhlIGNvbnRyb2xsZXIgcGVyZm9ybVxuICogYW55IHBvc3QtY2FsbCBwcm9jZXNzaW5nIHN1Y2ggYXMgY29tbWl0aW5nIGRhdGEgYW5kIHRoZW4gd2UgZGVhbCB3aXRoIGEgZmFpbHVyZSBvciBzdWNjZXNzLlxuICpcbiAqIEBwYXJhbSBwYXlsb2FkXG4gKiBAcGFyYW0ge3Vua25vd259IGZvcmNldXBkYXRlIHVua25vd25cbiAqXG4gKiBAcmV0dXJucyB7dW5rbm93bn0gdW5rbm93blxuICovXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcm9jZXNzQ2FsbChwYXlsb2FkOiBQcm9jZXNzQ2FsbFBheWxvYWQsIGZvcmNldXBkYXRlPzogYm9vbGVhbikge1xuXG4gICAgdHJ5IHtcbiAgICAgICAgZm9yY2V1cGRhdGUgPSBhd2FpdCBQcm9taXNlLnJlc29sdmUoZm9yY2V1cGRhdGUpO1xuICAgICAgICBhd2FpdCBwcmVDYWxsSG9vayhwYXlsb2FkLCBmb3JjZXVwZGF0ZSk7XG4gICAgICAgIGxldCB2YWxpZGF0aW9uID0gYXdhaXQgYXBwbHlDaGFuZ2VzQW5kVmFsaWRhdGVDYWxsKHBheWxvYWQpO1xuICAgICAgICB2YWxpZGF0aW9uID0gYXdhaXQgY3VzdG9tVmFsaWRhdGlvbihwYXlsb2FkLCB2YWxpZGF0aW9uKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2FsbElmVmFsaWQocGF5bG9hZCwgdmFsaWRhdGlvbik7XG4gICAgICAgIGF3YWl0IHBvc3RDYWxsSG9vayhwYXlsb2FkLCByZXN1bHQpO1xuICAgICAgICBhd2FpdCBwb3N0Q2FsbFN1Y2Nlc3MocGF5bG9hZCwgcmVzdWx0KTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgYXdhaXQgcG9zdENhbGxGYWlsdXJlKHBheWxvYWQsIGVycik7XG4gICAgfVxufVxuXG5cbi8qKlxuICogSWYgdGhlcmUgaXMgYW4gdXBkYXRlIGNvbmZsaWN0IHdlIHdhbnQgdG8gcmV0cnkgYWZ0ZXIgcmVzdG9yaW5nIHRoZSBzZXNzaW9uXG4gKlxuICogQHJldHVybnMgeyp9IHVua25vd25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmV0cnlDYWxsKHBheWxvYWQ6IFByb2Nlc3NDYWxsUGF5bG9hZCkge1xuICAgIGNvbnN0IHtzZW1vdHVzLCByZW1vdGVDYWxsLCBjYWxsQ29udGV4dCwgc2Vzc2lvbiwgc3Vic2NyaXB0aW9uSWQsIHJlbW90ZUNhbGxJZCwgcmVzdG9yZVNlc3Npb25DYWxsYmFja30gPSBwYXlsb2FkO1xuXG4gICAgaWYgKHJlc3RvcmVTZXNzaW9uQ2FsbGJhY2spIHtcbiAgICAgICAgcmVzdG9yZVNlc3Npb25DYWxsYmFjaygpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9jZXNzQ2FsbChwYXlsb2FkLCB0cnVlKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgd2hhdCBvYmplY3RzIGNoYW5nZWQgYW5kIHBhc3MgdGhpcyB0byB0aGUgcHJlU2VydmVyQ2FsbCBtZXRob2Qgb24gdGhlIGNvbnRyb2xsZXJcbiAqXG4gKiBAcGFyYW0gcGF5bG9hZFxuICogQHBhcmFtICBmb3JjZXVwZGF0ZSB1bmtub3duXG4gKlxuICogQHJldHVybnMgIHVua25vd25cbiAqL1xuZnVuY3Rpb24gcHJlQ2FsbEhvb2socGF5bG9hZDogUHJvY2Vzc0NhbGxQYXlsb2FkLCBmb3JjZXVwZGF0ZT86IGJvb2xlYW4pOiBib29sZWFuIHtcbiAgICBjb25zdCB7c2Vtb3R1cywgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQsIHNlc3Npb24sIHN1YnNjcmlwdGlvbklkLCByZW1vdGVDYWxsSWQsIHJlc3RvcmVTZXNzaW9uQ2FsbGJhY2t9ID0gcGF5bG9hZDtcbiAgICBzZW1vdHVzLmxvZ2dlci5pbmZvKFxuICAgICAgICB7XG4gICAgICAgICAgICBjb21wb25lbnQ6ICdzZW1vdHVzJyxcbiAgICAgICAgICAgIG1vZHVsZTogJ3Byb2Nlc3NDYWxsJyxcbiAgICAgICAgICAgIGFjdGl2aXR5OiAncHJlU2VydmVyQ2FsbCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgY2FsbDogcmVtb3RlQ2FsbC5uYW1lLFxuICAgICAgICAgICAgICAgIHNlcXVlbmNlOiByZW1vdGVDYWxsLnNlcXVlbmNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW90ZUNhbGwubmFtZVxuICAgICk7XG5cbiAgICBpZiAoc2Vtb3R1cy5jb250cm9sbGVyICYmIHNlbW90dXMuY29udHJvbGxlci5wcmVTZXJ2ZXJDYWxsKSB7XG4gICAgICAgIGxldCBjaGFuZ2VzID0ge307XG5cbiAgICAgICAgZm9yICh2YXIgb2JqSWQgaW4gSlNPTi5wYXJzZShyZW1vdGVDYWxsLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICBjaGFuZ2VzW3NlbW90dXMuX19kaWN0aW9uYXJ5X19bb2JqSWQucmVwbGFjZSgvW14tXSotLywgJycpLnJlcGxhY2UoLy0uKi8sICcnKV0uX19uYW1lX19dID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZW1vdHVzLmNvbnRyb2xsZXIucHJlU2VydmVyQ2FsbC5jYWxsKFxuICAgICAgICAgICAgc2Vtb3R1cy5jb250cm9sbGVyLFxuICAgICAgICAgICAgcmVtb3RlQ2FsbC5jaGFuZ2VzLmxlbmd0aCA+IDIsXG4gICAgICAgICAgICBjaGFuZ2VzLFxuICAgICAgICAgICAgY2FsbENvbnRleHQsXG4gICAgICAgICAgICBmb3JjZXVwZGF0ZVxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBBcHBseSBjaGFuZ2VzIGluIHRoZSBtZXNzYWdlIGFuZCB0aGVuIHZhbGlkYXRlIHRoZSBjYWxsLiAgVGhyb3cgXCJTeW5jIEVycm9yXCIgaWYgY2hhbmdlcyBjYW4ndCBiZSBhcHBsaWVkXG4gKlxuICogQHJldHVybnMge3Vua25vd259IHVua25vd25cbiAqL1xuZnVuY3Rpb24gYXBwbHlDaGFuZ2VzQW5kVmFsaWRhdGVDYWxsKHBheWxvYWQ6IFByb2Nlc3NDYWxsUGF5bG9hZCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHtzZW1vdHVzLCByZW1vdGVDYWxsLCBjYWxsQ29udGV4dCwgc2Vzc2lvbiwgc3Vic2NyaXB0aW9uSWQsIHJlbW90ZUNhbGxJZCwgcmVzdG9yZVNlc3Npb25DYWxsYmFja30gPSBwYXlsb2FkO1xuXG4gICAgc2Vtb3R1cy5sb2dnZXIuaW5mbyhcbiAgICAgICAge1xuICAgICAgICAgICAgY29tcG9uZW50OiAnc2Vtb3R1cycsXG4gICAgICAgICAgICBtb2R1bGU6ICdwcm9jZXNzQ2FsbCcsXG4gICAgICAgICAgICBhY3Rpdml0eTogJ2FwcGx5Q2hhbmdlc0FuZFZhbGlkYXRlQ2FsbCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgY2FsbDogcmVtb3RlQ2FsbC5uYW1lLFxuICAgICAgICAgICAgICAgIHNlcXVlbmNlOiByZW1vdGVDYWxsLnNlcXVlbmNlLFxuICAgICAgICAgICAgICAgIHJlbW90ZUNhbGxJZDogcmVtb3RlQ2FsbC5pZFxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICByZW1vdGVDYWxsLm5hbWVcbiAgICApO1xuXG4gICAgbGV0IGNoYW5nZXMgPSBKU09OLnBhcnNlKHJlbW90ZUNhbGwuY2hhbmdlcyk7XG5cbiAgICBpZiAoc2Vtb3R1cy5fYXBwbHlDaGFuZ2VzKGNoYW5nZXMsIHNlbW90dXMucm9sZSA9PT0gJ2NsaWVudCcsIHN1YnNjcmlwdGlvbklkLCBjYWxsQ29udGV4dCkpIHtcbiAgICAgICAgY29uc3Qgb2JqID0gc2Vzc2lvbi5vYmplY3RzW3JlbW90ZUNhbGwuaWRdO1xuXG4gICAgICAgIGlmICghb2JqKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBmaW5kIG9iamVjdCBmb3IgcmVtb3RlIGNhbGwgJHtyZW1vdGVDYWxsLmlkfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2sgdG8gc2VlIGlmIHRoaXMgZnVuY3Rpb24gaXMgc3VwcG9zZWQgdG8gYmUgY2FsbGVkIGRpcmVjdGx5IGZyb20gY2xpZW50XG4gICAgICAgIGlmIChvYmouX19wcm90b19fW3JlbW90ZUNhbGwubmFtZV0uX19vbl9fICE9PSAnc2VydmVyJykge1xuICAgICAgICAgICAgdGhyb3cgJ0ludmFsaWQgRnVuY3Rpb24gQ2FsbDsgbm90IGFuIEFQSSBmdW5jdGlvbic7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2Vtb3R1cy5yb2xlID09PSAnc2VydmVyJyAmJiBvYmoudmFsaWRhdGVTZXJ2ZXJDYWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gb2JqLnZhbGlkYXRlU2VydmVyQ2FsbC5jYWxsKG9iaiwgcmVtb3RlQ2FsbC5uYW1lLCBjYWxsQ29udGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyAnU3luYyBFcnJvcic7XG4gICAgfVxufVxuXG4vKipcbiAqIEFwcGx5IGZ1bmN0aW9uIHNwZWNpZmljIGN1c3RvbSBzZXJ2ZXJTaWRlIHZhbGlkYXRpb24gZnVuY3Rpb25zXG4gKlxuICogQHBhcmFtIHNlbW90dXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNWYWxpZCAtIFJlc3VsdCBvZiBwcmV2aW91cyB2YWxpZGF0aW9uIHN0ZXAgKGFwcGx5Q2hhbmdlc0FuZFZhbGlkYXRlQ2FsbClcbiAqIEBwYXJhbSBzZXNzaW9uXG4gKiBAcGFyYW0gcmVtb3RlQ2FsbFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgcGFzc2VkIGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGN1c3RvbVZhbGlkYXRpb24ocGF5bG9hZDogUHJvY2Vzc0NhbGxQYXlsb2FkLCBpc1ZhbGlkOiBib29sZWFuKTogYm9vbGVhbiB7XG4gICAgY29uc3Qge3NlbW90dXMsIHJlbW90ZUNhbGwsIGNhbGxDb250ZXh0LCBzZXNzaW9uLCBzdWJzY3JpcHRpb25JZCwgcmVtb3RlQ2FsbElkLCByZXN0b3JlU2Vzc2lvbkNhbGxiYWNrfSA9IHBheWxvYWQ7XG5cbiAgICBsZXQgbG9nZ2VyT2JqZWN0ID0ge1xuICAgICAgICBjb21wb25lbnQ6ICdzZW1vdHVzJyxcbiAgICAgICAgbW9kdWxlOiAncHJvY2Vzc0NhbGwnLFxuICAgICAgICBhY3Rpdml0eTogJ2N1c3RvbVZhbGlkYXRpb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBjYWxsOiByZW1vdGVDYWxsLm5hbWUsXG4gICAgICAgICAgICBzZXF1ZW5jZTogcmVtb3RlQ2FsbC5zZXF1ZW5jZSxcbiAgICAgICAgICAgIHJlbW90ZUNhbGxJZDogcmVtb3RlQ2FsbC5pZFxuICAgICAgICB9XG4gICAgfTtcblxuICAgIGxldCByZW1vdGVPYmplY3QgPSBzZXNzaW9uLm9iamVjdHNbcmVtb3RlQ2FsbC5pZF07XG5cbiAgICBzZW1vdHVzLmxvZ2dlci5pbmZvKGxvZ2dlck9iamVjdCwgcmVtb3RlQ2FsbC5uYW1lKTtcblxuICAgIGlmICghaXNWYWxpZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIGlmIChzZW1vdHVzLnJvbGUgPT09ICdzZXJ2ZXInICYmIHJlbW90ZU9iamVjdFtyZW1vdGVDYWxsLm5hbWVdLnNlcnZlclZhbGlkYXRpb24pIHtcbiAgICAgICAgbGV0IGFyZ3MgPSBzZW1vdHVzLl9leHRyYWN0QXJndW1lbnRzKHJlbW90ZUNhbGwpO1xuICAgICAgICBhcmdzLnVuc2hpZnQocmVtb3RlT2JqZWN0KTtcblxuICAgICAgICByZXR1cm4gcmVtb3RlT2JqZWN0W3JlbW90ZUNhbGwubmFtZV0uc2VydmVyVmFsaWRhdGlvbi5hcHBseShudWxsLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogSWYgdGhlIGNoYW5nZXMgY291bGQgYmUgYXBwbGllZCBhbmQgdGhlIHZhbGlkYXRpb24gd2FzIHN1Y2Nlc3NmdWwgY2FsbCB0aGUgbWV0aG9kXG4gKlxuICogQHBhcmFtIHNlbW90dXNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNWYWxpZCAtIHRha2VzIGEgZmxhZyBpZiB0aGUgY2FsbCBpcyB2YWxpZCBvciBub3QsIGlmIGl0IGlzIHRoZW4gd2UgcHJvY2VlZCBub3JtYWxseSxcbiAqIG90aGVyd2lzZSwgd2UgdGhyb3cgYW4gZXJyb3IgYW5kIHN0b3AgZXhlY3V0aW9uXG4gKlxuICogQHBhcmFtIHNlc3Npb25cbiAqIEBwYXJhbSByZW1vdGVDYWxsXG4gKiBAcmV0dXJucyB7dW5rbm93bn0gdW5rbm93blxuICovXG5hc3luYyBmdW5jdGlvbiBjYWxsSWZWYWxpZChwYXlsb2FkOiBQcm9jZXNzQ2FsbFBheWxvYWQsIGlzVmFsaWQ6IGJvb2xlYW4pIHtcbiAgICBjb25zdCB7c2Vtb3R1cywgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQsIHNlc3Npb24sIHN1YnNjcmlwdGlvbklkLCByZW1vdGVDYWxsSWQsIHJlc3RvcmVTZXNzaW9uQ2FsbGJhY2t9ID0gcGF5bG9hZDtcblxuICAgIGxldCBsb2dnZXJPYmplY3QgPSB7XG4gICAgICAgIGNvbXBvbmVudDogJ3NlbW90dXMnLFxuICAgICAgICBtb2R1bGU6ICdwcm9jZXNzQ2FsbCcsXG4gICAgICAgIGFjdGl2aXR5OiAnY2FsbElmVmFsaWQnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBjYWxsOiByZW1vdGVDYWxsLm5hbWUsXG4gICAgICAgICAgICBzZXF1ZW5jZTogcmVtb3RlQ2FsbC5zZXF1ZW5jZSxcbiAgICAgICAgICAgIHJlbW90ZUNhbGxJZDogcmVtb3RlQ2FsbC5pZFxuICAgICAgICB9XG4gICAgfTtcblxuICAgIHNlbW90dXMubG9nZ2VyLmluZm8obG9nZ2VyT2JqZWN0LCByZW1vdGVDYWxsLm5hbWUpO1xuXG4gICAgbGV0IG9iaiA9IHNlc3Npb24ub2JqZWN0c1tyZW1vdGVDYWxsLmlkXTtcblxuICAgIGlmICghb2JqW3JlbW90ZUNhbGwubmFtZV0pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKHJlbW90ZUNhbGwubmFtZSArICcgZnVuY3Rpb24gZG9lcyBub3QgZXhpc3QuJyk7XG4gICAgfVxuXG4gICAgaWYgKCFpc1ZhbGlkICYmIHJlbW90ZUNhbGwgJiYgcmVtb3RlQ2FsbC5uYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihyZW1vdGVDYWxsLm5hbWUgKyAnIHJlZnVzZWQnKTtcbiAgICB9XG5cbiAgICBsZXQgYXJncyA9IHNlbW90dXMuX2V4dHJhY3RBcmd1bWVudHMocmVtb3RlQ2FsbCk7XG5cbiAgICByZXR1cm4gb2JqW3JlbW90ZUNhbGwubmFtZV0uYXBwbHkob2JqLCBhcmdzKTtcbn1cblxuLyoqXG4gKiBMZXQgdGhlIGNvbnRyb2xsZXIga25vdyB0aGF0IHRoZSBtZXRob2Qgd2FzIGNvbXBsZXRlZCBhbmQgZ2l2ZSBpdCBhIGNoYW5jZSB0byBjb21taXQgY2hhbmdlc1xuICpcbiAqIEBwYXJhbSBzZW1vdHVzXG4gKiBAcGFyYW0gIHJldHVyblZhbHVlIHVua25vd25cbiAqIEBwYXJhbSByZW1vdGVDYWxsXG4gKiBAcGFyYW0gY2FsbENvbnRleHRcbiAqXG4gKiBAcmV0dXJuc1xuICovXG5hc3luYyBmdW5jdGlvbiBwb3N0Q2FsbEhvb2socGF5bG9hZDogUHJvY2Vzc0NhbGxQYXlsb2FkLCByZXR1cm5WYWx1ZSkge1xuICAgIGNvbnN0IHtzZW1vdHVzLCByZW1vdGVDYWxsLCBjYWxsQ29udGV4dCwgc2Vzc2lvbiwgc3Vic2NyaXB0aW9uSWQsIHJlbW90ZUNhbGxJZCwgcmVzdG9yZVNlc3Npb25DYWxsYmFja30gPSBwYXlsb2FkO1xuXG4gICAgaWYgKHNlbW90dXMuY29udHJvbGxlciAmJiBzZW1vdHVzLmNvbnRyb2xsZXIucG9zdFNlcnZlckNhbGwpIHtcbiAgICAgICAgY29uc3QgaGFzQ2hhbmdlczogYm9vbGVhbiA9IHJlbW90ZUNhbGwuY2hhbmdlcy5sZW5ndGggPiAyO1xuICAgICAgICBhd2FpdCBzZW1vdHVzLmNvbnRyb2xsZXIucG9zdFNlcnZlckNhbGwuY2FsbChzZW1vdHVzLmNvbnRyb2xsZXIsIGhhc0NoYW5nZXMsIGNhbGxDb250ZXh0LCBzZW1vdHVzLmNoYW5nZVN0cmluZyk7XG4gICAgfVxuICAgIHJldHVybiByZXR1cm5WYWx1ZTtcbn1cblxuLyoqXG4gKiBQYWNrYWdlIHVwIGFueSBjaGFuZ2VzIHJlc3VsdGluZyBmcm9tIHRoZSBleGVjdXRpb24gYW5kIHNlbmQgdGhlbSBiYWNrIGluIHRoZSBtZXNzYWdlLCBjbGVhcmluZ1xuICogb3VyIGNoYW5nZSBxdWV1ZSB0byBhY2N1bXVsYXRlIG1vcmUgY2hhbmdlcyBmb3IgdGhlIG5leHQgY2FsbFxuICpcbiAqIEBwYXJhbSBzZW1vdHVzXG4gKiBAcGFyYW0gcmVtb3RlQ2FsbFxuICogQHBhcmFtIHJlbW90ZUNhbGxJZFxuICogQHBhcmFtIHt1bmtub3dufSByZXQgdW5rbm93blxuICovXG5mdW5jdGlvbiBwb3N0Q2FsbFN1Y2Nlc3MocGF5bG9hZDogUHJvY2Vzc0NhbGxQYXlsb2FkLCByZXQpOiB2b2lkIHtcbiAgICBjb25zdCB7c2Vtb3R1cywgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQsIHNlc3Npb24sIHN1YnNjcmlwdGlvbklkLCByZW1vdGVDYWxsSWQsIHJlc3RvcmVTZXNzaW9uQ2FsbGJhY2t9ID0gcGF5bG9hZDtcblxuICAgIHNlbW90dXMubG9nZ2VyLmluZm8oXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbXBvbmVudDogJ3NlbW90dXMnLFxuICAgICAgICAgICAgbW9kdWxlOiAncHJvY2Vzc0NhbGwnLFxuICAgICAgICAgICAgYWN0aXZpdHk6ICdwb3N0Q2FsbC5zdWNjZXNzJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjYWxsOiByZW1vdGVDYWxsLm5hbWUsXG4gICAgICAgICAgICAgICAgY2FsbFRpbWU6IGxvZ1RpbWUoY2FsbENvbnRleHQpLFxuICAgICAgICAgICAgICAgIHNlcXVlbmNlOiByZW1vdGVDYWxsLnNlcXVlbmNlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHJlbW90ZUNhbGwubmFtZVxuICAgICk7XG5cbiAgICBwYWNrYWdlQ2hhbmdlcyhzZW1vdHVzLCBzZXNzaW9uLHtcbiAgICAgICAgdHlwZTogJ3Jlc3BvbnNlJyxcbiAgICAgICAgc3luYzogdHJ1ZSxcbiAgICAgICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KHNlbW90dXMuX3RvVHJhbnNwb3J0KHJldCkpLFxuICAgICAgICBuYW1lOiByZW1vdGVDYWxsLm5hbWUsXG4gICAgICAgIHJlbW90ZUNhbGxJZDogcmVtb3RlQ2FsbElkXG4gICAgfSk7XG59XG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGlkZW50aWZ5IGlmIHRoZXJlJ3MgYSBwb3N0U2VydmVyRXJyb3JIYW5kbGVyIGNhbGxiYWNrIG9uIHRoZSBiYXNlIGNvbnRyb2xsZXJcbiAqIElmIHRoZXJlIGlzLCB3ZSBleGVjdXRlIHRoZSBoYW5kbGVyLCBhbmQgaWYgd2UgY2F0Y2ggYW4gZXJyb3IgaW4gdGhlIGhhbmRsZXIsIHdlIHByb3BvZ2F0ZSBpdCB1cCB0byB0aGUgbG9nZ2VyLlxuICogQHBhcmFtIGxvZ2dlclxuICogQHBhcmFtIHsqfSBjb250cm9sbGVyXG4gKiBAcGFyYW0gdHlwZVxuICogQHBhcmFtIHJlbW90ZUNhbGxcbiAqIEBwYXJhbSByZW1vdGVDYWxsSWRcbiAqIEBwYXJhbSBjYWxsQ29udGV4dFxuICogQHBhcmFtIGNoYW5nZVN0cmluZ1xuICogQHBhcmFtIHNlc3Npb25cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZUVycm9ySGFuZGxlcihsb2dnZXIsIGNvbnRyb2xsZXIsIHR5cGUsIHJlbW90ZUNhbGw6IFJlbW90ZUNhbGwsIHJlbW90ZUNhbGxJZCwgY2FsbENvbnRleHQ6IENhbGxDb250ZXh0LCBjaGFuZ2VTdHJpbmcsIHNlc3Npb246IFNlc3Npb24pIHtcblxuICAgIGlmIChjb250cm9sbGVyICYmIGNvbnRyb2xsZXIucG9zdFNlcnZlckVycm9ySGFuZGxlcikge1xuICAgICAgICBsZXQgZXJyb3JUeXBlID0gdHlwZTtcbiAgICAgICAgbGV0IGZ1bmN0aW9uTmFtZSA9IHJlbW90ZUNhbGwubmFtZTtcbiAgICAgICAgbGV0IG9iaiA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHNlc3Npb24ub2JqZWN0c1tyZW1vdGVDYWxsLmlkXSkge1xuICAgICAgICAgICAgb2JqID0gc2Vzc2lvbi5vYmplY3RzW3JlbW90ZUNhbGwuaWRdO1xuICAgICAgICB9XG4gICAgICAgIGxldCBsb2dCb2R5ID0ge1xuICAgICAgICAgICAgY29tcG9uZW50OiAnc2Vtb3R1cycsXG4gICAgICAgICAgICBtb2R1bGU6ICdwcm9jZXNzQ2FsbC5mYWlsdXJlJyxcbiAgICAgICAgICAgIGFjdGl2aXR5OiAncG9zdENhbGwucmVzb2x2ZUVycm9ySGFuZGxlcicsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgY2FsbDogcmVtb3RlQ2FsbC5uYW1lLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHVuZGVmaW5lZFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBjb250cm9sbGVyLnBvc3RTZXJ2ZXJFcnJvckhhbmRsZXIuY2FsbChjb250cm9sbGVyLCBlcnJvclR5cGUsIHJlbW90ZUNhbGxJZCwgb2JqLCBmdW5jdGlvbk5hbWUsIGNhbGxDb250ZXh0LCBjaGFuZ2VTdHJpbmcpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBsb2dCb2R5LmRhdGEubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dCb2R5LmRhdGEubWVzc2FnZSA9IEpTT04uc3RyaW5naWZ5KGVycm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGxvZ0JvZHksICdVc2VyIGRlZmluZWQgcG9zdFNlcnZlckVycm9ySGFuZGxlciB0aHJldyBhbiBlcnJvcicpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSBlcnJvcnMgYnkgcmV0dXJuaW5nIGFuIGFwcm9wcmlhdGUgbWVzc2FnZS4gIEluIGFsbCBjYXNlcyBjaGFuZ2VzIHNlbnQgYmFjayB0aG91Z2ggdGhleVxuICpcbiAqIEBwYXJhbSBzZW1vdHVzXG4gKiBAcGFyYW0gcmVtb3RlQ2FsbFxuICogQHBhcmFtIGNhbGxDb250ZXh0XG4gKiBAcGFyYW0gc2Vzc2lvblxuICogQHBhcmFtIHt1bmtub3dufSBlcnIgdW5rbm93blxuICpcbiAqIEByZXR1cm5zIHt1bmtub3dufSBBIFByb21pc2VcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcG9zdENhbGxGYWlsdXJlKHBheWxvYWQ6IFByb2Nlc3NDYWxsUGF5bG9hZCwgZXJyKSB7XG4gICAgY29uc3Qge3NlbW90dXMsIHJlbW90ZUNhbGwsIGNhbGxDb250ZXh0LCBzZXNzaW9uLCBzdWJzY3JpcHRpb25JZCwgcmVtb3RlQ2FsbElkLCByZXN0b3JlU2Vzc2lvbkNhbGxiYWNrfSA9IHBheWxvYWQ7XG5cbiAgICBsZXQgbG9nU3RyaW5nID0gJyc7XG5cbiAgICBsZXQgcGFja2FnZUNoYW5nZXNQYXlsb2FkID0ge307XG5cbiAgICBsZXQgdXBkYXRlQ29uZmxpY3RSZXRyeSA9IGZhbHNlO1xuXG4gICAgaWYgKGVyciA9PT0gJ1N5bmMgRXJyb3InKSB7XG4gICAgICAgIHBvc3RDYWxsRXJyb3JMb2coc2Vtb3R1cy5sb2dnZXIsICdwb3N0Q2FsbC5zeW5jRXJyb3InLCB1bmRlZmluZWQsICdlcnJvcicsIHJlbW90ZUNhbGwubmFtZSwgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQpO1xuICAgICAgICBwYWNrYWdlQ2hhbmdlc1BheWxvYWQgPSB7XG4gICAgICAgICAgICB0eXBlOiAncmVzcG9uc2UnLFxuICAgICAgICAgICAgc3luYzogZmFsc2UsXG4gICAgICAgICAgICBjaGFuZ2VzOiAnJ1xuICAgICAgICB9O1xuICAgIH0gZWxzZSBpZiAoZXJyLm1lc3NhZ2UgPT0gJ1VwZGF0ZSBDb25mbGljdCcpIHtcbiAgICAgICAgLy8gTm90IHRoaXMgbWF5IGJlIGNhdWdodCBpbiB0aGUgdHJhbnNwb3J0IChlLmcuIEFtb3JwaGljKSBhbmQgcmV0cmllZClcblxuICAgICAgICAvLyBpbmNyZW1lbnQgY2FsbENvbnRleHQucmV0cmllcyBhZnRlciBjaGVja2luZyBpZiA8IDMuIFNob3VsZCByZXRyeSAzIHRpbWVzLlxuICAgICAgICBpZiAoY2FsbENvbnRleHQucmV0cmllcysrIDwgMykge1xuICAgICAgICAgICAgcG9zdENhbGxFcnJvckxvZyhzZW1vdHVzLmxvZ2dlciwgJ3Bvc3RDYWxsLnVwZGF0ZUNvbmZsaWN0JywgdW5kZWZpbmVkLCAnd2FybicsIHJlbW90ZUNhbGwubmFtZSwgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQpO1xuICAgICAgICAgICAgdXBkYXRlQ29uZmxpY3RSZXRyeSA9IHRydWU7XG4gICAgICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGFzc2lnbm1lbnQgaXMgb25seSB1c2VkIGZvciB0aGUgZXJyb3IgaGFuZGxlclxuICAgICAgICAgICAgcGFja2FnZUNoYW5nZXNQYXlsb2FkID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZXRyeSdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwb3N0Q2FsbEVycm9yTG9nKHNlbW90dXMubG9nZ2VyLCAncG9zdENhbGwudXBkYXRlQ29uZmxpY3QnLCB1bmRlZmluZWQsICdlcnJvcicsIHJlbW90ZUNhbGwubmFtZSwgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQpO1xuICAgICAgICAgICAgcGFja2FnZUNoYW5nZXNQYXlsb2FkID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZXRyeScsXG4gICAgICAgICAgICAgICAgc3luYzogZmFsc2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIShlcnIgaW5zdGFuY2VvZiBFcnJvcikpIHtcbiAgICAgICAgICAgIHBvc3RDYWxsRXJyb3JMb2coc2Vtb3R1cy5sb2dnZXIsICdwb3N0Q2FsbC5lcnJvcicsIEpTT04uc3RyaW5naWZ5KGVyciksICdpbmZvJywgcmVtb3RlQ2FsbC5uYW1lLCByZW1vdGVDYWxsLCBjYWxsQ29udGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICAgICAgICAgICAgbG9nU3RyaW5nID0gJ0V4Y2VwdGlvbiBpbiAnICsgcmVtb3RlQ2FsbC5uYW1lICsgJyAtICcgKyBlcnIubWVzc2FnZSArICgnICcgKyBlcnIuc3RhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dTdHJpbmcgPSAnRXhjZXB0aW9uIGluICcgKyByZW1vdGVDYWxsLm5hbWUgKyAnIC0gJyArIGVyci5tZXNzYWdlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwb3N0Q2FsbEVycm9yTG9nKHNlbW90dXMubG9nZ2VyLCAncG9zdENhbGwuZXhjZXB0aW9uJywgZXJyLm1lc3NhZ2UsICdlcnJvcicsIGxvZ1N0cmluZywgcmVtb3RlQ2FsbCwgY2FsbENvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGFja2FnZUNoYW5nZXNQYXlsb2FkID0ge1xuICAgICAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAgIHN5bmM6IHRydWUsXG4gICAgICAgICAgICB2YWx1ZTogZ2V0RXJyb3IoZXJyKSxcbiAgICAgICAgICAgIG5hbWU6IHJlbW90ZUNhbGwubmFtZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIE9iamVjdC5hc3NpZ24ocGFja2FnZUNoYW5nZXNQYXlsb2FkLCB7cmVtb3RlQ2FsbElkOiByZW1vdGVDYWxsSWR9KTtcblxuICAgIGF3YWl0IHJlc29sdmVFcnJvckhhbmRsZXIoXG4gICAgICAgIHNlbW90dXMubG9nZ2VyLFxuICAgICAgICBzZW1vdHVzLmNvbnRyb2xsZXIsXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgcGFja2FnZUNoYW5nZXNQYXlsb2FkLnR5cGUsXG4gICAgICAgIHJlbW90ZUNhbGwsXG4gICAgICAgIHJlbW90ZUNhbGxJZCxcbiAgICAgICAgY2FsbENvbnRleHQsXG4gICAgICAgIHNlbW90dXMuY2hhbmdlU3RyaW5nLFxuICAgICAgICBzZXNzaW9uXG4gICAgKTtcblxuICAgIGlmICh1cGRhdGVDb25mbGljdFJldHJ5KSB7XG4gICAgICAgIGF3YWl0IGRlbGF5KGNhbGxDb250ZXh0LnJldHJpZXMgKiAxMDAwKTtcbiAgICAgICAgcmV0dXJuIHJldHJ5Q2FsbChwYXlsb2FkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGFja2FnZUNoYW5nZXMoc2Vtb3R1cywgc2Vzc2lvbiwgcGFja2FnZUNoYW5nZXNQYXlsb2FkKTtcbiAgICB9XG59XG5cbi8qKlxuICogRGVhbCB3aXRoIGNoYW5nZXMgZ29pbmcgYmFjayB0byB0aGUgY2FsbGVyIC0gQWN0dWFsbHkgbm90IEFzeW5jIVxuICpcbiAqIEBwYXJhbSBzZW1vdHVzXG4gKiBAcGFyYW0gc2Vzc2lvblxuICogQHBhcmFtIHt1bmtub3dufSBtZXNzYWdlIHVua25vd25cbiAqL1xuZnVuY3Rpb24gcGFja2FnZUNoYW5nZXMoc2Vtb3R1czogU2Vtb3R1cywgc2Vzc2lvbjogU2Vzc2lvbiwgbWVzc2FnZSkge1xuICAgIHNlbW90dXMuX2NvbnZlcnRBcnJheVJlZmVyZW5jZXNUb0NoYW5nZXMoKTtcbiAgICBtZXNzYWdlLmNoYW5nZXMgPSBKU09OLnN0cmluZ2lmeShzZW1vdHVzLmdldENoYW5nZXMoKSk7XG5cbiAgICBpZiAoc2Vtb3R1cy5tZW1TZXNzaW9uICYmIHNlbW90dXMubWVtU2Vzc2lvbi5zZW1vdHVzICYmIHNlbW90dXMubWVtU2Vzc2lvbi5zZW1vdHVzLmNhbGxTdGFydFRpbWUpIHtcbiAgICAgICAgc2Vtb3R1cy5tZW1TZXNzaW9uLnNlbW90dXMuY2FsbFN0YXJ0VGltZSA9IDA7XG4gICAgfVxuXG4gICAgc2Vzc2lvbi5zZW5kTWVzc2FnZShtZXNzYWdlKTtcbiAgICBzZW1vdHVzLl9kZWxldGVDaGFuZ2VzKCk7XG4gICAgc2Vtb3R1cy5fcHJvY2Vzc1F1ZXVlKCk7XG59XG5cblxuLyoqXG4gKiAgSGVscGVyIGZ1bmN0aW9uIHRvIGxvZyBhbW9ycGhpYyBlcnJvcnMuXG4gKiBAcGFyYW0geyp9IGxvZ2dlclxuICogQHBhcmFtIHsqfSBhY3Rpdml0eVxuICogQHBhcmFtIHsqfSBtZXNzYWdlXG4gKiBAcGFyYW0geyp9IGxvZ1R5cGVcbiAqIEBwYXJhbSB7Kn0gbG9nU3RyaW5nXG4gKiBAcGFyYW0gcmVtb3RlQ2FsbFxuICogQHBhcmFtIGNhbGxDb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwb3N0Q2FsbEVycm9yTG9nKGxvZ2dlciwgYWN0aXZpdHksIG1lc3NhZ2UsIGxvZ1R5cGUsIGxvZ1N0cmluZywgcmVtb3RlQ2FsbDogUmVtb3RlQ2FsbCwgY2FsbENvbnRleHQ6IENhbGxDb250ZXh0KSB7XG4gICAgbGV0IGxvZ0JvZHkgPSB7XG4gICAgICAgIGNvbXBvbmVudDogJ3NlbW90dXMnLFxuICAgICAgICBtb2R1bGU6ICdwcm9jZXNzQ2FsbC5mYWlsdXJlJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgY2FsbDogcmVtb3RlQ2FsbC5uYW1lLFxuICAgICAgICAgICAgY2FsbFRpbWU6IGxvZ1RpbWUoY2FsbENvbnRleHQpLFxuICAgICAgICAgICAgc2VxdWVuY2U6IHJlbW90ZUNhbGwuc2VxdWVuY2UsXG4gICAgICAgICAgICBtZXNzYWdlOiB1bmRlZmluZWRcbiAgICAgICAgfSxcbiAgICAgICAgYWN0aXZpdHk6IHVuZGVmaW5lZFxuICAgIH07XG5cbiAgICBsb2dCb2R5LmFjdGl2aXR5ID0gYWN0aXZpdHk7XG5cbiAgICBpZiAobG9nZ2VyLmRhdGEpIHtcbiAgICAgICAgbG9nQm9keS5kYXRhLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIH1cblxuICAgIGxvZ2dlcltsb2dUeXBlXShsb2dCb2R5LCBsb2dTdHJpbmcpO1xufVxuIl19