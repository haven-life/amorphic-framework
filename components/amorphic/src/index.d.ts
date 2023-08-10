export { Supertype } from '@haventech/supertype';
export { Persistable, ContainsPersistable, Persistor } from '@haventech/persistor';
export { Remoteable } from './lib/utils/remoteable';
/** @deprecated */
export { amorphicStatic } from './lib/utils/remoteable';
export { Bindable } from 'amorphic-bindster';
import { Persistor } from '@haventech/persistor';
export { IAmorphicAppController } from './lib/types/IAmorphicAppController';
export { CallContext, ChangeString, Changes, ControllerResponse, ErrorType, PreServerCallChanges } from './lib/types/HelperTypes';
export { HTTPObjs, RemoteCall, ILifecycleController } from './lib/types/ILifecycleController';

// This class is for Amorphic unit tests
export class Amorphic extends Persistor {
    static create(): Amorphic;
    connect(configDirectory, schemaDirectory?, configStore?, externalSchemas?)
    incomingIp: string;
}

export declare var Config: any;

export { remote } from './lib/types/remote';
export function property(props?: Object);
export function supertypeClass(props?: any);