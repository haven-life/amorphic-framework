import { createCommonJsPackageJson, createEsmModulePackageJson } from '../../build/transformers/preparePackages.mjs';

createCommonJsPackageJson('./dist', 'cjs');
createEsmModulePackageJson('./dist', 'esm');