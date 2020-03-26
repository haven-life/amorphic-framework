import {Supertype} from '@havenlife/supertype';

export type Subscription = {
    role: string;
    log: {
        array: ArrayGroup;
        arrayDirty: ArrayGroup;
        change: ChangeGroup;
    }
}

export const Change = 'change';
export type ArrayTypes = 'array' | 'arrayDirty';
export type ErrorType = 'error' | 'retry' | 'response';

export type CallContext = { retries: number; startTime: Date };

export type ProcessCallPayload = {
    semotus: Semotus;
    remoteCall: RemoteCall;
    callContext: CallContext;
    session: Session;
    subscriptionId: any;
    remoteCallId: any;
    restoreSessionCallback?: Function;
}

/**
 *  id is the id of the object + '/' + property.
 *  Ex: there are 1 School to Many Students
 *
 *  School {
 *      students: Array<Students>
 *  }
 *
 *  In this case, one entry within this ArrayGroup may be 'server-School-1/students': ["server-Student-3", "server-Student-5"]
 *
 *  If that's all the changes then the ArrayGroup would be {'server-School-1/students': ["server-Student-3", "server-Student-5"]}
 */
export type ArrayGroup = { [id: string]: ArrayChanges };

/**
 * An array of Id references to Supertype Objects or primitive values
 */
type ArrayChanges = Array<any>;
export type ChangeGroup = { [objId: string]: PropChanges };
type PropChanges = { [prop: string]: Changes };

// Changes[0] is oldValue, Changes[1] is newValue
type oldVal = any;
type newVal = any;
type Changes = [oldVal, newVal][];

export type Subscriptions = { [key: string]: Subscription };

export type RemoteCall = {
    remoteCallId: any;
    id: any;
    changes: string; // The string is of type ChangeGroup
    name: string;
    sequence: any;
}

export type Session = {
    subscriptions: Subscriptions;
    sendMessage: SendMessage;
    sendMessageEnabled: boolean;
    remoteCalls: Array<any>;
    pendingRemoteCalls: any;
    nextPendingRemoteCallId: number;
    nextSaveSessionId: number;
    savedSessionId: number;
    nextSubscriptionId: number;
    objects: any;
    nextObjId: number;
    dispenseNextId: null; // not used anywhere
}


export type Sessions = { [sessionId: number]: Session };

export type SendMessage = (message: any) => void;

export type SavedSession = {
    revision: number;
    data: string; // Serialized Session data
    callCount: number;
    referenced: number;
};

export interface RemoteableClass extends Supertype {
    syncStates: Array<string>;
    __toClient__: boolean;
    __toServer__: boolean;
}

type ChangeString = { [key: string]: string };
type PreServerCallChanges = { [key: string]: boolean };

type Controller = {
    /**
     * @server
     *
     * Callback after a successful remote function call (just the application of changes and the execution of the function call)
     * Note that this doesn't mean we can't error out on this or subsequent steps of a remote call.
     *
     * We can utilize this function as a generic function handler to run after we have successfully called a remote function.
     * One such use may be to see the changes that were applied from the client
     *
     * NOTE THAT THE CHANGESTRING DOES NOT INCLUDE CHANGES DONE WITHIN THE REMOTE FUNCTION CALL ITSELF, ONLY CHANGES FROM THE CLIENT
     *
     * See remote call documentation to know where this executes in the lifecycle
     *
     * @param {boolean} hasChanges - Whether or not we have applied client changes onto the server's object graph
     * @param {CallContext} callContext - Context (number of retries etc)
     * @param {changeString} changeString - Object of Changes - Key is [ClassName].[propertyName], Value is [changedValue] example: {'Customer.middlename': 'Karen'}, See above note
     *
     * @returns {Promise<void>}
     * @memberof Controller
     */
    postServerCall?(hasChanges: boolean, callContext: CallContext, changeString: ChangeString): Promise<any>;

    /**
     * @server
     *
     * Callback to handle errors on a remote call.
     *
     * Executes after every other step in the remote call pipeline (see remote call documentation)
     * but before retrying the call (or packaging response and sending back to client)
     *
     * NOTE THAT THE CHANGESTRING DOES NOT INCLUDE CHANGES DONE WITHIN THE REMOTE FUNCTION CALL ITSELF, ONLY CHANGES FROM THE CLIENT
     *
     * @param {ErrorType} errorType - Error type associated (error, retry, response)
     * @param {number} remoteCallId - Id for remote call
     * @param {extends Supertype} remoteObj - Instance for which the remote object function is called for - @TODO: revisit when we create a proper remoteable type
     * @param {string} functionName - Name of function being called
     * @param {CallContext} callContext - Context (number of retries etc)
     * @param {ChangeString} changeString - Object of Changes - Key is [ClassName].[propertyName], Value is [changedValue] example: {'Customer.middlename': 'Karen'}, See above note
     *
     * @returns {Promise<void>}
     * @memberof Controller
     */
    postServerErrorHandler?(errorType: ErrorType, remoteCallId: number, remoteObj: Supertype, functionName: string, callContext: CallContext, changeString: ChangeString): Promise<void>;

    /**
     * @server
     *
     * Callback before a remote function call (1st step of a remote call)
     *
     * We can utilize this function as a generic function handler to run before we call a
     * remote function or before we apply changes from the client to the server
     *
     * We can also utilize this function to do any context-specific prep work / loading
     * if this a subsequent try of this function due to an update conflict.
     *
     * See remote call documentation to know where this executes in the lifecycle
     *
     * @param {boolean} hasChanges - Whether or not we have applied client changes onto the server's object graph
     * @param {PreServerCallChanges} changes - Dictionary of Objects that have been changed from the client
     * @param {CallContext} callContext - Context (number of retries etc)
     * @param {boolean} [forceUpdate] - Optional parameter passed in. True if this is a retry of the call based on an update conflict. False / undefined otherwise.
     *
     * @returns {Promise<void>}
     * @memberof Controller
     */
    preServerCall?(hasChanges: boolean, changes: PreServerCallChanges, callContext: CallContext, forceUpdate?: boolean): Promise<void>;


    syncState?: {
        scope: '+' | '*' | '-'
        state: string
    }
}

export interface Semotus {
    maxCallTime: number;
    __dictionary__: any;
    memSession: { semotus: { callStartTime: number } };
    _injectIntoTemplate: (template) => void;
    serializeAndGarbageCollect: () => any;
    getMessage: (sessionId, forceMessage) => any;
    clearPendingCalls: (sessionId) => void;
    getChangeGroup: (type, subscriptionId) => ChangeGroup;
    deleteChangeGroup: (type: any, subscriptionId: any) => void;
    getChangeStatus: () => string;
    _stashObject: (obj, template) => boolean;
    sessionize: (obj, referencingObj) => (undefined | any);
    _setupFunction: (propertyName, propertyValue, role, validate, serverValidation, template) => (any);
    _setupProperty: (propertyName, defineProperty, objectProperties, defineProperties) => void;
    withoutChangeTracking: (cb) => void;
    _changedValue: (obj, prop, value) => void;
    _referencedArray: (obj, prop, arrayRef, sessionId?) => void;
    _convertArrayReferencesToChanges: () => void;
    MarkChangedArrayReferences: () => void;
    _convertValue: (value) => (any[] | null);
    getObject: (objId, template) => (any | null);
    _applyChanges: (changes, force, subscriptionId, callContext) => (number);
    _applyObjectChanges: (changes, rollback, obj, force) => (boolean);
    _validateServerIncomingProperty: (obj, prop, defineProperty, newValue) => (boolean);
    _applyPropertyChange: (changes, rollback, obj, prop, ix, oldValue, newValue, force) => (boolean);
    _rollback: (rollback) => void;
    _rollbackChanges: () => void;
    _createEmptyObject: (template, objId, defineProperty, isTransient) => any;
    inject: (template, injector) => void;
    _queueRemoteCall: (objId, functionName, deferred, args) => void;
    _processQueue: () => void;
    _toTransport: (obj) => any;
    _fromTransport: (obj) => any;
    _extractArguments: (remoteCall) => any;
    _trimArray: (array) => void;
    _deleteChangeGroups: (type) => void;
    _getSubscriptions: (sessionId?) => Subscriptions | null;
    _getSubscription: (subscriptionId?) => Subscription;
    cleanPrivateValues: (prop, logValue, defineProperty) => (string | any);
    Remoteable: (Base) => () => any;
    Bindable: (Base) => () => any;
    Persistable: (Base) => () => any;
    bindDecorators: (objectTemplate?) => void;
    processMessage: (remoteCall, subscriptionId, restoreSessionCallback) => (undefined | any);
    enableSendMessage: (value, messageCallback, sessionId) => void;
    syncSession: (sessionId) => void;
    restoreSession: (sessionId, savedSession: SavedSession, sendMessage: SendMessage) => boolean;
    saveSession: (sessionId) => SavedSession;
    setMinimumSequence: (nextObjId) => void;
    deleteSession: (sessionId) => void;
    createSession: (role: any, sendMessage: SendMessage, sessionId: any) => any;
    log: (level, data) => void;
    nextObjId: number;
    maxClientSequence: number;
    logLevel: number;
    __conflictMode__: string;
    __changeTracking__: boolean;
    _useGettersSetters: boolean;
    logger: any;
    role: any;
    currentSession: any;
    sessions?: Sessions;
    nextSubscriptionId: number;
    nextSessionId: number;
    controller: Controller;
    changeString: string;


    _getSession(_sid?: any): Session;

    subscribe(role: any): number;

    setSession(sessionId: any): void;

    getChanges(subscriptionId?: any): ChangeGroup;

    _deleteChanges(): void;

    getPendingCallCount(sessionId: any): any;
}
