import { SupertypeConfig } from '@haventech/supertype';
import defaultExport, { supertypeClass, Supertype, property, amorphicStatic, Persistable, Persistor, Schema } from './lib/index';

export default defaultExport;
export { supertypeClass, Supertype, property, amorphicStatic, Persistable, Schema };

let persistor = Persistor;
if (!SupertypeConfig.useAmorphic) {
    persistor = persistor.create();
}
export { persistor as Persistor }
