import { bootstrap } from './models/bootstrap';

const ret = bootstrap('');

const client = ret.client;
const server = ret.server;

/**
 * @TODO: WIP Tests for advanced use cases regarding sync states
 * Test cases for sync states. Tests advanced object synchronization
 *
 * This tests scenarios involving changing the initial syncState of the app in the midst of execution through an @remote call
 */
describe('Advanced Test Cases: Object Synchronization after mutation of syncState', function () {
        it('App B restriction, old syncState = {*}, new syncState = {+, first}: Should send all changed B objects except those with state = second', () => {

        });
        it('App B restriction, old syncState = {*}, new syncState = {-, second}: Should should return only changes on B objects with state = second', () => {

        });
    }
)