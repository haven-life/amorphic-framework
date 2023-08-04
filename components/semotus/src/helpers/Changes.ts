import { RemoteableClass, Semotus } from './Types';
import * as Sessions from './Sessions';

/**
 * @TODO: Fill out with array change functions, etc.
 */

/**************************** Change Management Functions **********************************/

function controllerHasSyncState(semotus: Semotus): boolean {
    return !!(semotus.role === 'server' && semotus.controller && semotus.controller.syncState);
}

export function isIsolatedObject(semotus: Semotus, obj): boolean {
    if (objectOnClientOnly(semotus, obj)) {
        return true;
    }
    else if (objectOnServerOnly(semotus, obj)) {
        return true;
    }
    else if (obj.__template__.syncStates && controllerHasSyncState(semotus)) {
        return filterSyncStates(obj.__template__, semotus);
    }
    else {
        return false;
    }
}

export function objectOnClientOnly(semotus: Semotus, obj) {
    return semotus.role == 'client' && obj.__template__.__toServer__ === false;
}

export function objectOnServerOnly(semotus: Semotus, obj) {
    return semotus.role == 'server' && obj.__template__.__toClient__ === false;
}


/**
 * Helper method to check if the specified state exists in this array of syncStates
 * @param state
 * @param syncStates
 * @param scope
 */
function hasState(state: string | undefined, syncStates: Array<string>, scope: '+' | '-') {
    // If the state is empty string, null, or undefined, will sync only semotusClass without syncStates, if state exists, will filter out all that do not have that state in their syncStates
    if (!state) {
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
 *    Scope values:
 *    If '*': Everything gets sent (No explicit check for this, just checks for - and +)
 *    If '-': Exclusive to syncStates
 *    If '+': Inclusive of [default_set, syncState]
 * @param semotusClass
 * @param semotus
 */
function filterSyncStates(semotusClass: RemoteableClass, semotus: Semotus): boolean {
    const {scope, state} = semotus.controller.syncState || {};
    const syncStates: Array<string> = semotusClass.syncStates;

    if (semotus.controller.__template__ === semotusClass) { // Don't filter out the controller
        return false;
    }

    if (scope === '-' || scope === '+') {
        return !hasState(state, syncStates, scope);
    }
    else {  // scope is default '*', or anything not - or +
        return false; // Do not filter this semotusClass, do not bother checking syncState
    }
}

/**
 * Helper function to determine if we should NOT create changes for the property this defineProperty metadata is associated with
 *
 * No need to check syncStates here since this is only called when
 * 1) Reading the static typescript
 * 2) On the client side
 *
 * @param defineProperty
 * @param semotusClass
 * @param semotus
 */
export function doNotChange(defineProperty, semotusClass:  RemoteableClass | undefined, semotus: Semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    }
    else if (defineProperty.toServer === false && semotus.role === 'client') {
        return true; // If we're trying to send property to the server from client, when prop's toServer == false;
    }
    else if (defineProperty.toClient === false && semotus.role === 'server') {
        return true; // If we're trying to send property to the client from server, when prop's toClient == false;
    }
    else if (semotusClass) { // Dealing with an actual semotus class
        if (semotusClass.__toServer__ === false && semotus.role == 'client') {
            return true; // If we're trying to send property to the server from client, when the whole semotusClass has toServer == false;
        }
        else if (semotusClass.__toClient__ === false && semotus.role === 'server') {
            return true; // If we're trying to send property to the client from server, when the whole semotusClass has toClient == false;
        }
    }

    return false;
}


/**
 * Helper function to determine if we should not accept changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param semotusClass
 * @param semotus
 */
export function doNotAccept(defineProperty, semotusClass: RemoteableClass, semotus: Semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    }
    else if (defineProperty.toServer === false && semotus.role === 'server') {
        return true; // If we're trying to accept changes where toServer == false, but we're on the server
    }
    else if (defineProperty.toClient === false && semotus.role === 'client') {
        return true; // If we're trying to accept changes where toClient is false, but we're on the client
    }
    else if (semotusClass.__toServer__ === false && semotus.role == 'server') {
        return true; // If we're trying to accept changes where semotusClass's toServer == false, but we're on the server
    }
    else if (semotusClass.__toClient__ === false && semotus.role === 'client') {
        return true; // If we're trying to accept changes where semotusClass's toClient is false, but we're on the client
    }
    else if (controllerHasSyncState(semotus)) { // We've set the syncState property on the controller, and we have a semotusClass
        return filterSyncStates(semotusClass, semotus);
    }

    return false;
}

/**
 * Determine whether changes should be accepted for a property
 *
 * @param defineProperty unknown
 * @param semotusClass unknown
 * @param semotus
 *
 * @returns {Boolean} unknown
 *
 * @private
 */
export function accept(defineProperty, semotusClass: RemoteableClass, semotus: Semotus) {
    return !(doNotAccept(defineProperty, semotusClass, semotus));
}


/**
 * Determine whether changes need to be created for a property
 *
 * @param defineProperty unknown
 * @param semotusClass unknown
 * @param semotus
 *
 * @returns {Boolean} unknown
 *
 * @private
 */

export function create(defineProperty, semotusClass: RemoteableClass | undefined, semotus: Semotus) {
    return !(doNotChange(defineProperty, semotusClass, semotus));
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

    for (const obj in session.objects) {
        logChanges(session.objects[obj], semotus);
    }
}

/**
 * Delete session objects for tests, because unit tests for client object erroneously have server session objects
 */
export function clearClientSession(semotus: Semotus, controller) {
    const session = Sessions.get(semotus);

    for (const obj in session.objects) {
        if (obj !== controller.__id__) {
            delete session.objects[obj];
        }
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
 * ONLY CALLED FROM CLIENT
 */
export function logChanges(obj, semotus: Semotus) {
    // Go through all the properties and transfer them to newly created object
    const props = obj.__template__.getProperties();

    for (const prop in props) {
        const defineProperty = props[prop];
        const type = defineProperty.type;

        if (type && manage(defineProperty)) {
            const createChanges = create(defineProperty, obj.__template__, semotus);

            if (type == Array) {
                if (createChanges) {
                    if (obj[`__${prop}`] && !obj[prop]) {
                        // switch to null treated like a property change
                        semotus._changedValue(obj, prop, obj[prop]);
                    } else if (obj[prop]) {
                        // switch from null like an array ref where array will be created
                        if (!obj[`__${prop}`]) {
                            if (obj[prop].length == 0) {
                                // switch to empty array
                                semotus._changedValue(obj, prop, obj[prop]);
                            }

                            obj[`__${prop}`] = []; // Start from scratch
                        }

                        semotus._referencedArray(obj, prop, obj[`__${prop}`]);
                    }
                }
            } else {
                const currValue = semotus._convertValue(obj[prop]);
                const prevValue = semotus._convertValue(obj[`__${prop}`]);

                if (createChanges && currValue !== prevValue) {
                    semotus._changedValue(obj, prop, obj[prop]);
                }

                obj[`__${prop}`] = obj[prop];
            }
        }
    }
}
