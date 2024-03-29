import fs from 'fs';
import path from 'path';
import url, { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let daemonController;

export function controller(objectTemplate) {
    var localObjectTemplate = objectTemplate;
    var Controller = objectTemplate.create('Controller', {
        prop: {type: Boolean, value: false},
        propWithValuesAndDescriptions: {type: String,
            values: ['value'],
            descriptions: {
                value: 'Description'
            }
        },
        virtualProp: {type: String, isVirtual: true,
            get: function() {
                return 'I am virtual';
            }
        },

        serverInit: function() {
            this.prop = true;
            daemonController = this;
			globalThis.setController(daemonController);
        },

        processPost: {on: 'server', body: function(uri, body) {
            this.posted = body.myfield;
            return {status: 303, headers: {location: uri.replace(/amorphic.*/, '')}};
        }},

        getObjectTemplate: function() {
            return localObjectTemplate;
        },

        onContentRequest: function(req, res) {
            var path = url.parse(req.originalUrl, true).query.file;
            var file = __dirname + '/./' + path;
            try {
                var stat = fs.statSync(file);
            }
            catch (e) {
                res.writeHead(404, {'Content-Type': 'text/plain'});
                res.end('Not found');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': stat.size
            });
            var readStream = fs.createReadStream(file);
            readStream.pipe(res);
        }
    });

    return {
        Controller: Controller
    };
};
