import {ExpressSession} from './AmorphicTypes';

declare module 'express-serve-static-core' {
    export interface Request {
        amorphicTracking: any;
        session: ExpressSession
    }
}