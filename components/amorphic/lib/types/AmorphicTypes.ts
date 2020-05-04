export interface InitialSessionRet {
    appVersion: string,
    getMessage: () => { ver: string; startingSequence: number; sessionExpiration: string };
    getServerConnectString: () => string;
    getServerConfigString: () => string;
    getPersistorProps: () => any;
}

interface objectTemplateType {
    incomingIP?: string;
    sessionExpired: any;
    controller: any;
    memSession: any;
    reqSession: any;
    expireSession?: () => void; // from EstablishServerSession path
    setSession: (sessionId: any) => void; // from semotus
    logger: any;

    enableSendMessage(b: boolean, sendMessageCallback?): void;

    processMessage(message: any, subscriptionId: any, restoreSession: () => any): void;
}

export interface ContinuedSessionRet extends InitialSessionRet {
    newSession: boolean;
    objectTemplate: objectTemplateType;
    getMessage: () => {
        newSession: boolean;
        rootId: string;
        startingSequence: number;
        ver: string;
        sessionExpiration: string;
    }
    save: (path, session, req) => void;
    restoreSession: () => any;
}

// TypeGuard. Need to figure out how to clean up this jank
export function isContinuedSession(ret: ContinuedSessionRet | InitialSessionRet): ret is ContinuedSessionRet {
    return !!(ret as any).objectTemplate;
}

export interface ExpressSession {
    semotus?: {
        controllers: {[key: string]: {controller: any}};
        loggingContext: {[key: string]: any};
        objectMap?: {[key: string]: any};
        lastAccess?: Date;
    };
    afterInit?: boolean; // to deal with initialserversession caveat
    id: string;
    file?: any; // ProcessFile
    sequence: number; // instead of sequence in sessionData

    // Copied from Express - Session
    regenerate(callback: (err: any) => void): void;
    destroy(callback: (err: any) => void): void;
    reload(callback: (err: any) => void): void;
    save(callback: (err: any) => void): void;
    touch(callback: (err: any) => void): void;
    cookie: any;
}

// export function getDefaultSemotus() {
//     return {
//         controllers: {},
//         loggingContext: {}
//     };
// }