export { Persistable, ContainsPersistable, PersistorObj as Persistor } from './lib/persistable.js';
export { Supertype } from '@haventech/supertype';
export { Schema } from './lib/types/Schema.js';
export { amorphicStatic } from './lib/amorphicStatic.js';

export function property(props?: Object);
export function supertypeClass(target?: any);