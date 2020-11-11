import * as _ from 'underscore';

export namespace Helpers {
    export function iscompatible(persistortype, pgtype) {
        switch (persistortype) {
            case 'String':
            case 'Object':
            case 'Array':
                return pgtype.indexOf('text') > -1;
            case 'Number':
                return pgtype.indexOf('double precision') > -1;
            case 'Boolean':
                return pgtype.indexOf('bool') > -1;
            case 'Date':
                return pgtype.indexOf('timestamp') > -1;
            default:
                return pgtype.indexOf('text') > -1; // Typed objects have no name
        }
    }

    export function getPropsRecursive(template, map?) {
        map = map || {};
        _.map(template.getProperties(), function (val, prop) {
            map[prop] = val
        });
        template = template.__children__;
        template.forEach(function (template) {
            getPropsRecursive(template, map);
        });
        return map;
    }
}