import Ajv from 'ajv';

const schemas = {
    'persistSchema': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
            'transaction': {
                type: ['null', 'object']
            },
            'cascade': {
                type: 'boolean'
            },
            'logger': {
                type: ['null', 'object']
            }
        }
    },
    'fetchSchema': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
            'fetch': {
                type: ['null', 'object']
            },
            'projection': {
                type: ['null', 'object']
            },
            'start': {
                type: 'number'
            },
            'limit': {
                type: 'number'
            },
            'order': {
                type: ['null', 'object']
            },
            'transient': {
                type: 'boolean'
            },
            'session': {
                type: ['null', 'object']
            },
            'logger': {
                type: ['null', 'object']
            },
            'enableChangeTracking': {
                type: ['boolean', 'null']
            }
        }
    },
    'commitSchema': {
        'type': 'object',
        'additionalProperties': false,
        'properties': {
            'transaction': {
                type: ['null', 'object']
            },
            'logger': {
                type: ['null', 'object']
            },
            'notifyChanges': {
                type: ['boolean', 'null']
            },
            'notifyQueries': {
                type: ['boolean', 'null']
            }
        }
    },
    'fetchSpec': {}
};
const ajv = new Ajv({ allErrors: true });
// cacheing schema compilation so we don't need to compile on every call.
ajv.addSchema(schemas['persistSchema'], "persistSchema"); 
ajv.addSchema(schemas['fetchSchema'], "fetchSchema");
ajv.addSchema(schemas['commitSchema'], "commitSchema");
ajv.addSchema(schemas['fetchSpec'], "fetchSpec");

export default ajv;