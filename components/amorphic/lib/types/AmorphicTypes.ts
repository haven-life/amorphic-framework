interface InitialSession {
    appVersion: string,
    getMessage: () => { ver: string; startingSequence: number; sessionExpiration: string };
    getServerConnectString: () => string;
    getServerConfigString: () => string;
    getPersistorProps: () => any;
}

interface objectTemplateType {
    controller: any;
    memSession: any;
    reqSession: any;
    expireSession?: () => void; // from EstablishServerSession path
}

interface ContinuedSession extends InitialSession {
    newSession: boolean;
    objectTemplate?: objectTemplateType;
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