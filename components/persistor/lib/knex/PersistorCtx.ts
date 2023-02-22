import { AsyncLocalStorage } from 'async_hooks'

type CtxProps = { name: string, properties: {} }

class ExecutionCtx {
    private readonly _asOfDate;

    constructor(asOfDate: Date) {
        this._asOfDate = asOfDate
    }

    get asOfDate() {
        return this._asOfDate;
    }
}

export class PersistorCtx { 
    static persistorExnCtxKey = '#persistor-exn-ctx';
    static persistorCacheCtxKey = '#persistor-cache-ctx';
    private static _asyncLocalStorage: AsyncLocalStorage<CtxProps>;

    private static get asyncLocalStorage() {
        return this._asyncLocalStorage || (this._asyncLocalStorage = new AsyncLocalStorage<CtxProps>());
    }

    static checkAndExecuteWithContext(asOfDate: Date, callback: () => any )  {
        if (!asOfDate) {
            return callback();
        }
        
        const ctxProps = {
            name: `${new Date().getTime()}`,
            properties: { [this.persistorExnCtxKey]: new ExecutionCtx(asOfDate) },
        };
        return this.asyncLocalStorage.run(ctxProps, async () => {
            return await callback();
        });
    }

    static get executionCtx() {
        if (!this._asyncLocalStorage) {
            return;
        }
        const store = this.asyncLocalStorage.getStore() as CtxProps;
        if (!store) {
            return;
        }
        const exnCtx: ExecutionCtx = store.properties[this.persistorExnCtxKey];
        return exnCtx;
    }

    static set setExecutionContext(asyncLocalStorage: AsyncLocalStorage<CtxProps>) {
        const store = asyncLocalStorage.getStore() as CtxProps;
        if (!store) {
            return;
        }

        const exnCtx: ExecutionCtx = store.properties[this.persistorCacheCtxKey];
        if (!exnCtx) {
            throw Error(`ExecutionCtx can only be set from outside with #persistor-cache-ctx property in the store.`)
        }
        
        this._asyncLocalStorage = asyncLocalStorage;
    }
}