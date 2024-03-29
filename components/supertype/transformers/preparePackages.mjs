import fs from 'fs';
import path from 'path';

export function createEsmModulePackageJson(buildDir, esmDir) {
    [ buildDir, esmDir ] = [ buildDir || './dist', esmDir || 'esm' ];
    console.log(`Running prepare packages for ESM with buildDir: ${buildDir} and esmDir: ${esmDir}`);
    fs.readdir(buildDir, function (err, dirs) {
        if (err) {
            throw err;
        }
        dirs.forEach(function (dir) {
            if (dir === esmDir) {
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