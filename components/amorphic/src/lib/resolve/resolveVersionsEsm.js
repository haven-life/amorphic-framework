import { readPackage } from "read-pkg";

export async function resolveVersions(packages) {
    const pkg = await readPackage();
    const dependencies = pkg.dependencies;

    const setPackage = (packageVersions, dependencies, name) => {
        packageVersions[name] = dependencies[name];
    }

    setPackage(packageVersions, dependencies, '@haventech/semotus');
    setPackage(packageVersions, dependencies, '@haventech/supertype');
    setPackage(packageVersions, dependencies, '@haventech/persistor');
    setPackage(packageVersions, dependencies, '@haventech/bindster');
    packageVersions['amorphic'] = pkg.version;
    return packageVersions;
}