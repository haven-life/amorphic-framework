import fs from 'fs';
import path from 'path';

const buildDir = './dist';
function createEsmModulePackageJson() {
	console.log('Running prepare packages for ESM');
	fs.readdir(buildDir, function (err, dirs) {
		if (err) {
			throw err;
		}
		dirs.forEach(function (dir) {
			if (dir === 'esm') {
				var packageJsonFile = path.join(buildDir, dir, '/package.json');
				if (!fs.existsSync(packageJsonFile)) {
					fs.writeFile(
						packageJsonFile,
						new Uint8Array(Buffer.from('{"type": "module"}')),
						function (err) {
							if (err) {
								throw err;
							}
						}
					);
				}
			}
		});
	});
}

createEsmModulePackageJson();