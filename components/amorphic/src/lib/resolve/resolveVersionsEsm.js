export async function resolveVersions(packages) {
    const versions = {};

    for (const dependency of packages) {
        try {
            let packageLocation = import.meta.resolve(dependency);
            const index = packageLocation.lastIndexOf(dependency);
            const packageJsonLocation = packageLocation.substring(0, index).concat(dependency + '/package.json');

            versions[dependency] = (await import(packageJsonLocation, { assert: { type: 'json' }})).version;
        } catch {}
    }

    return versions;
}