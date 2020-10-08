export { Supertype } from '@havenlife/supertype';
export { Persistable, ContainsPersistable, Persistor } from '@havenlife/persistor';
export { Remoteable, amorphicStatic } from './lib/utils/remoteable';
export { Bindable } from 'amorphic-bindster';
import { Persistor } from '@havenlife/persistor';
export { IAmorphicAppController } from './lib/types/IAmorphicAppController';

// This class is for Amorphic unit tests
export class Amorphic extends Persistor {
    static create(): Amorphic;
    connect(configDirectory, schemaDirectory?)
    incomingIp: string;
}

export declare var Config: any;

export { remote } from './lib/types/remote';
export function property(props?: Object);
export function supertypeClass(props?: any);
