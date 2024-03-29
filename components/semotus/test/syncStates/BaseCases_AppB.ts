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
        const ret = bootstrap('B');
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
    describe('Scope is *', function () {
        it('With state = second should return all B objects (app B restriction)', async function () {
            // Sam or CustomerA should exist on the property on the front end controller, but its properties should not
            // Karen or CustomerB should exist
            await setup(client, server, '*', 'second');
            await client.mainFunc();
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(client.sam.firstName).to.equal(undefined);
            expect(client.sam.lastName).to.equal(undefined);
            expect(client.sam.middleName).to.equal(undefined);
            expect(client.sam.addresses.length).to.equal(0);
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(server.karen.addresses.length).to.equal(4);
            expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
            expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
            // expect(server.allChanges).to.equal(resultsAppB[0]);
        });
    });
    describe('Scope is +', function () {
        it('With app B restriction and state = second will only return B and non-appA objects which do not have syncState = first', async function () {
            // Should retrieve Karen, Ashling, but not Sam, and only Karen latter 2 addresses
            await setup(client, server, '+', 'second');
            await client.mainFunc();
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(client.sam.firstName).to.equal(undefined);
            expect(client.sam.lastName).to.equal(undefined);
            expect(client.sam.middleName).to.equal(undefined);
            expect(client.ashling.firstName).to.equal('Ashling');
            expect(client.ashling.lastName).to.equal('Burke');
            expect(client.ashling.middleName).to.equal('');
            expect(client.sam.addresses.length).to.equal(0);
            expect(server.karen.firstName).to.equal(client.karen.firstName);

            // At this moment, this will not remove the object references themselves, but they will be empty objects
            expect(client.karen.addresses.length).to.equal(4);
            expect(server.karen.addresses.length).to.equal(4);
            expect(client.ashling.addresses.length).to.equal(1);

            // Addresses and related properties on clients that are linked to Part 1 should be undefined
            expect(server.karen.addresses[0].city).to.not.equal(client.karen.addresses[0].city);
            expect(server.karen.addresses[1].city).to.not.equal(client.karen.addresses[1].city);

            expect(client.karen.addresses[0].city).to.be.undefined;
            expect(client.karen.addresses[1].city).to.be.undefined;
            expect(client.karen.addresses[0].account).to.be.undefined;
            expect(client.karen.addresses[1].account).to.be.undefined;
            expect(client.karen.addresses[2].account).to.not.be.undefined;
            expect(client.karen.addresses[2].account.title[0]).to.equal('Dummy');

            expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
            expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
            // expect(server.allChanges).to.equal(resultsAppB[1]);
        });
    });
    describe('Scope is -', function () {
        it('With app B restriction and state = second will only return changed B objects which syncState = second.', async function () {
            // Should only retrieve Karen second stage addresses
            await setup(client, server, '*', 'second');
            await client.mainFunc();
            client.karen.middleName = 'yo';
            await client.setStateNoReset('server', '-', 'second');
            await client.alternateRemoteFunction();
            // TODO: add assertion for messageCopy.changes here to make sure we are only getting addressess

            expect(server.karen.middleName).to.not.equal(client.karen.middleName);
            expect(client.karen.middleName).to.equal('yo');
            expect(server.karen.middleName).to.equal('dont change');
            expect(client.karen.addresses[3].type).to.equal(server.karen.addresses[3].type);
            expect(client.karen.addresses[0].type).to.not.equal(server.karen.addresses[0].type);
            expect(client.karen.addresses[3].type).to.equal('something');
            expect(server.karen.addresses[0].type).to.equal('nothing');

            expect(client.sam.firstName).to.not.equal(server.sam.firstName);
            expect(client.sam.middleName).to.not.equal(server.sam.middleName);
            expect(client.sam.lastName).to.not.equal(server.sam.lastName);
            // expect(server.allChanges).to.equal(resultsAppB[1]);
        });
    });
});
