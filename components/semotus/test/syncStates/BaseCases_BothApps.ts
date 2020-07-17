import {expect} from 'chai';
import {bootstrap, setup} from './models/bootstrap';

let Changes = require('../../dist/helpers/Changes');


let server;
let client;

/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', () => {
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
    describe('Scope is *', function () {
        it('Default test: Returns all objects for all apps', async function () {
            await setup(client, server, '*');
            // Server.syncState = { scope: '*', state: undefined }
            await client.mainFunc();
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(server.sam.firstName).to.equal(client.sam.firstName);
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(client.karen.addresses.length).to.equal(4);
            expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
            expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
            // expect(server.allChanges).to.equal(resultsBoth[0]);
        });
        it('Regardless of state should return everything (no app restriction)', async function () {
            await setup(client, server, '*', 'first');
            await client.mainFunc();
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(server.sam.firstName).to.equal(client.sam.firstName);
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(client.karen.addresses.length).to.equal(4);
            expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
            expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
            // expect(server.allChanges).to.equal(resultsBoth[1]);
        });
    });
    describe('Scope is +', function () {
        it('Should return all objects across both apps except those with state = first', async function () {
            await setup(client, server, '+', 'second');
            await client.mainFunc();
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(server.sam.firstName).to.equal(client.sam.firstName);
            expect(client.sam.lastName).to.equal('Elsamman');
            expect(client.sam.middleName).to.equal('M');
            expect(client.ashling.firstName).to.equal('Ashling');
            expect(client.ashling.lastName).to.equal('Burke');
            expect(client.ashling.middleName).to.equal('');
            expect(server.karen.firstName).to.equal(client.karen.firstName);

            // At this moment, this will not remove the object references themselves, but they will be empty objects
            expect(client.karen.addresses.length).to.equal(4);
            expect(server.karen.addresses.length).to.equal(4);
            expect(client.sam.addresses.length).to.equal(2);
            expect(server.sam.addresses[0].city).to.be.equal(client.sam.addresses[0].city);
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
        });
    });
    describe('Scope is -', function () {
        it('Expect everything to be transferred except for those objects with stage defined (Addresses and their accounts) to be transferred because state is set to undefined', async function () {
            await setup(client, server, '-', undefined);
            await client.mainFunc();
            expect(server.karen.firstName).to.equal(client.karen.firstName);
            expect(server.sam.firstName).to.equal(client.sam.firstName);
            expect(client.sam.lastName).to.equal('Elsamman');
            expect(client.sam.middleName).to.equal('M');
            expect(client.ashling.firstName).to.equal('Ashling');
            expect(client.ashling.lastName).to.equal('Burke');
            expect(client.ashling.middleName).to.equal('');
            expect(server.karen.firstName).to.equal(client.karen.firstName);

            expect(client.karen.addresses.length).to.equal(4);
            expect(server.karen.addresses.length).to.equal(4);
            expect(client.sam.addresses.length).to.equal(2);
            expect(client.ashling.addresses.length).to.equal(1);

            // Addresses and related properties on clients that are linked to Part 1 should be undefined
            expect(server.karen.addresses[0].city).to.not.equal(client.karen.addresses[0].city);
            expect(server.karen.addresses[1].city).to.not.equal(client.karen.addresses[1].city);
            expect(server.karen.addresses[2].city).to.not.equal(client.karen.addresses[2].city);
            expect(server.karen.addresses[3].city).to.not.equal(client.karen.addresses[3].city);

            expect(client.karen.addresses[0].city).to.be.undefined;
            expect(client.karen.addresses[1].city).to.be.undefined;
            expect(client.karen.addresses[0].account).to.be.undefined;
            expect(client.karen.addresses[1].account).to.be.undefined;
            expect(client.karen.addresses[2].city).to.be.undefined;
            expect(client.karen.addresses[3].city).to.be.undefined;
            expect(client.karen.addresses[2].account).to.be.undefined;
            expect(client.karen.addresses[3].account).to.be.undefined;
        });
    });
});
