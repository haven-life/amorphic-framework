import {bootstrap} from './bootstrap';

const ret = bootstrap();

const client = ret.client;
const server = ret.server;

/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', () => {
    describe('Scope is *', () => {
        it('Default test: Returns all objects for all apps', () => {

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