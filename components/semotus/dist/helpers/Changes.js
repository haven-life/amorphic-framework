"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Sessions = require("./Sessions");
/**
 * @TODO: Fill out with array change functions, etc.
 */
/**************************** Change Management Functions **********************************/
/**
 * Helper function to determine if we should not create changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param template
 * @param semotus
 */
function doNotChange(defineProperty, template, semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    }
    else if (defineProperty.toServer === false && semotus.role === 'client') {
        return true; // If we're trying to send property to the server from client, when prop's toServer == false;
    }
    else if (defineProperty.toClient === false && semotus.role === 'server') {
        return true; // If we're trying to send property to the client from server, when prop's toClient == false;
    }
    else if (template.__toServer__ === false && semotus.role == 'client') {
        return true; // If we're trying to send property to the server from client, when the whole template has toServer == false;
    }
    else if (template.__toClient__ === false && semotus.role === 'server') {
        return true; // If we're trying to send property to the client from server, when the whole template has toClient == false;
    }
    return false;
}
exports.doNotChange = doNotChange;
/**
 * Helper function to determine if we should not accept changes for the property this defineProperty metadata is associated with
 *
 *
 * @param defineProperty
 * @param template
 * @param semotus
 */
function doNotAccept(defineProperty, template, semotus) {
    if (defineProperty.isLocal) { // If we've defined the property as local to where it's created / modified
        return true;
    }
    else if (defineProperty.toServer === false && semotus.role === 'server') {
        return true; // If we're trying to accept changes where toServer == false, but we're on the server
    }
    else if (defineProperty.toClient === false && semotus.role === 'client') {
        return true; // If we're trying to accept changes where toClient is false, but we're on the client
    }
    else if (template.__toServer__ === false && semotus.role == 'server') {
        return true; // If we're trying to accept changes where template's toServer == false, but we're on the server
    }
    else if (template.__toClient__ === false && semotus.role === 'client') {
        return true; // If we're trying to accept changes where template's toClient is false, but we're on the client
    }
    return false;
}
exports.doNotAccept = doNotAccept;
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
function accept(defineProperty, template, semotus) {
    if (template === void 0) { template = {}; }
    return !(doNotAccept(defineProperty, template, semotus));
}
exports.accept = accept;
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
function create(defineProperty, template, semotus) {
    if (template === void 0) { template = {}; }
    return !(doNotChange(defineProperty, template, semotus));
}
exports.create = create;
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
function manage(defineProperty) {
    var isLocal = defineProperty.isLocal === true;
    var isLocalAlt = defineProperty.toServer === false && defineProperty.toClient === false;
    return !(isLocal || isLocalAlt);
}
exports.manage = manage;
/**
 * Register some of the new property changes / creations to a log
 *
 * @param semotus
 */
function generate(semotus) {
    var session = Sessions.get(semotus);
    for (var obj in session.objects) {
        logChanges(session.objects[obj], semotus);
    }
}
exports.generate = generate;
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
function logChanges(obj, semotus) {
    // Go through all the properties and transfer them to newly created object
    var props = obj.__template__.getProperties();
    for (var prop in props) {
        var defineProperty = props[prop];
        var type = defineProperty.type;
        if (type && manage(defineProperty)) {
            var createChanges = create(defineProperty, obj.__template__, semotus);
            if (type == Array) {
                if (createChanges) {
                    if (obj['__' + prop] && !obj[prop]) {
                        // switch to null treated like a property change
                        semotus._changedValue(obj, prop, obj[prop]);
                    }
                    else if (obj[prop]) {
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
            }
            else {
                var currValue = semotus._convertValue(obj[prop]);
                var prevValue = semotus._convertValue(obj['__' + prop]);
                if (createChanges && currValue !== prevValue) {
                    semotus._changedValue(obj, prop, obj[prop]);
                }
                obj['__' + prop] = obj[prop];
            }
        }
    }
}
exports.logChanges = logChanges;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbmdlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oZWxwZXJzL0NoYW5nZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxxQ0FBdUM7QUFFdkM7O0dBRUc7QUFFSCw2RkFBNkY7QUFFN0Y7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxFQUFFLE9BQWdCO0lBQ2xFLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLDBFQUEwRTtRQUNwRyxPQUFPLElBQUksQ0FBQztLQUNmO1NBQU0sSUFBSSxjQUFjLENBQUMsUUFBUSxLQUFLLEtBQUssSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtRQUN2RSxPQUFPLElBQUksQ0FBQyxDQUFDLDZGQUE2RjtLQUM3RztTQUFNLElBQUksY0FBYyxDQUFDLFFBQVEsS0FBSyxLQUFLLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7UUFDdkUsT0FBTyxJQUFJLENBQUMsQ0FBQyw2RkFBNkY7S0FDN0c7U0FBTSxJQUFJLFFBQVEsQ0FBQyxZQUFZLEtBQUssS0FBSyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksUUFBUSxFQUFFO1FBQ3BFLE9BQU8sSUFBSSxDQUFDLENBQUMsNkdBQTZHO0tBQzdIO1NBQU0sSUFBSSxRQUFRLENBQUMsWUFBWSxLQUFLLEtBQUssSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTtRQUNyRSxPQUFPLElBQUksQ0FBQyxDQUFDLDZHQUE2RztLQUM3SDtJQUVELE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUM7QUFkRCxrQ0FjQztBQUdEOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixXQUFXLENBQUMsY0FBYyxFQUFFLFFBQVEsRUFBRSxPQUFnQjtJQUNsRSxJQUFJLGNBQWMsQ0FBQyxPQUFPLEVBQUUsRUFBRSwwRUFBMEU7UUFDcEcsT0FBTyxJQUFJLENBQUM7S0FDZjtTQUFN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QzthQUNoQztTQUNKO0tBQ0o7QUFDTCxDQUFDO0FBMUNELGdDQTBDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U2Vtb3R1c30gZnJvbSAnLi9UeXBlcyc7XG5pbXBvcnQgKiBhcyBTZXNzaW9ucyBmcm9tICcuL1Nlc3Npb25zJztcblxuLyoqXG4gKiBAVE9ETzogRmlsbCBvdXQgd2l0aCBhcnJheSBjaGFuZ2UgZnVuY3Rpb25zLCBldGMuXG4gKi9cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKiogQ2hhbmdlIE1hbmFnZW1lbnQgRnVuY3Rpb25zICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIHRvIGRldGVybWluZSBpZiB3ZSBzaG91bGQgbm90IGNyZWF0ZSBjaGFuZ2VzIGZvciB0aGUgcHJvcGVydHkgdGhpcyBkZWZpbmVQcm9wZXJ0eSBtZXRhZGF0YSBpcyBhc3NvY2lhdGVkIHdpdGhcbiAqXG4gKlxuICogQHBhcmFtIGRlZmluZVByb3BlcnR5XG4gKiBAcGFyYW0gdGVtcGxhdGVcbiAqIEBwYXJhbSBzZW1vdHVzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkb05vdENoYW5nZShkZWZpbmVQcm9wZXJ0eSwgdGVtcGxhdGUsIHNlbW90dXM6IFNlbW90dXMpIHtcbiAgICBpZiAoZGVmaW5lUHJvcGVydHkuaXNMb2NhbCkgeyAvLyBJZiB3ZSd2ZSBkZWZpbmVkIHRoZSBwcm9wZXJ0eSBhcyBsb2NhbCB0byB3aGVyZSBpdCdzIGNyZWF0ZWQgLyBtb2RpZmllZFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGRlZmluZVByb3BlcnR5LnRvU2VydmVyID09PSBmYWxzZSAmJiBzZW1vdHVzLnJvbGUgPT09ICdjbGllbnQnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJZiB3ZSdyZSB0cnlpbmcgdG8gc2VuZCBwcm9wZXJ0eSB0byB0aGUgc2VydmVyIGZyb20gY2xpZW50LCB3aGVuIHByb3AncyB0b1NlcnZlciA9PSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGRlZmluZVByb3BlcnR5LnRvQ2xpZW50ID09PSBmYWxzZSAmJiBzZW1vdHVzLnJvbGUgPT09ICdzZXJ2ZXInKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJZiB3ZSdyZSB0cnlpbmcgdG8gc2VuZCBwcm9wZXJ0eSB0byB0aGUgY2xpZW50IGZyb20gc2VydmVyLCB3aGVuIHByb3AncyB0b0NsaWVudCA9PSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKHRlbXBsYXRlLl9fdG9TZXJ2ZXJfXyA9PT0gZmFsc2UgJiYgc2Vtb3R1cy5yb2xlID09ICdjbGllbnQnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJZiB3ZSdyZSB0cnlpbmcgdG8gc2VuZCBwcm9wZXJ0eSB0byB0aGUgc2VydmVyIGZyb20gY2xpZW50LCB3aGVuIHRoZSB3aG9sZSB0ZW1wbGF0ZSBoYXMgdG9TZXJ2ZXIgPT0gZmFsc2U7XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5fX3RvQ2xpZW50X18gPT09IGZhbHNlICYmIHNlbW90dXMucm9sZSA9PT0gJ3NlcnZlcicpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIElmIHdlJ3JlIHRyeWluZyB0byBzZW5kIHByb3BlcnR5IHRvIHRoZSBjbGllbnQgZnJvbSBzZXJ2ZXIsIHdoZW4gdGhlIHdob2xlIHRlbXBsYXRlIGhhcyB0b0NsaWVudCA9PSBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGlmIHdlIHNob3VsZCBub3QgYWNjZXB0IGNoYW5nZXMgZm9yIHRoZSBwcm9wZXJ0eSB0aGlzIGRlZmluZVByb3BlcnR5IG1ldGFkYXRhIGlzIGFzc29jaWF0ZWQgd2l0aFxuICpcbiAqXG4gKiBAcGFyYW0gZGVmaW5lUHJvcGVydHlcbiAqIEBwYXJhbSB0ZW1wbGF0ZVxuICogQHBhcmFtIHNlbW90dXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvTm90QWNjZXB0KGRlZmluZVByb3BlcnR5LCB0ZW1wbGF0ZSwgc2Vtb3R1czogU2Vtb3R1cykge1xuICAgIGlmIChkZWZpbmVQcm9wZXJ0eS5pc0xvY2FsKSB7IC8vIElmIHdlJ3ZlIGRlZmluZWQgdGhlIHByb3BlcnR5IGFzIGxvY2FsIHRvIHdoZXJlIGl0J3MgY3JlYXRlZCAvIG1vZGlmaWVkXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZiAoZGVmaW5lUHJvcGVydHkudG9TZXJ2ZXIgPT09IGZhbHNlICYmIHNlbW90dXMucm9sZSA9PT0gJ3NlcnZlcicpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIElmIHdlJ3JlIHRyeWluZyB0byBhY2NlcHQgY2hhbmdlcyB3aGVyZSB0b1NlcnZlciA9PSBmYWxzZSwgYnV0IHdlJ3JlIG9uIHRoZSBzZXJ2ZXJcbiAgICB9IGVsc2UgaWYgKGRlZmluZVByb3BlcnR5LnRvQ2xpZW50ID09PSBmYWxzZSAmJiBzZW1vdHVzLnJvbGUgPT09ICdjbGllbnQnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBJZiB3ZSdyZSB0cnlpbmcgdG8gYWNjZXB0IGNoYW5nZXMgd2hlcmUgdG9DbGllbnQgaXMgZmFsc2UsIGJ1dCB3ZSdyZSBvbiB0aGUgY2xpZW50XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5fX3RvU2VydmVyX18gPT09IGZhbHNlICYmIHNlbW90dXMucm9sZSA9PSAnc2VydmVyJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gSWYgd2UncmUgdHJ5aW5nIHRvIGFjY2VwdCBjaGFuZ2VzIHdoZXJlIHRlbXBsYXRlJ3MgdG9TZXJ2ZXIgPT0gZmFsc2UsIGJ1dCB3ZSdyZSBvbiB0aGUgc2VydmVyXG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZS5fX3RvQ2xpZW50X18gPT09IGZhbHNlICYmIHNlbW90dXMucm9sZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIElmIHdlJ3JlIHRyeWluZyB0byBhY2NlcHQgY2hhbmdlcyB3aGVyZSB0ZW1wbGF0ZSdzIHRvQ2xpZW50IGlzIGZhbHNlLCBidXQgd2UncmUgb24gdGhlIGNsaWVudFxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIHdoZXRoZXIgY2hhbmdlcyBzaG91bGQgYmUgYWNjZXB0ZWQgZm9yIGEgcHJvcGVydHlcbiAqXG4gKiBAcGFyYW0gZGVmaW5lUHJvcGVydHkgdW5rbm93blxuICogQHBhcmFtIHRlbXBsYXRlIHVua25vd25cbiAqIEBwYXJhbSBzZW1vdHVzXG4gKlxuICogQHJldHVybnMge0Jvb2xlYW59IHVua25vd25cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gYWNjZXB0KGRlZmluZVByb3BlcnR5LCB0ZW1wbGF0ZTogYW55ID0ge30sIHNlbW90dXM6IFNlbW90dXMpIHtcbiAgICByZXR1cm4gIShkb05vdEFjY2VwdChkZWZpbmVQcm9wZXJ0eSwgdGVtcGxhdGUsIHNlbW90dXMpKTtcbn1cblxuXG4vKipcbiAqIERldGVybWluZSB3aGV0aGVyIGNoYW5nZXMgbmVlZCB0byBiZSBjcmVhdGVkIGZvciBhIHByb3BlcnR5XG4gKlxuICogQHBhcmFtIGRlZmluZVByb3BlcnR5IHVua25vd25cbiAqIEBwYXJhbSB0ZW1wbGF0ZSB1bmtub3duXG4gKiBAcGFyYW0gc2Vtb3R1c1xuICpcbiAqIEByZXR1cm5zIHtCb29sZWFufSB1bmtub3duXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShkZWZpbmVQcm9wZXJ0eSwgdGVtcGxhdGU6IGFueSA9IHt9LCBzZW1vdHVzOiBTZW1vdHVzKSB7XG4gICAgcmV0dXJuICEoZG9Ob3RDaGFuZ2UoZGVmaW5lUHJvcGVydHksIHRlbXBsYXRlLCBzZW1vdHVzKSk7XG59XG5cblxuLyoqXG4gKiBEZXRlcm1pbmUgd2hldGhlciBhbnkgdHJhY2tpbmcgb2Ygb2xkIHZhbHVlcyBpcyBuZWVkZWRcbiAqXG4gKlxuICogRm9yIGEgc3BlY2lmaWMgcHJvcGVydHkgaWYgaXNMb2NhbCBpcyB0cnVlLCBpdCBtZWFucyB0aGF0IHRoZSBwcm9wZXJ0eSB3aWxsIG5ldmVyIGJlIHN5bmNlZCBvdmVyIHRoZSB3aXJlXG4gKiBJZiB0b1NlcnZlciA9PT0gZmFsc2UgQU5EIHRvQ2xpZW50ID09PSBmYWxzZSwgaXQgaXMgYW5vdGhlciBpbmRpY2F0b3IgdGhhdCB0aGlzIHByb3BlcnR5IHdpbGwgbmV2ZXIgYmUgc3luY2VkIG92ZXIgdGhlIHdpcmVcbiAqIEBwYXJhbSBkZWZpbmVQcm9wZXJ0eSB1bmtub3duXG4gKlxuICogQHJldHVybnMge0Jvb2xlYW59IHVua25vd25cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFuYWdlKGRlZmluZVByb3BlcnR5KSB7XG4gICAgY29uc3QgaXNMb2NhbCA9IGRlZmluZVByb3BlcnR5LmlzTG9jYWwgPT09IHRydWU7XG4gICAgY29uc3QgaXNMb2NhbEFsdCA9IGRlZmluZVByb3BlcnR5LnRvU2VydmVyID09PSBmYWxzZSAmJiBkZWZpbmVQcm9wZXJ0eS50b0NsaWVudCA9PT0gZmFsc2U7XG4gICAgcmV0dXJuICEoaXNMb2NhbCB8fCBpc0xvY2FsQWx0KTtcbn1cblxuXG4vKipcbiAqIFJlZ2lzdGVyIHNvbWUgb2YgdGhlIG5ldyBwcm9wZXJ0eSBjaGFuZ2VzIC8gY3JlYXRpb25zIHRvIGEgbG9nXG4gKlxuICogQHBhcmFtIHNlbW90dXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlKHNlbW90dXM6IFNlbW90dXMpIHtcbiAgICBjb25zdCBzZXNzaW9uID0gU2Vzc2lvbnMuZ2V0KHNlbW90dXMpO1xuXG4gICAgZm9yICh2YXIgb2JqIGluIHNlc3Npb24ub2JqZWN0cykge1xuICAgICAgICBsb2dDaGFuZ2VzKHNlc3Npb24ub2JqZWN0c1tvYmpdLCBzZW1vdHVzKTtcbiAgICB9XG59XG5cbi8qKlxuICogU2ltdWxhdGUgZ2V0dGVycyBhbmQgc2V0dGVycyBieSB0cmFja2luZyB0aGUgb2xkIHZhbHVlIGFuZCBpZiBpdFxuICogaGFzIGNoYW5nZWQsIGNyZWF0aW5nIGEgY2hhbmdlIGxvZy4gIGxvY2FsIHByb3BlcnRpZXMgYXJlIGlnbm9yZWRcbiAqIGFuZCBwcm9wZXJ0aWVzIG5vdCB0byBiZSB0cmFuc21pdHRlZCB0byB0aGUgb3RoZXIgcGFydHkgZG8gbm90XG4gKiBnZW5lcmF0ZSBjaGFuZ2VzIGJ1dCBzdGlsbCB0cmFjayB0aGUgb2xkIHZhbHVlIHNvIHRoYXQgY2hhbmdlc1xuICogY2FuIGJlIGFwcGxpZWQgZnJvbSB0aGUgb3RoZXIgcGFydHlcbiAqXG4gKiBAcGFyYW0ge3Vua25vd259IG9iaiAtIG9iamVjdCB0byBiZSBwcm9jZXNzZWRcbiAqIEBwYXJhbSBzZW1vdHVzXG4gKlxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ0NoYW5nZXMob2JqLCBzZW1vdHVzOiBTZW1vdHVzKSB7XG4gICAgLy8gR28gdGhyb3VnaCBhbGwgdGhlIHByb3BlcnRpZXMgYW5kIHRyYW5zZmVyIHRoZW0gdG8gbmV3bHkgY3JlYXRlZCBvYmplY3RcbiAgICBjb25zdCBwcm9wcyA9IG9iai5fX3RlbXBsYXRlX18uZ2V0UHJvcGVydGllcygpO1xuXG4gICAgZm9yICh2YXIgcHJvcCBpbiBwcm9wcykge1xuICAgICAgICBjb25zdCBkZWZpbmVQcm9wZXJ0eSA9IHByb3BzW3Byb3BdO1xuICAgICAgICBjb25zdCB0eXBlID0gZGVmaW5lUHJvcGVydHkudHlwZTtcblxuICAgICAgICBpZiAodHlwZSAmJiBtYW5hZ2UoZGVmaW5lUHJvcGVydHkpKSB7XG4gICAgICAgICAgICBjb25zdCBjcmVhdGVDaGFuZ2VzID0gY3JlYXRlKGRlZmluZVByb3BlcnR5LCBvYmouX190ZW1wbGF0ZV9fLCBzZW1vdHVzKTtcblxuICAgICAgICAgICAgaWYgKHR5cGUgPT0gQXJyYXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoY3JlYXRlQ2hhbmdlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAob2JqWydfXycgKyBwcm9wXSAmJiAhb2JqW3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzd2l0Y2ggdG8gbnVsbCB0cmVhdGVkIGxpa2UgYSBwcm9wZXJ0eSBjaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbW90dXMuX2NoYW5nZWRWYWx1ZShvYmosIHByb3AsIG9ialtwcm9wXSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAob2JqW3Byb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzd2l0Y2ggZnJvbSBudWxsIGxpa2UgYW4gYXJyYXkgcmVmIHdoZXJlIGFycmF5IHdpbGwgYmUgY3JlYXRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvYmpbJ19fJyArIHByb3BdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9ialtwcm9wXS5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzd2l0Y2ggdG8gZW1wdHkgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vtb3R1cy5fY2hhbmdlZFZhbHVlKG9iaiwgcHJvcCwgb2JqW3Byb3BdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpbJ19fJyArIHByb3BdID0gW107IC8vIFN0YXJ0IGZyb20gc2NyYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW1vdHVzLl9yZWZlcmVuY2VkQXJyYXkob2JqLCBwcm9wLCBvYmpbJ19fJyArIHByb3BdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VyclZhbHVlID0gc2Vtb3R1cy5fY29udmVydFZhbHVlKG9ialtwcm9wXSk7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldlZhbHVlID0gc2Vtb3R1cy5fY29udmVydFZhbHVlKG9ialsnX18nICsgcHJvcF0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKGNyZWF0ZUNoYW5nZXMgJiYgY3VyclZhbHVlICE9PSBwcmV2VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vtb3R1cy5fY2hhbmdlZFZhbHVlKG9iaiwgcHJvcCwgb2JqW3Byb3BdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvYmpbJ19fJyArIHByb3BdID0gb2JqW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuIl19