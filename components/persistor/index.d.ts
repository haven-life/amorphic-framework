export { Persistable, ContainsPersistable, PersistorObj as Persistor, Persistor as PersistorClass } from './lib/persistable';
export { Supertype } from '@haventech/supertype';
export type Schema = { [k: string]: string | string[] | boolean | Schema };
export { amorphicStatic } from './lib/amorphicStatic';

export function property(props?: Object);
export function supertypeClass(target?: any);