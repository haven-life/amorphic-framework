import defaultExport, { supertypeClass, Supertype, property, amorphicStatic, Persistable, Persistor } from './lib/index';

export default defaultExport;
export { supertypeClass, Supertype, property, amorphicStatic, Persistable, Persistor as PersistorClass };

let persistor = Persistor.create();
export { persistor as Persistor };
