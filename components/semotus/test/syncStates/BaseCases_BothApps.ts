import {expect} from 'chai';
import {bootstrap, setup} from './models/bootstrap';


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
    describe('Scope is *', function () {
        afterEach(async function () {
            await client.reset();
            expect(client.sam).to.equal(null);
            expect(client.karen).to.equal(null);
            expect(client.ashling).to.equal(null);
            expect(server.sam).to.equal(null);
            expect(server.karen).to.equal(null);
            expect(server.ashling).to.equal(null);
        })
        it('Default test: Returns all objects for all apps', async function () {
            await setup(client, server, '*');
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
});
