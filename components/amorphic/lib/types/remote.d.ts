import { Supertype } from '../..';

/**
 * A server validation callback that can be passed into the remote decorator for a function.
 *
 * This validator will only be run server-side and before we actually call the associated remote function
 *
 * @param {object} - When you call a remote function on an object, say a generic Controller, the first parameter
 * to this function is that instance itself
 * @param {...args} - These are the same arguments passed into the remote function itself
 * @returns {Promise<boolean>} - True if the validation has passed, and false if it failed
 *
 */
type ServerValidationFunction = (object: Supertype, ...args: any[]) => Promise<boolean>;

type RemoteDecoratorProps = {
	/**
	 * Dictates where this remote function will run. For example, if you say 'server', we package up the changes
	 * and send them from the client to the server, run validations, and then call the function on the server
	 *
	 * This will default to server if you don't define the behavior
	 **/
	on?: 'client' | 'server' | undefined;

	/**
	 * An asynchronous server-side validation callback that executes before we call the remote function on the server,
	 * but after applying any changes from the client. This is server only, and asynchronous.
	 *
	 * @type {ServerValidationFunction}
	 */
	serverValidation?: ServerValidationFunction;

	/**
	 * A synchronous client side validation callback called in the case where code in the browser calls code in the server
	 * and the browser code wishes to validate the input before making the call and throw an error
	 *
	 * This is very useful when used in conjunction with bindster, however Amorphic does not support Bindster
	 * development going forward so please utilize your own validation handler, or use the server side validation handler
	 *
	 * @deprecated
	 */
	validate?: () => boolean;

	/**
	 * Defines the return type of this function (NOT USED ANYMORE)
	 *
	 * @deprecated
	 */
	type?: any;

	/**
	 * Used in place of type, if this function returns an array (NOT USED ANYMORE)
	 *
	 * @deprecated
	 */

	of?: any;
};

type MethodDecoratorType = (target: any, propertyName: string, descriptor: TypedPropertyDescriptor<Function>) => void;

/**
 * Remote functions are used when you want to force execution on one environment over the other.
 * Amorphic will automatically make the associated function call across the wire to the other environment
 *
 * Key Associated terms:
 * Update Conflict - A conflict that arises (thrown) while saving an object or a database record due to discrepencies in the record's version number (as set by persistor)
 *                  1) If two different transactions try to modify the same object / record
 *                  2) If the record/object's version number in the db is different from what is in the application session
 *
 * Force Update - A boolean that determines whether we are retrying a call due to an Update Conflict
 *
 * Aliases for ease of reading:
 * ClassDef - The class definition that's associated with the remote call. If you are calling controller.remoteFunction(), then this would be the Controller class itself
 *
 * Note: Unless otherwise specified, any callbacks are **synchronous**
 *
 * Steps
 *  0) Marshals the changeset and function call over the wire
 *  1) Preserver Call - An asynchronous callback defined in the application's base controller that executes before the call. This preserver hook also takes 'forceUpdate' as a parameter, a boolean marker to indicate if this is a retry
 *  2) Applying  Changes - Apply the changes from to calling environment to the target environment's session. E.g. overlaying any changes to amorphic objects done on the client to the same objects on the server
 *      2a) Validate Server Incoming Object - An object specific validation callback defined either within the base Controller class or within the class of the changed object itself. This is called for each object affected by the remote call but before changes to that object are applied. The only parameter is the object being changed. It either succeeds or throws an error, if the object should not be changed.
 *      2b) Validate Server Incoming Objects - A callback defined on the base controller and only run on the server after we apply all changes from the client, that allows you to validate all the changes. Either succeeds or throws an error if invalid
 *  3) Validate Server Call - A callback defined within a ClassDef, which allows generic validation on any of this ClassDef's remote function calls. Returns a boolean (true if success, false if failure).
 *  4) Custom Validation - Where we run asynchronous function specific validation callbacks, which you can define in the remote decorator of the function being called. Is boolean
 *  5) Function Call - The actual function call
 *  6) Post Server Call - An asynchronous callback defined on the base controller that executes after successfully calling the remote function
 *  7) (Optional) Error - If update conflict retry with force update as true, otherwise return error to the client
 * 		7a) (Optional) PostServerErrorHandler - Optional callback defined within a controller that runs after error is thrown
 *  8) Send changes back to original caller
 *
 * @export
 * @param {RemoteDecoratorProps} [props]
 * @returns {MethodDecoratorType}
 */
export function remote(props?: RemoteDecoratorProps): MethodDecoratorType;
