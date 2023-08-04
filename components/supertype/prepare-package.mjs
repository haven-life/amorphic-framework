import { createCommonJsPackageJson, createEsmModulePackageJson } from './transformers/preparePackages.mjs';

createCommonJsPackageJson('./dist', 'cjs');
createEsmModulePackageJson('./dist', 'esm');