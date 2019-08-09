import { Supertype } from '../..';
import { Changes, CallContext, NewValue } from './HelperTypes';

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
 * Interface for any controller that wants to utilize the validation methods in Amorphic
 *
 * Should NOT be used independently of IAmorphicAppController
 * Defines optional functionality / callbacks to tap into Amorphic's potential
 * @export
 * @interface IValidationController
 */
export interface IValidationController {

    /**
     * @server
     * 
     * This is a user - defined validation callbackthat happens after we apply object changes from the client to the server
     * 
     * If there is a need to audit any incoming changes or disallow changes this hook allows you to do so.
     * 
     * This function either does not return anything, or throws an error
     * 
     * If there is an error we rollback changes on the server
     *
     * @param {Changes} changes - A list of all the changes coming through from the client
     * @param {CallContext} callContext - The call context
     * @returns {(never | void)} - This should either not return anything, or throw an error
     * @memberof IValidationController
     */
    validateServerIncomingObjects?(changes: Changes, callContext: CallContext): never | void;

    /**
     * @server
     * 
     * This is another user-defined validation callback that happens BEFORE we apply object changes from the client to the server
     * for EACH object.
     * 
     * If there is a need to audit this specific object or disallow changes this hook allows you to do so.
     * 
     * This function either does not return anything, or throws an error
     * 
     * If there is an error we rollback changes on the server
     * 
     * @param {Supertype} obj - The supertype object that we are trying to change
     * @returns {(never | void)} - This should either not return anything, or throw an error
     * @memberof IValidationController
     */
    validateServerIncomingObject?(obj: Supertype): never | void;

    /**
     * @server
     * 
     * This is another user-defined validation callback that happens after we apply all object changes from the client on the server
     * But before we actually execute the remote function, so we can check to see if this particular function is even allowed to be called.
     *
     * @param {string} functionName - The name of the remote function being called
     * @param {CallContext} callContext - The call context
     * 
     * @returns {Promise<boolean>} - Returns promise that either contains True if valid, and False if invalid
     * @memberof IValidationController
     */
    validateServerCall?(functionName: string, callContext: CallContext): Promise<boolean>;

    /**
     * @server
     *
     * This is another user-defined validation callback that happens BEFORE we apply object changes from the client to the server
     * for EACH object. This runs ONCE FOR EVERY PROPERTY BEING CHANGED.
     * 
     * This validation allows you to validate on a more granular level on each property change of a specific object
     * 
     * If there is a need to audit this specific object or disallow changes this hook allows you to do so.
     * 
     * This function either does not return anything, or throws an error
     * 
     * If there is an error we rollback changes on the server
     * 
     * @param {Supertype} obj - Supertype object whose properties we are changing
     * @param {string} prop - The property name
     * @param {*} defineProperty - The object that defined in the @property decorator for this property. For example, @property({toClient: true, toServer:false}) will return {toClient: true, toServer: false}
     * @param {NewValue} newValue - The new value assigned for this property 
     * 
     * @returns {(never | void)} - This should either not return anything, or throw an error
     * @memberof IValidationController
     */
    validateServerIncomingProperty?(obj: Supertype, prop: string, defineProperty: any, newValue: NewValue): never | void;

}