"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./models/bootstrap");
var ret = bootstrap_1.bootstrap('');
var client = ret.client;
var server = ret.server;
/**
 * Test cases for sync states. Tests advanced object synchronization
 *
 * This tests scenarios involving changing the initial syncState of the app in the midst of execution through an @remote call
 */
describe('Advanced Test Cases: Object Synchronization after mutation of syncState', function () {
    it('No app restriction, old syncState = {-,""}, new syncState = {*}: Should send all objects to the client after change', function () {
    });
    it('App B restriction, old syncState = {*}, new syncState = {+, first}: Should send all changed B objects except those with state = second', function () {
    });
    it('App B restriction, old syncState = {*}, new syncState = {-, second}: Should should return only changes on B objects with state = second', function () {
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWR2YW5jZWRDYXNlc19BcHBCLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQWR2YW5jZWRDYXNlc19BcHBCLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsZ0RBQTZDO0FBRTdDLElBQU0sR0FBRyxHQUFHLHFCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFFMUIsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztBQUMxQixJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBRTFCOzs7O0dBSUc7QUFDSCxRQUFRLENBQUMseUVBQXlFLEVBQUU7SUFDaEYsRUFBRSxDQUFDLHFIQUFxSCxFQUFFO0lBRTFILENBQUMsQ0FBQyxDQUFDO0lBQ0gsRUFBRSxDQUFDLHdJQUF3SSxFQUFFO0lBRTdJLENBQUMsQ0FBQyxDQUFDO0lBQ0gsRUFBRSxDQUFDLHlJQUF5SSxFQUFFO0lBRTlJLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnLi9tb2RlbHMvYm9vdHN0cmFwJztcblxuY29uc3QgcmV0ID0gYm9vdHN0cmFwKCcnKTtcblxuY29uc3QgY2xpZW50ID0gcmV0LmNsaWVudDtcbmNvbnN0IHNlcnZlciA9IHJldC5zZXJ2ZXI7XG5cbi8qKlxuICogVGVzdCBjYXNlcyBmb3Igc3luYyBzdGF0ZXMuIFRlc3RzIGFkdmFuY2VkIG9iamVjdCBzeW5jaHJvbml6YXRpb25cbiAqXG4gKiBUaGlzIHRlc3RzIHNjZW5hcmlvcyBpbnZvbHZpbmcgY2hhbmdpbmcgdGhlIGluaXRpYWwgc3luY1N0YXRlIG9mIHRoZSBhcHAgaW4gdGhlIG1pZHN0IG9mIGV4ZWN1dGlvbiB0aHJvdWdoIGFuIEByZW1vdGUgY2FsbFxuICovXG5kZXNjcmliZSgnQWR2YW5jZWQgVGVzdCBDYXNlczogT2JqZWN0IFN5bmNocm9uaXphdGlvbiBhZnRlciBtdXRhdGlvbiBvZiBzeW5jU3RhdGUnLCAoKSA9PiB7XG4gICAgaXQoJ05vIGFwcCByZXN0cmljdGlvbiwgb2xkIHN5bmNTdGF0ZSA9IHstLFwiXCJ9LCBuZXcgc3luY1N0YXRlID0geyp9OiBTaG91bGQgc2VuZCBhbGwgb2JqZWN0cyB0byB0aGUgY2xpZW50IGFmdGVyIGNoYW5nZScsICgpID0+IHtcblxuICAgIH0pO1xuICAgIGl0KCdBcHAgQiByZXN0cmljdGlvbiwgb2xkIHN5bmNTdGF0ZSA9IHsqfSwgbmV3IHN5bmNTdGF0ZSA9IHsrLCBmaXJzdH06IFNob3VsZCBzZW5kIGFsbCBjaGFuZ2VkIEIgb2JqZWN0cyBleGNlcHQgdGhvc2Ugd2l0aCBzdGF0ZSA9IHNlY29uZCcsICgpID0+IHtcblxuICAgIH0pO1xuICAgIGl0KCdBcHAgQiByZXN0cmljdGlvbiwgb2xkIHN5bmNTdGF0ZSA9IHsqfSwgbmV3IHN5bmNTdGF0ZSA9IHstLCBzZWNvbmR9OiBTaG91bGQgc2hvdWxkIHJldHVybiBvbmx5IGNoYW5nZXMgb24gQiBvYmplY3RzIHdpdGggc3RhdGUgPSBzZWNvbmQnLCAoKSA9PiB7XG5cbiAgICB9KTtcbn0pIl19