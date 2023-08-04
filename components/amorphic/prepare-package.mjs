import { createCommonJsPackageJson, createEsmModulePackageJson } from '@haventech/supertype/transformers/preparePackages.mjs';

createCommonJsPackageJson('./dist', 'cjs');
createEsmModulePackageJson('./dist', 'esm');