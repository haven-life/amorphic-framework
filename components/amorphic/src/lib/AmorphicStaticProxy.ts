export default class AmorphicProxy {
    private getTarget: () => any;

    constructor(getTarget: () => any) {
        this.getTarget = getTarget;
    }

    get logger() {
        return this.getTarget().logger;
    }

    get config() {
        return this.getTarget().config;
    }

    beginDefaultTransaction() {
        return this.getTarget().beginDefaultTransaction;
    }

    beginTransaction(nodefault) {
        return this.getTarget().beginTransaction(nodefault);
    }

    endTransaction(persistorTransaction?, logger?) {
        return this.getTarget().endTransaction(persistorTransaction, logger);
    }

    begin(isdefault) {
        return this.getTarget().begin(isdefault);
    }


    end (persistorTransaction, logger) {
        return this.getTarget().end(persistorTransaction, logger);
    }

    commit (options) {
        return this.getTarget().commit(options);
    }

    createTransientObject(callback) {
        return this.getTarget().createTransientObject(callback);
    }

    get __transient__() {
        return this.getTarget().__transient__;
    }

    get __dictionary__() {
        return this.getTarget().__dictionary__;
    }

    get debugInfo() {
        return this.getTarget().debugInfo;
    }

    set debugInfo(debugInfo) {
        this.getTarget().debugInfo = debugInfo;
    }

    get reqSession() {
        return this.getTarget().reqSession;
    }
    
    getClasses() {
        return this.getTarget().getClasses();
    }

    syncAllTables() {
        return this.getTarget().syncAllTables();
    }

    create() {
        return this.getTarget().create();
    }

    getInstance() {
        return this.getTarget().getInstance();
    }
}