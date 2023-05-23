'use strict';

import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * creates a location for amorphic file downloads in the
 * system's temp directory and returns a string of the path to it.
 *
 * @returns {string} - file path of downloads directory
 */
export function generateDownloadsDir() {
    // Create temporary directory for file uploads
    let downloadDir = path.join(os.tmpdir(), 'download');

    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
    }

    let files = fs.readdirSync(downloadDir);

    for (let ix = 0; ix < files.length; ++ix) {
        fs.unlinkSync(path.join(downloadDir, files[ix]));
    }

    return downloadDir;
}
