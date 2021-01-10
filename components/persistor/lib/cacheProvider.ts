import * as NodeCache from 'node-cache';  

export class BaseCache {
    protected cache = null;
    protected ttl = 0;
    constructor() {}
    public set(key: string, value: any) { }
    public get(key: string) { }
    public getCachedObject(key: string) { }
}

export class Cache extends BaseCache{
    constructor(timeToLive: number) {
        super();
        this.ttl = timeToLive;
        this.cache = new NodeCache({useClones: false});
    }
    public set(key: string, value: any) { 
        this.cache.set(key, value, this.ttl);
    }

    public get(key: string) { 
        return this.cache.get(key);
    }

    public getCachedObject(key: string) { 
        return this.cache.get(key);
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

    public static set(key: string, value: any) {
        this.cache.set(key, value);
    }

    public static get(key: string) {
        return this.cache.get(key);
    }

    public static getCachedObject(key: string) {
        return this.cache.get(key);
    }
}