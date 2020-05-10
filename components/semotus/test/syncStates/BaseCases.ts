import {bootstrap} from './models/bootstrap';
import {Controller} from './models/Controller'
import {expect} from 'chai';
import {results} from './results/BaseCases';

const ret = bootstrap();

const client: Controller = ret.client;
const server: Controller = ret.server;

/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', () => {
    describe('Scope is *', function () {
        beforeEach(function () {
            server.mockServerInit(); // Act as if we're initializing the server here
        });
        afterEach(async function () {
            await server.reset('server', '*');
        });
        it.only('Default test: Returns all objects for all apps', async function () {
            this.timeout(5000);
            await client.mainFunc();
            expect(server.allChanges).to.equal(results[0]);
        });
        it('Regardless of state should return everything (no app restriction)', () => {

        });
        it('With state = second should return all B objects (app B restriction)', () => {

        });
    });

    describe('Scope is +', () => {
        it('With app B restriction and state = second will return all B objects with syncState = first', () => {

        });
        it('With no app restrictions and state = second, will return everything but objects with syncState = first', () => {

        });
        it('With app A restriction and state = first, will return all A objects (A has no states)', () => {

        });
    });

    describe('Scope is -', () => {
        it('With no app restriction and no state defined, should return nothing', () => {

        });
        it('With app A restriction and state = second should return nothing (A has no objects with syncStates matching)', () => {

        });
        it('With app B restriction and state = second should return only B objects with syncStates = second', () => {

        });
    });

    it('Edge case: No scope or syncstates defined', () => {

    });
})