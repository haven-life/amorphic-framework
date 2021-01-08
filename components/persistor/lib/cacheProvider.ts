import * as NodeCache from 'node-cache';  

export class CacheProvider {
    private static cache: any = null;
    public static initialize(cacheSupport) {
        if (!cacheSupport) {
            this.cache = null;
            return;
        }
        if (this.cache) return;
        this.cache = new NodeCache({useClones: false});
    }

    public static instance() {
        return this.cache && this.cache.keys().reduce((result, key) => {
            result[key] = this.cache.get(key);
            return result;
        }, {})
    }

    public static set(key: string, value: any) {
        this.cache && this.cache.set(key, value, 100);
    }

    public static get(key: string) {
        return this.cache && this.cache.get(key);
    }

    public static getCachedObject(key: string) {
        return this.cache && this.cache.get(key);
    }
}