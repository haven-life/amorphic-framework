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

export type ExpressSession = {
    semotus?: {
        controllers: {[key: string]: {controller: any}};
        loggingContext: {[key: string]: any};
        objectMap?: {[key: string]: any};
        lastAccess?: Date;
    };
    afterInit?: boolean; // to deal with initialserversession caveat
    id: string;
    file?: any; // ProcessFile

    sequence: number; // instead of
}