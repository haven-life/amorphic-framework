import { Request, Response } from 'express';
import { ControllerResponse } from './HelperTypes';

/**
 * Some additional terms
 * 
 * @client - Functionality that executes on the client side
 * @server - Functionality that executes on the server side
 * 
 * @misnomer - Functionality that may have confusing nomenclature
 * 
 * @deprecated - Deprecated functionality that is not used anymore
 */

/**
 * Interface for any controller that wants to utilize the various route handlers built into Amorphic
 *
 * Should NOT be used independently of IAmorphicAppController
 * Defines optional functionality / callbacks to tap into Amorphic's potential
 * @export
 * @interface IAmorphicRouteController
 */

export interface IAmorphicRouteController {

    /**
     * @server
     * 
     * This is used in conjunction with Amorphic's 'downloadRouter', when you are downloading files / data from the server
     * 
     * The request must be a GET and it's url must have the following
     * 
     * 1) A path specified with the app_name as the parameter
     * 2) A file passed as a query parameter
     * 
     * Example: http://localhost:3001/amorphic/xhr?path=[app_name]&file=[file_name]
     * 
     * Upon establishing the server session (or creating a new one), we'll call this callback
     *
     * @param {Request} req - Request object
     * @param {Response} res - Response object
     * @memberof IAmorphicRouteController
     */
    onContentRequest?(req: Request, res: Response): void;

    /**
     * @server
     * 
     * ProcessPost is a powerful paradigm that allows the client to request for resources from within the Amorphic application
     * akin to routes. Amorphic will still establish the server session or create a new one, and afterwards hand off to this callback
     * 
     * The request must be a POST and it's url must have the following
     * 
     * 1) A path specified with the app_name as the parameter
     * 2) A Form passed as a query parameter (unless it's through amorphicEntry)
     * 
     * Example: http://localhost:3001/amorphic/xhr?path=[app_name]&form=true
     * 
     * This is useful for calling resources that don't need the client to load up the full app or for third party services to call endpoints within the application
     * 
     * However with the advent of the daemon / hybrid / api modes those features should be leveraged over this.
     * 
     *
     * @param {string} originalUrl - String of the req.originalUrl.
     * From the Express documentation: "This property is much like req.url; however, it retains the original request URL, allowing you to rewrite req.url freely for internal routing purposes." 
     * @param {*} body - Request Body
     * @param {Request} req - Request Object
     * 
     * @returns {Promise<ControllerResponse>} - Promise containing the response you want to send back to the client
     * @memberof IAmorphicRouteController
     */
    processPost?(originalUrl: string, body: any, req: Request): Promise<ControllerResponse>;

}