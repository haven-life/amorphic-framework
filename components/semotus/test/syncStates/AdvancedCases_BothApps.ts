import {expect} from 'chai';
import {bootstrap, setup} from './models/bootstrap';

let Changes = require('../../dist/helpers/Changes');

let server;
let client;


/**
 * @TODO: WIP Tests for advanced use cases regarding sync states
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Advanced Test Cases: Object Synchronization after mutation of syncState', function () {
    before(function () {
        const ret = bootstrap('Both');
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

    it('No app restriction, old syncState = {-,"default"}, new syncState = {*}: Should send all objects to the client after change', async function () {
        // Should not retrieve anything, since no stage matches 'default'
        await setup(client, server, '-', 'default');
        await client.mainFunc(); // Initial setup

        // Server changes to client will not be synced over on initial sync
        expect(client.sam.addresses.length).to.equal(0);
        expect(client.karen.addresses.length).to.equal(0);
        expect(client.ashling.addresses.length).to.equal(0);
        expect(server.sam.addresses.length).to.equal(2);
        expect(server.karen.addresses.length).to.equal(4);
        expect(server.ashling.addresses.length).to.equal(1);
        expect(client.karen.firstName).to.be.undefined;
        expect(client.karen.middleName).to.be.undefined;
        expect(server.karen.firstName).to.equal('Karen');
        expect(server.karen.middleName).to.equal('M');

        // Only fields that have changed after the new syncState will be sent over
        await client.setStateNoReset('server', '*', '');
        await client.alternateRemoteFunction();

        expect(client.karen.firstName).to.be.undefined;
        expect(client.karen.middleName).to.equal(server.karen.middleName);
        expect(server.karen.middleName).to.equal('dont change');

        expect(server.sam.firstName).to.equal(client.sam.firstName);
        expect(client.karen.addresses.length).to.equal(0);
        expect(server.karen.addresses[0].type).to.equal(client.karen.addresses[0].type);
        expect(server.karen.addresses[3].type).to.equal(client.karen.addresses[3].type);
        expect(server.karen.addresses[3].type).to.equal('nothing');
        expect(server.karen.addresses[0].type).to.equal('something');
        expect(server.karen.middleName).to.equal('dont change');

    });
});
