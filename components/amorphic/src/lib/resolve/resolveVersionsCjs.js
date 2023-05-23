async function resolveVersions(packages) {
	const versions = {};

	for (const dependency of packages) {
		try {
			let packageLocation = require.resolve(dependency);
			const index = packageLocation.lastIndexOf(dependency);
			const packageJsonLocation = packageLocation.substring(0, index).concat(dependency + '/package.json');

			versions[dependency] = require(packageJsonLocation).version;
		} catch {}
	}

	return versions;
}

module.exports = {
	resolveVersions: resolveVersions
};
