async function resolveVersions(packageVersions) {
    const readPackagePkg = await import('read-pkg');
    const pkg = await readPackagePkg.readPackage();
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

module.exports = {
    resolveVersions: resolveVersions
};
