import * as expressSession from "express-session";
import * as redis from 'redis';

const RedisStore = require('connect-redis')(expressSession);

interface Params {
    clientParams: {
        host: string;
        port: number;
        password?: string;
    },
    storeParams?: any;
}

function isParam(obj: any): obj is Params {
    return obj.clientParams && obj.clientParams.host && obj.clientParams.port;
}

/**
 * Needs to follow connect-redis 4
 *
 * Either
 * 1) Takes in an already configured redis-session config (an instance of a connect redis-store)
 * 2) Takes an object with structure:
 *   {
        clientParams: {
          host,
          port,
          password,
          ...
        }
        storeParams: {
            ttl,
            prefix
        }
 *   }
 *
 * @param sessionStore
 * @param sessionConfig
 */
export function setup(sessionStore: any) {
    let store;

    if (isParam(sessionStore)) {
        let { host, port } = sessionStore.clientParams;
        let redisClient = redis.createClient(sessionStore.clientParams);
        const storeArgs = Object.assign({}, {client: redisClient}, sessionStore.storeParams);

        store = new RedisStore(storeArgs);
        store.on('connect', function() {
            console.log(`Connected to Redis session store redis://${host}:${port}`);
        });
        store.on('disconnect', function() {
            console.error(`Error: Disconnected from Redis session store redis://${host}:${port}`);
        });
    }
    else {
        store = sessionStore;
    }

    return store;
}