import {bootstrap} from './models/bootstrap';

const ret = bootstrap();

const client = ret.client;
const server = ret.server;

/**
 * Test cases for sync states. Tests SUPER advanced change synchronization use cases
 *
 * This tests scenarios involve checking whether the client should be able to send changes on existing objects on the client to the server
 * after the syncState has been mutated on the server.
 */
describe('Super Advanced Test Cases: Change Synchronization from Client to Server', () => {
    describe('App B restriction and old scope = *', () => {
        it('New syncState = {-, second}, after update, client tries to change object with state = first: Result = False', () => {

        });
        it('New syncState = {-, second}, after update, client tries to change object with state = second: Result = True', () => {

        });
    });
    describe('App B restriction and old syncState = {-, ""}', () => {
        it('New scope = *, after update, client tries to change object: Result = True', () => {

        });
    });
    describe('App B restriction and old syncState = {+, "first"}', () => {
        it('New syncState = {+, second}, after update, client tries to change object with state = second: Result = False', () => {

        });
        it('New syncState = {+, second}, after update, client tries to change object with state = first: Result = True', () => {

        });
    });
})