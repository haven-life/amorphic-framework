export {Supertype} from '@havenlife/supertype';
export {Persistable, ContainsPersistable, Persistor} from '@havenlife/persistor';
export {Remoteable, amorphicStatic} from './lib/utils/remoteable';
export {Bindable} from 'amorphic-bindster';
export { RouteType, RouteHandlers, Route, Middleware } from './lib/routes/RoutesSetup'
import {Persistor} from '@havenlife/persistor';

// This class is for Amorphic unit tests
export class Amorphic extends Persistor {
    static create () : Amorphic;
    connect (configDirectory, schemaDirectory?)
    incomingIp: string;
}

export declare var Config : any;
export function remote(props?);
export function property(props?: Object);
export function supertypeClass(props?: any);
