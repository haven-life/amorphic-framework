// import {bootstrap} from './models/bootstrap';
// import {expect} from 'chai';
// import {results} from './results/BaseCases';
//
//
// let server;
// let client;
//
// async function callBootstrap(app, scope?, state?) {
//     const ret = bootstrap(app);
//     const server = ret.server;
//     const client = ret.client;
//     if (scope) {
//         await server.setState('server', scope, state);
//     }
//     server.mockServerInit(); // Act as if we're initializing the server here
//     return {client, server};
// }
//
// /**
//  * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
//  */
// describe('Basic Test Cases: Initial Object Synchronization', () => {
//     describe('Scope is *', function () {
//         afterEach(async function () {
//             await server.setState('server', '*');
//         });
//         it('Default test: Returns all objects for all apps', async function () {
//             await callBootstrap('Both', '*');
//             await client.mainFunc();
//             expect(server.karen.firstName).to.equal(client.karen.firstName);
//             expect(server.sam.firstName).to.equal(client.sam.firstName);
//             expect(server.karen.firstName).to.equal(client.karen.firstName);
//             expect(server.karen.addresses.length).to.equal(4);
//             expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
//             expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
//             expect(server.allChanges).to.equal(results[0]);
//         });
//         it('Regardless of state should return everything (no app restriction)', async function () {
//             await callBootstrap('Both', '*', 'first');
//             await client.mainFunc();
//             expect(server.karen.firstName).to.equal(client.karen.firstName);
//             expect(server.sam.firstName).to.equal(client.sam.firstName);
//             expect(server.karen.firstName).to.equal(client.karen.firstName);
//             expect(server.karen.addresses.length).to.equal(4);
//             expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
//             expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
//             expect(server.allChanges).to.equal(results[0]);
//         });
//         it('With state = second should return all B objects (app B restriction)', () => {
//
//         });
//     });
//
//     describe('Scope is +', () => {
//         it('With app B restriction and state = second will return all B objects with syncState = first', () => {
//
//         });
//         it('With no app restrictions and state = second, will return everything but objects with syncState = first', () => {
//
//         });
//         it('With app A restriction and state = first, will return all A objects (A has no states)', () => {
//
//         });
//     });
//
//     describe('Scope is -', () => {
//         it('With no app restriction and no state defined, should return nothing', () => {
//
//         });
//         it('With app A restriction and state = second should return nothing (A has no objects with syncStates matching)', () => {
//
//         });
//         it('With app B restriction and state = second should return only B objects with syncStates = second', () => {
//
//         });
//     });
//
//     it('Edge case: No scope or syncstates defined', () => {
//
//     });
// })