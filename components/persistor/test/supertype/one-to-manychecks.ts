
// declare function require(name:string);
import SupertypeModule from '@haventech/supertype';
var ObjectTemplate = SupertypeModule.default;
import * as index  from '../../dist/index.js';
var PersistObjectTemplate = index.persObj(ObjectTemplate, null, ObjectTemplate);
// var PersistObjectTemplate  = index.persObj(ObjectTemplate, null, ObjectTemplate);
// var ObjectTemplate = require('@haventech/supertype').default;
// var PersistObjectTemplate = require('../../dist/index.js')(ObjectTemplate, null, ObjectTemplate);
var logLevel = process.env.logLevel || 'debug';

PersistObjectTemplate.debugInfo = 'api;conflict;write;read;data';//'api;io';
PersistObjectTemplate.debugInfo = 'conflict;data';//'api;io';
PersistObjectTemplate.logger.setLevel(logLevel);
// import knex from 'knex';
import * as knexModule from 'knex';
const {knex }= knexModule;


import { expect } from 'chai';
import * as mocha from 'mocha';
import * as _ from 'underscore';
import {Employee} from "./Employee.js";
import bluebirdModule from 'bluebird';
const {Promise} = bluebirdModule;
import {Responsibility} from "./Responsibility.js";


var schema = {
    Employee: {
        documentOf: 'pg/employee',
        children: {
            responsibilities: {id: 'employee_id'},
        }
    },
    Responsibility: {
        documentOf: 'pg/responsibility',
        parents: {
            employee: {id: 'employee_id'}
        }
    },
};



describe('Banking from pgsql Example one-to-manychecks typescript', function () {
    var knexObj;

        before('arrange', function () {
            (function () {
                knexObj = knex({
                    client: 'pg',
                    debug: true,
                    connection: {
                        host: process.env.dbPath,
                        database: process.env.dbName,
                        user: process.env.dbUser,
                        password: process.env.dbPassword
                    }
                });

                PersistObjectTemplate.setDB(knexObj, PersistObjectTemplate.DB_Knex,  'pg');
                PersistObjectTemplate.setSchema(schema);
                PersistObjectTemplate.performInjections();

            })();

            return cleanDB()
                .then(createTables.bind(this))
                .then(prepareData.bind(this));

            function cleanDB() {
                return Promise.all([
                    knexObj.schema.dropTableIfExists('index_schema_history'),
                    knexObj.schema.dropTableIfExists('employee'),
                    knexObj.schema.dropTableIfExists('responsibility')]);
            }

            function createTables() {
                return Promise.all([
                    PersistObjectTemplate.synchronizeKnexTableFromTemplate(Employee),
                    PersistObjectTemplate.synchronizeKnexTableFromTemplate(Responsibility)]);
            }

            function prepareData() {
                var ravi = new Employee('Ravi',  'Kumar');
                var test = new Employee('Test', 'RTest');

                var responsbility1 = new Responsibility('work1', 'doing work');
                var responsbility2 = new Responsibility('work2', 'doing work');
                ravi.responsibilities.push(responsbility1);
                test.responsibilities.push(responsbility2);

                return Promise.all([ravi.persistSave(),
                    test.persistSave(),
                    responsbility1.persistSave(),
                    responsbility2.persistSave(),
                ]);
            }
        });




    it('create a simple table', function () {
        return Employee.getFromPersistWithQuery({}, {responsibilities: true}).then (function (employees) {
            expect(employees[0].responsibilities.length).to.equal(1);
            expect(employees[1].responsibilities.length).to.equal(1);
        })
    });
});