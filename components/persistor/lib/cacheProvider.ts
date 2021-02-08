import 'zone.js';

const hitPersistorCtxKey = '#hit-persistor-ctx';

export class BaseCache {
    protected cache = null;
    protected ttl = 0;
    protected persistorCtx = null;
    protected get currentCtx() {
        return Zone.current.get(hitPersistorCtxKey) || undefined;
    }
    
    constructor() {}
    public set(key: string, value: any, ttl: number) { }
    public delete(key: string) { }
    public flush() { }
    public get(key: string) { }
}



export class Cache extends BaseCache{
    constructor(timeToLive: number) {
        super();
        this.ttl = timeToLive;
        // this.cache = new NodeCache({useClones: false});
        // persistorCtx
        // this.cache.on( "del", function( key, value ){
        //     console.log('removing from the cache...', key);
        // });
    }
    public set(key: string, value: any, ttl) { 
        if (this.currentCtx) {
            this.currentCtx[key] = value;
        }
            
        // this.cache.set(key, value, ttl || this.ttl);
    }

    public delete(key: string) { 
        // delete this.currentCtx[key];
        // this.cache.del(key);
    }

    public flush() { 
        if (this.currentCtx) {
            var localCtx = this.currentCtx;
            localCtx = {};
        }
    }

    public get(key: string) { 
        if (this.currentCtx) {
            return this.currentCtx[key];
        } 
        // return this.cache.get(key);
    }
}

export type CacheSettings = {
    timeToLive: number
}

export class CacheProvider {
    private static cache: any = null;
    public static initialize(cacheSettings: CacheSettings) {
        if (!cacheSettings || !cacheSettings.timeToLive) {
            this.cache = new BaseCache();
            return;
        }
        this.cache = new Cache(cacheSettings.timeToLive);
    }

    public static set(key: string, value: any, ttl?: number) {
        this.cache.set(key, value, ttl);
    }
    public static delete(key: string) { 
        this.cache.delete(key);
    }

    public static flush() { 
        this.cache.flush();
    }
    public static get(key: string) {
        return this.cache.get(key);
    }

    public static async sleep(ttl: number) {
        await new Promise(resolve => setTimeout(resolve, ttl)); 
    }
    public static getPersistorCacheKey() { 
        return hitPersistorCtxKey;
    }
}