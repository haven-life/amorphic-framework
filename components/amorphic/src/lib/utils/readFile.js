'use strict';

import fs from 'fs';

/**
 * Checks if a file exists and if it does returns it's contents.
 *   Otherwise returns null.
 *
 * @param {String} file The path to a file.
 *
 * @returns {String|null} The contents of the file if it exists.
 */
export function readFile(file) {

    if (file && fs.existsSync(file)) {
        return fs.readFileSync(file);
    }

    return null;
}
