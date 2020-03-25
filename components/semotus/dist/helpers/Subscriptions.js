"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Sessions = require("./Sessions");
/**
 * Purpose unknown
 *
 * @param semotus
 * @param {unknown} subscriptionId unknown
 *
 * @returns {unknown} unknown
 *
 * @private
 */
function getSubscription(semotus, subscriptionId) {
    return Sessions.get(semotus).subscriptions[subscriptionId || 0];
}
exports.getSubscription = getSubscription;
/**
 * Purpose unknown
 *
 * @param semotus
 * @param {unknown} sessionId unknown
 *
 * @returns {unknown} unknown
 *
 * @private
 */
function getSubscriptions(semotus, sessionId) {
    var session = Sessions.get(semotus, sessionId);
    if (session) {
        return session.subscriptions;
    }
    else {
        return null;
    }
}
exports.getSubscriptions = getSubscriptions;
/**
 * Subscribe to changes and optionally establish subscription as the
 * sole recipient of remote call messages.  Change tracking is then managed
 * by the functions that follow.
 *
 * @param semotus
 * @param {unknown} role unknown
 *
 * @returns {*} unknown
 */
function subscribe(semotus, role) {
    var session = Sessions.get(semotus);
    var subscriptionId = session.nextSubscriptionId++;
    session.subscriptions[subscriptionId] = {
        role: role,
        log: {
            array: {},
            change: {},
            arrayDirty: {}
        }
    };
    return subscriptionId;
}
exports.subscribe = subscribe;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3Vic2NyaXB0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9oZWxwZXJzL1N1YnNjcmlwdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBdUM7QUFHdkM7Ozs7Ozs7OztHQVNHO0FBRUgsU0FBZ0IsZUFBZSxDQUFDLE9BQWdCLEVBQUUsY0FBZTtJQUM3RCxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDO0FBRkQsMENBRUM7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxPQUFnQixFQUFFLFNBQVU7SUFDekQsSUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFakQsSUFBSSxPQUFPLEVBQUU7UUFDVCxPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUM7S0FDaEM7U0FBTTtRQUNILE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFDTCxDQUFDO0FBUkQsNENBUUM7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxTQUFnQixTQUFTLENBQUMsT0FBZ0IsRUFBRSxJQUFJO0lBQzVDLElBQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsSUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFFcEQsT0FBTyxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsR0FBRztRQUNwQyxJQUFJLEVBQUUsSUFBSTtRQUNWLEdBQUcsRUFBRTtZQUNELEtBQUssRUFBRSxFQUFFO1lBQ1QsTUFBTSxFQUFFLEVBQUU7WUFDVixVQUFVLEVBQUUsRUFBRTtTQUNqQjtLQUNKLENBQUM7SUFFRixPQUFPLGNBQWMsQ0FBQztBQUMxQixDQUFDO0FBZEQsOEJBY0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBTZXNzaW9ucyBmcm9tICcuL1Nlc3Npb25zJztcbmltcG9ydCB7U2Vtb3R1cywgU3Vic2NyaXB0aW9uLCBTdWJzY3JpcHRpb25zfSBmcm9tICcuL1R5cGVzJztcblxuLyoqXG4gKiBQdXJwb3NlIHVua25vd25cbiAqXG4gKiBAcGFyYW0gc2Vtb3R1c1xuICogQHBhcmFtIHt1bmtub3dufSBzdWJzY3JpcHRpb25JZCB1bmtub3duXG4gKlxuICogQHJldHVybnMge3Vua25vd259IHVua25vd25cbiAqXG4gKiBAcHJpdmF0ZVxuICovXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdWJzY3JpcHRpb24oc2Vtb3R1czogU2Vtb3R1cywgc3Vic2NyaXB0aW9uSWQ/KTogU3Vic2NyaXB0aW9uIHtcbiAgICByZXR1cm4gU2Vzc2lvbnMuZ2V0KHNlbW90dXMpLnN1YnNjcmlwdGlvbnNbc3Vic2NyaXB0aW9uSWQgfHwgMF07XG59XG5cbi8qKlxuICogUHVycG9zZSB1bmtub3duXG4gKlxuICogQHBhcmFtIHNlbW90dXNcbiAqIEBwYXJhbSB7dW5rbm93bn0gc2Vzc2lvbklkIHVua25vd25cbiAqXG4gKiBAcmV0dXJucyB7dW5rbm93bn0gdW5rbm93blxuICpcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdWJzY3JpcHRpb25zKHNlbW90dXM6IFNlbW90dXMsIHNlc3Npb25JZD8pOiBudWxsIHwgU3Vic2NyaXB0aW9ucyB7XG4gICAgY29uc3Qgc2Vzc2lvbiA9IFNlc3Npb25zLmdldChzZW1vdHVzLCBzZXNzaW9uSWQpO1xuXG4gICAgaWYgKHNlc3Npb24pIHtcbiAgICAgICAgcmV0dXJuIHNlc3Npb24uc3Vic2NyaXB0aW9ucztcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbi8qKlxuICogU3Vic2NyaWJlIHRvIGNoYW5nZXMgYW5kIG9wdGlvbmFsbHkgZXN0YWJsaXNoIHN1YnNjcmlwdGlvbiBhcyB0aGVcbiAqIHNvbGUgcmVjaXBpZW50IG9mIHJlbW90ZSBjYWxsIG1lc3NhZ2VzLiAgQ2hhbmdlIHRyYWNraW5nIGlzIHRoZW4gbWFuYWdlZFxuICogYnkgdGhlIGZ1bmN0aW9ucyB0aGF0IGZvbGxvdy5cbiAqXG4gKiBAcGFyYW0gc2Vtb3R1c1xuICogQHBhcmFtIHt1bmtub3dufSByb2xlIHVua25vd25cbiAqXG4gKiBAcmV0dXJucyB7Kn0gdW5rbm93blxuICovXG5leHBvcnQgZnVuY3Rpb24gc3Vic2NyaWJlKHNlbW90dXM6IFNlbW90dXMsIHJvbGUpIHtcbiAgICBjb25zdCBzZXNzaW9uID0gU2Vzc2lvbnMuZ2V0KHNlbW90dXMpO1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvbklkID0gc2Vzc2lvbi5uZXh0U3Vic2NyaXB0aW9uSWQrKztcblxuICAgIHNlc3Npb24uc3Vic2NyaXB0aW9uc1tzdWJzY3JpcHRpb25JZF0gPSB7XG4gICAgICAgIHJvbGU6IHJvbGUsXG4gICAgICAgIGxvZzoge1xuICAgICAgICAgICAgYXJyYXk6IHt9LFxuICAgICAgICAgICAgY2hhbmdlOiB7fSxcbiAgICAgICAgICAgIGFycmF5RGlydHk6IHt9XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIHN1YnNjcmlwdGlvbklkO1xufSJdfQ==