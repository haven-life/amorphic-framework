import {Supertype} from '../..';
import {CallContext, ChangeString, ErrorType, PreServerCallChanges} from './HelperTypes';

/**
 * Some additional terms
 *
 * @client - Functionality that executes on the client side
 * @server - Functionality that executes on the server side
 *
 * @misnomer - Functionality that may have confusing nomenclature
 *
 * @deprecated - Deprecated functionality that is not used anymore
 */

/**
 * Interface for any controller that wants to utilize the lifecycle methods in Amorphic
 *
 * Should NOT be used independently of IAmorphicAppController
 * Defines optional functionality / callbacks to tap into Amorphic's potential
 *
 * @export
 * @interface ILifecycleController
 */
export interface ILifecycleController {

    /**
    * @client
    *
    * Handler that runs prior to session expiry, or logout
    * Allows the client to determine custom logic to run on session expiration
     *
    * If not implemented, uses default expireController function, defined in client.js
     *
     * Suggestion on implementation:
    *  1) Custom work and utilize to expireController (runs on client), clears the session on client
     *  AND / OR
    *  2) Custom work and utilize amorphic's expireSession which only runs on server (needs to remote in). Clears the session on the server
     *
    * @returns {void}
    */
    publicExpireSession?(): void;

    /**
     * @client
     *
     * Upon a new session ( 1st time or Server restart / expiry )
     * This function will be called to allow the developer a hook to clean up any state on the front end instance of the controller
     *
     * @returns {void}
     * @memberof AmorphicAppController
     */
    shutdown?(): void;

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
     * @param {boolean} forceUpdate -  True if this is a retry of the call based on an update conflict. False / undefined otherwise.
     * @param {boolean} functionName - The function name as a string
     * @returns {Promise<void>}
     * @memberof ILifecycleController
     */
    preServerCall?(hasChanges: boolean, changes: PreServerCallChanges, callContext: CallContext, forceUpdate: undefined | boolean, functionName: string): Promise<void>;

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
     * @param {CallContext} CallContext - Context (number of retries etc)
     * @param {changeString} ChangeString - Object of Changes - Key is [ClassName].[propertyName], Value is [changedValue] example: {'Customer.middlename': 'Karen'}, See above note
     *
     * @returns {Promise<void>}
     * @memberof ILifecycleController
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
     * @misnomer
     *
     * Function that runs at the beginning of the server's lifecycle
     *
     * For daemon / api only applications this is run once, on server start
     *
     * For isomorphic applications this is whenever we're creating a new instance of the base application controller (this) on the server-side
     * ^ This happens whenever we are creating a new session.
     *
     * Note that this function is NOT asynchronous
     *
     * @returns {void}
     * @memberof ILifecycleController
     */
    serverInit?(): void;

    /**
     * @client
     *
     * 'This' is a new controller instance generated for the new session on the front end
     *  This is a hook to set anything up on a new front end controller tied to this new session
     *
     * @param {number} sessionExpiration - The number in ms for the expiration time of a session
     *
     * @returns {void}
     * @memberof AmorphicAppController
     */
    clientInit?(sessionExpiration?: number): void;

    /**
     * @client
     * @deprecated
     *
     * Previous handler for publicExpireSession
     *
     * @returns {void}
     * @memberof AmorphicAppController
     */
    clientExpire?(): void;

}