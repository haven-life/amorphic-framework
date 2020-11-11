import {QueryBuilder} from 'knex';
import * as _ from 'underscore';

/**
 * Take a query object like {$or: [{type: 'foo'}, {x: {$gt: 4}, y: {$lte: 6}}]}
 * which could also be expressed as: {$or: [{type: 'foo'}, {$and: [{x: {$gt: 4}}, {y: {$lte: 6}}]}]}
 * and append to a knex statement like knex('table').select('*') these chains ...
 * .where('type', '=', 'foo').orWhere(function () {
 *    this.where(x, '>', 4).andWhere(y, '<=', 6)
 * });
 *
 * {$or: [{type: 'foo', subtype: 'bar'}, {$or:[{x: {$gt: 4}}, {x: 9}], y: {$lte: 6}}]}
 * .where('type', '=', 'foo').orWhere(function () {
 *    this.where(function () {
 *      this.where(x, '>', 4).orWhere(x, '=' 9)
 *    }).andWhere(y, '<=', 6)
 * });     *
 * @param {string} alias db alias name used when setting the database client object
 * @param {string} statement knex query
 * @param {object} query mongo style query object
 * @returns {*}
 */
export namespace MongoQuery {

    export function convertMongoQueryToChains (alias: string, statement: QueryBuilder, query): QueryBuilder {
        return traverse(statement, query, alias)
    }

    /**
     * Traverse an object and produce a promise chain of where and andWhere
     * @param {object} statement knex query
     * @param {object} query mongo style query object
     * @param alias
     * @returns {*}
     */
    function traverse(statement: QueryBuilder, query, alias: string) {
        var firstProp = true;
        for (var prop in query) {
            var params = processProp(statement, prop, query[prop], alias);

            if (firstProp) {
                if (params.length > 1) {
                    statement = statement.where(params[0], params[1], params[2]);
                }
                else {
                    statement = statement.where(params[0]);
                }
            }
            else {
                if (params.length > 1) {
                    statement = statement.andWhere(params[0], params[1], params[2]);
                }
                else {
                    statement = statement.andWhere(params[0]);
                }
            }

            firstProp = false;
        }
        return statement;
    }

    function processProp(statement: QueryBuilder, prop, value, alias: string) {
        if (value instanceof Array)
            return processArrayProp(prop, value, alias);
        else
            return processNonArrayProp(prop, value, alias)
    }

    function processArrayProp(prop, value, alias: string) {
        return [innerFunc(prop, value, alias)];
    }

    function innerFunc(prop: string, value: any, alias: string) {
        return function boundInnerFunc () {
            var firstProp;
            var statement = this;

            if (prop.toLowerCase() == '$and') {
                firstProp = true;
                _.each(value, function (obj) {
                    var params = processObject(statement, obj, alias);
                    statement = andOrStatementBuilder(statement, params, firstProp, 'and');
                    firstProp = false;
                });
            } else if (prop.toLowerCase() == '$or') {
                firstProp = true;
                _.each(value, function (obj) {
                    var params = processObject(statement, obj, alias);
                    statement = andOrStatementBuilder(statement, params, firstProp, 'or');
                    firstProp = false
                });
            } else if (prop.toLowerCase() == '$in')
                statement = statement.whereIn(value);
            else if (prop.toLowerCase() == '$nin')
                statement = statement.whereNotIn(value);
            else
                throw `Don't support ${prop}:${JSON.stringify(value)}`;
        }
    }

    function andOrStatementBuilder(statement: QueryBuilder, params: any, firstProp: boolean, andOrOr: 'and' | 'or') {
        if (firstProp) {
            if (params.length > 1) {
                return statement.where(params[0], params[1], params[2]);
            }
            else {
                return statement.where(params[0]);
            }
        } else {
            if (params.length > 1) {
                if (andOrOr === 'or') {
                    return statement.orWhere(params[0], params[1], params[2]);
                }
                else {
                    return statement.andWhere(params[0], params[1], params[2]);
                }
            }
            else {
                return statement.andWhere(params[0]);
            }
        }
    }

    /**
     * Process an array element of a $or or $and.  This will result in either three parameters in
     * the form of prop, compare operator, value or a single parameter which is a function that
     * will chain together a nested expression.
     * @param {object} statement knex query object
     * @param {object} obj object of supertype
     * @returns {Function}
     */
    function processObject(statement: QueryBuilder, obj, alias: string) {
        var propCount = 0;
        var singleProp;

        // Do we have more than one prop
        for (var prop in obj) {
            singleProp = prop;
            ++propCount;
        }

        // If so fetch the 3 parameters for a where, orWhere or andWhere chain
        // Otherwise return a function that will chain sub-ordinate clauses
        if (propCount == 1)
            return processProp(statement, singleProp, obj[singleProp], alias);
        else
            return [function () {
                traverse(statement, obj, alias)
            }]
    }

    // Params is either a Function or a set of 3 values ex. [key name, op, value]
    function processNonArrayProp(prop: string, value, alias: string): Array<Function | any> {
        var params: Array<Function | any> = [];
        if (value instanceof Date || typeof(value) == 'string' || typeof(value) == 'number') {
            params = [`${alias}.${prop}`, '=', value];
        } else
            for (var subProp in value) {
                params = [`${alias}.${prop}`, undefined, value[subProp]];
                const lowerCase = subProp.toLowerCase();
                if (lowerCase == '$eq')
                    params[1] = '=';
                else if (lowerCase == '$gt')
                    params[1] = '>';
                else if (lowerCase == '$gte')
                    params[1] = '>=';
                else if (lowerCase == '$lt')
                    params[1] = '<';
                else if (lowerCase == '$lte')
                    params[1] = '<=';
                else if (lowerCase == '$ne')
                    params[1] = '!=';
                else if (lowerCase == '$in') {
                    const attr = params[0];
                    const values = params[2];
                    params = [function () {
                        this.whereIn(attr, values)
                    }];
                }
                else if (lowerCase == '$nin') {
                    const attr = params[0];
                    const values = params[2];
                    params = [function () {
                        this.whereNotIn(attr, values)
                    }];
                }
                else if (lowerCase == '$regex') {
                    params[1] = value.$options && value.$options.match(/i/) ? '~*' : '~';
                    delete value['$options']
                    if (params[2] && params[2].source)
                        params[2] = params[2].source;
                } else
                    throw `Can't handle ${prop}:${JSON.stringify(value)}`;
            }
        return params;
    }

}