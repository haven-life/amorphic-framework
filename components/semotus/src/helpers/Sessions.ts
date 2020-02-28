import {SavedSession, Semotus, SendMessage, Session} from './Types';

/**
 * Obtain a session for tracking subscriptions
 *
 * @param semotus
 * @param {unknown} role unknown
 * @param {unknown} sendMessage unknown
 * @param {unknown} sessionId unknown
 *
 * @returns {*} unknown
 */
export function create(semotus: Semotus, role, sendMessage: SendMessage, sessionId): any {
    if (!semotus.sessions) {
        semotus.nextSubscriptionId = 0;
        semotus.nextSessionId = 1;
        semotus.sessions = {};
    }

    if (!sessionId) {
        sessionId = semotus.nextSessionId++;
    }

    semotus.setSession(sessionId);

    semotus.sessions[sessionId] = {
        subscriptions: {}, // Change listeners
        sendMessage: sendMessage, // Send message callback
        sendMessageEnabled: !!sendMessage,
        remoteCalls: [], // Remote calls queued to go out
        pendingRemoteCalls: {}, // Remote calls waiting for response
        nextPendingRemoteCallId: 1,
        nextSaveSessionId: 1,
        savedSessionId: 0,
        nextSubscriptionId: 0,
        objects: {},
        nextObjId: 1,
        dispenseNextId: null // Force next object Id
    };

    if (role instanceof Array) {
        for (var ix = 0; ix < role.length; ++ix) {
            semotus.subscribe(role[ix]);
        }

        semotus.role = role[1];
    } else {
        semotus.subscribe(role);
        semotus.role = role;
    }

    return sessionId;
}


/**
 * Remove the session from the sessions map, rejecting any outstanding promises
 * WARNING: Async side effects
 * @param semotus
 * @param {unknown} sessionId unknown
 */
export function remove(semotus: Semotus, sessionId: string | number) {
    let session = get(semotus, sessionId);

    for (var calls in session.remoteCalls) {
        session.remoteCalls[calls].deferred.reject({code: 'reset', text: 'Session resynchronized'});
    }

    if (semotus.sessions[sessionId]) {
        delete semotus.sessions[sessionId];
    }
}

/**
 * Get the current session structure
 *
 * @returns {*} the session
 *
 * @private
 */
export function get(semotus: Semotus, _sid?): Session | null {
    if (!semotus.currentSession) {
        return null;
    }
    return semotus.sessions[semotus.currentSession];
}


/**
 * Indicate that all changes have been accepted outside of the message
 * mechanism as would usually happen when a session is starting up
 *
 * @param semotus
 * @param {unknown} sessionId unknown
 */

export function sync(semotus: Semotus, sessionId) {
    get(semotus, sessionId);
    semotus.getChanges();
    semotus._deleteChanges();
}


/**
 * Restore session that was potentially serialized/deserialized
 *
 * A revision number is used to determine whether the in-memory copy is good
 *
 * @param semotus
 * @param {unknown} sessionId - the id under which it was created with createSession
 * @param {unknown} savedSession - the POJO version of the session data
 * @param {unknown} sendMessage - new message function to be in effect
 *
 * @returns {Boolean} false means that messages were in flight and a reset is needed
 */
export function restore(semotus: Semotus, sessionId, savedSession: SavedSession, sendMessage: SendMessage) {
    semotus.setSession(sessionId);
    const session = semotus.sessions[sessionId];
    semotus.logger.debug({component: 'semotus', module: 'restore', activity: 'save'});

    if (session) {
        if (session.savedSessionId == savedSession.revision) {
            return true;
        } else {
            delete semotus.sessions[sessionId];
        }
    }

    semotus.sessions[sessionId] = JSON.parse(savedSession.data);
    semotus.sessions[sessionId].sendMessage = sendMessage;

    return savedSession.callCount > 0;
}

/**
 * Save the session data in a way that can be serialized/de-serialized
 *
 * @param semotus
 * @param {unknown} sessionId unknown
 *
 * @returns {Object} unknown
 */
export function save(semotus: Semotus, sessionId): SavedSession {
    const session = get(semotus, sessionId);

    session.nextSaveSessionId = session.nextSaveSessionId + 1;
    session.savedSessionId = session.nextSaveSessionId;
    const objects = session.objects;
    session.objects = {};

    const savedSession = {
        callCount: semotus.getPendingCallCount(sessionId), // Can't just restore on another server and carry on
        revision: session.savedSessionId, // Used to see if our memory copy good enough
        referenced: new Date().getTime(), // Used for reaping old sessions
        data: JSON.stringify(session) // All the session data
    };

    session.objects = objects;
    semotus.logger.debug({component: 'semotus', module: 'save', activity: 'save'});

    return savedSession;
}
