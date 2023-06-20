import { Handler, ErrorRequestHandler } from 'express';
export type RouteType =  'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
* @member HTTPMethod - array of RouteTypes (get, post) depending on what you want the route to do.
* Usually it is only necessary to register on
* @member callbacks - array of callbacks that will be called sequentially when this route is hit. 
* This array can be treated as one idempotent set
*/
export interface RouteHandlers {
    HTTPMethod: RouteType;
    callbacks: Handler[];
}

/**
 * Route interface. Should be exported in apps/<app_name>/server/middlewares/index.ts
 * 
 * @member path - path for this route
 * @member handlers - array of RouteHandlers
 */
export interface Route {
    path: string;
    handlers: RouteHandlers[];
}

/**
 * Middleware interface. Should be exported in apps/<app_name>/server/middlewares/index.ts
 * 
 * @member path - optional param if this middleware is custom to a specific route (as opposed to all (default))
 * @member callbacks - optional array of callbacks that will be called sequentially. 
 * This array can be treated as one idempotent set. 
 * @member errorCallback - optional callback for the last middleware, which, if exists should be an error handler
 */
export interface Middleware {
    path?: string;
    callbacks?: Handler[];
    errorCallback?: ErrorRequestHandler;
}