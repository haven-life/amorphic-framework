import * as NodeCache from 'node-cache';  

export class CacheProvider {
    private static cache: any = null;
    public static initialize() {
        if (this.cache) return;
      
        this.cache = new NodeCache({useClones: false});
    }

    public static instance() {
        // var cache = this.cache.get('Persistor_Cache');
        return this.cache.keys().reduce((result, key) => {
            result[key] = this.cache.get(key);
            return result;
        }, {})
    }

    public static set(key: string, value: any) {
        this.cache.set(key, value, 100);
    }

    public static get(key: string) {
        return this.cache.get(key);
    }

    public static getCachedObject(key: string) {
        return this.cache.get(key);
    }
}