import {Semotus} from './Types';
import * as Sessions from './Sessions';
import {sync} from "./Sessions";

/**
 * @TODO: Fill out with array change functions, etc.
 */

/**************************** Change Management Functions **********************************/

/**
 * Helper method to check if the specified state exists in this array of syncStates
 * @param state
 * @param syncStates
 */
function checkStates(state: string | undefined, syncStates: Array<string>, scope: '+' | '-') {
    if (!!state) { // If the state is empty or undefined, will sync only templates without syncStates, if state exists, will filter out all that do not have that state in their syncstates
        return syncStates.length === 0; // IF array is empty, THEN default state exists in array. ELSE IF array has any values, returns false
    }
    else {
        if (syncStates.length === 0 && scope === '+') {
            return true; // Return true on empty syncStates array, only if scope is INCLUSIVE
        }
        else {
            return syncStates.includes(state); // IF has state AND does not match array indexes, THEN state does NOT exist
        }
    }
}

/**
 * Returns true if we should filter this property OUT
 * Returns false if we should not filter this property out, and actually accept and change properties on this ref
 *
 * @param defineProperty
 * @param template
 * @param semotus
 */
export function filterOutBySyncState(defineProperty, template, semotus: Semotus): boolean {
    // Check scopes
    // If '*': Everything gets sent (No explicit check for this, just checks for - and +)
    // If '-': Exclusive to syncStates
    // If '+': Inclusive of [default_set, syncState]

    if (semotus.controller.syncState && template) { // We've set the syncState property on the controller, and we have a template
        const {scope, state} = semotus.controller.syncState;
        const syncStates: Array<String> = template.syncStates;

        if (scope === '-' || scope === '+') {
            return !checkStates(state, syncStates, scope);
        } else {  // scope is default '*', or anything not - or +
            return false; // Do not filter this template, do not bother checking syncState
        }
    }
    else {
        return false; // Base case, don't filter anything out
    }
}


/**
 * Helper function to determine if we should not create changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param template
 * @param semotus
 */
export function doNotChange(defineProperty, template, semotus: Semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    } else if (defineProperty.toServer === false && semotus.role === 'client') {
        return true; // If we're trying to send property to the server from client, when prop's toServer == false;
    } else if (defineProperty.toClient === false && semotus.role === 'server') {
        return true; // If we're trying to send property to the client from server, when prop's toClient == false;
    } else if (template.__toServer__ === false && semotus.role == 'client') {
        return true; // If we're trying to send property to the server from client, when the whole template has toServer == false;
    } else if (template.__toClient__ === false && semotus.role === 'server') {
        return true; // If we're trying to send property to the client from server, when the whole template has toClient == false;
    }

    return false;
}


/**
 * Helper function to determine if we should not accept changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param template
 * @param semotus
 */
export function doNotAccept(defineProperty, template, semotus: Semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    } else if (defineProperty.toServer === false && semotus.role === 'server') {
        return true; // If we're trying to accept changes where toServer == false, but we're on the server
    } else if (defineProperty.toClient === false && semotus.role === 'client') {
        return true; // If we're trying to accept changes where toClient is false, but we're on the client
    } else if (template.__toServer__ === false && semotus.role == 'server') {
        return true; // If we're trying to accept changes where template's toServer == false, but we're on the server
    } else if (template.__toClient__ === false && semotus.role === 'client') {
        return true; // If we're trying to accept changes where template's toClient is false, but we're on the client
    }
    return false;
}

/**
 * Determine whether changes should be accepted for a property
 *
 * @param defineProperty unknown
 * @param template unknown
 * @param semotus
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
export function accept(defineProperty, template: any = {}, semotus: Semotus) {
    return !(doNotAccept(defineProperty, template, semotus));
}


/**
 * Determine whether changes need to be created for a property
 *
 * @param defineProperty unknown
 * @param template unknown
 * @param semotus
 *
 * @returns {Boolean} unknown
 *
 * @private
 */

//@TODO: Will this any default = {} cause issues?
export function create(defineProperty, template, semotus: Semotus) {
    return !(doNotChange(defineProperty, template, semotus));
}

/**
 * Determine whether any tracking of old values is needed
 *
 *
 * For a specific property if isLocal is true, it means that the property will never be synced over the wire
 * If toServer === false AND toClient === false, it is another indicator that this property will never be synced over the wire
 * @param defineProperty unknown
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
export function manage(defineProperty) {
    const isLocal = defineProperty.isLocal === true;
    const isLocalAlt = defineProperty.toServer === false && defineProperty.toClient === false;
    return !(isLocal || isLocalAlt);
}


/**
 * Register some of the new property changes / creations to a log
 *
 * @param semotus
 */
export function generate(semotus: Semotus) {
    const session = Sessions.get(semotus);

    for (var obj in session.objects) {
        logChanges(session.objects[obj], semotus);
    }
}

/**
 * Simulate getters and setters by tracking the old value and if it
 * has changed, creating a change log.  local properties are ignored
 * and properties not to be transmitted to the other party do not
 * generate changes but still track the old value so that changes
 * can be applied from the other party
 *
 * @param {unknown} obj - object to be processed
 * @param semotus
 *
 * @private
 */
export function logChanges(obj, semotus: Semotus) {
    // Go through all the properties and transfer them to newly created object
    const props = obj.__template__.getProperties();

    for (var prop in props) {
        const defineProperty = props[prop];
        const type = defineProperty.type;

        if (type && manage(defineProperty)) {
            const createChanges = create(defineProperty, obj.__template__, semotus);

            if (type == Array) {
                if (createChanges) {
                    if (obj['__' + prop] && !obj[prop]) {
                        // switch to null treated like a property change
                        semotus._changedValue(obj, prop, obj[prop]);
                    } else if (obj[prop]) {
                        // switch from null like an array ref where array will be created
                        if (!obj['__' + prop]) {
                            if (obj[prop].length == 0) {
                                // switch to empty array
                                semotus._changedValue(obj, prop, obj[prop]);
                            }

                            obj['__' + prop] = []; // Start from scratch
                        }

                        semotus._referencedArray(obj, prop, obj['__' + prop]);
                    }
                }
            } else {
                const currValue = semotus._convertValue(obj[prop]);
                const prevValue = semotus._convertValue(obj['__' + prop]);

                if (createChanges && currValue !== prevValue) {
                    semotus._changedValue(obj, prop, obj[prop]);
                }

                obj['__' + prop] = obj[prop];
            }
        }
    }
}
