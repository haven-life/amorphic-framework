import { createEsmModulePackageJson } from './transformers/preparePackages.mjs';

createEsmModulePackageJson('./dist', 'esm');