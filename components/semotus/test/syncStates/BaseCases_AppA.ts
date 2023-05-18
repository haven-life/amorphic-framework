import { expect } from 'chai';
import { bootstrap, setup } from './models/bootstrap';

let Changes = require('../../dist/cjs/helpers/Changes');

let server;
let client;


/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', function () {
    before(function () {
        const ret = bootstrap('A');
        client = ret.client;
        server = ret.server;
    });
    afterEach(async function () {
        await client.reset();
        Changes.clearClientSession(client.amorphic, client);
        expect(client.sam).to.equal(null);
        expect(client.karen).to.equal(null);
        expect(client.ashling).to.equal(null);
        expect(server.sam).to.equal(null);
        expect(server.karen).to.equal(null);
        expect(server.ashling).to.equal(null);
    })
    describe('Scope is +', function () {
        it('With app A restriction and state = first will return all non App B objects', async function () {
            // Sam (App A) has no state-specific objects
            await setup(client, server, '+', 'second');
            await client.mainFunc();
            expect(server.sam.firstName).to.equal(client.sam.firstName);
            expect(client.karen.firstName).to.equal(undefined);
            expect(client.karen.lastName).to.equal(undefined);
            expect(client.karen.middleName).to.equal(undefined);
            expect(client.ashling.firstName).to.equal('Ashling');
            expect(client.ashling.lastName).to.equal('Burke');
            expect(client.ashling.middleName).to.equal('');
            expect(client.karen.addresses.length).to.equal(0);
            expect(client.sam.addresses.length).to.equal(2);
            expect(server.sam.addresses.length).to.equal(2);
            expect(client.ashling.addresses.length).to.equal(1);

            expect(server.sam.addresses[0].city).to.equal(client.sam.addresses[0].city);
            expect(server.sam.addresses[1].city).to.equal(client.sam.addresses[1].city);
            // expect(server.allChanges).to.equal(resultsAppB[1]);
        });
    });
    describe('Scope is -', function () {
        it('With app A restriction and state = second, should not return any changes (except refs on controller)', async function () {
            await setup(client, server, '*', 'second');
            await client.mainFunc();
            await client.setStateNoReset('server', '-', 'second');
            server.mockServerInit();
            await client.alternateRemoteFunction();
            // TODO: add assertion for messageCopy.changes here to make sure we are only getting addressess

            expect(server.karen.middleName).to.not.equal(client.karen.middleName);
            expect(server.karen.addresses.length).to.not.equal(client.karen.addresses.length);
            expect(server.sam.addresses.length).to.not.equal(client.sam.addresses.length);
            expect(client.karen.addresses.length).to.equal(0);
            expect(client.sam.addresses.length).to.equal(0);

            expect(client.sam.firstName).to.not.equal(server.sam.firstName);
            expect(client.sam.middleName).to.not.equal(server.sam.middleName);
            expect(client.sam.lastName).to.not.equal(server.sam.lastName);
            // expect(server.allChanges).to.equal(resultsAppB[1]);
        });
    });
});
