import { AsyncLocalStorage } from 'async_hooks'

type CtxProps = { name: string, properties: {} }

class ExecutionCtx {
    private readonly _asOfDate;

    constructor(asOfDate: Date) {
        this._asOfDate = asOfDate
    }

    get AsOfDate() {
        return this._asOfDate;
    }
}

export class PersistorCtx { 
    static persistorExnCtxKey = '#persistor-exn-ctx';
    private static _asyncLocalStorage: AsyncLocalStorage<CtxProps>;

    private static get asyncLocalStorage() {
        if (this._asyncLocalStorage) {
            return this._asyncLocalStorage
        }
        else {
            return (this._asyncLocalStorage = new AsyncLocalStorage<CtxProps>());
        }
    }

    static checkAndExecuteWithContext(asOfDate: Date, callback: () => any )  {
        if (asOfDate) {
            const ctxProps = {
                name: `${new Date().getTime()}`,
                properties: { [this.persistorExnCtxKey]: new ExecutionCtx(asOfDate) },
            };
            return this.asyncLocalStorage.run(ctxProps, async () => {
                let store = this.asyncLocalStorage.getStore() as CtxProps;
                return await callback();
            });
        }
        else {
            return callback();
        }
    }

    static get ExecutionCtx() {
        if (this._asyncLocalStorage) {
            const store = this.asyncLocalStorage.getStore() as CtxProps;
            if (!store) {
                return null;
            }
            const exnCtx: ExecutionCtx = store.properties[this.persistorExnCtxKey];
            return exnCtx;
        }
    }
}