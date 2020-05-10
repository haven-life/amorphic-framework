"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./models/bootstrap");
var ret = bootstrap_1.bootstrap();
var client = ret.client;
var server = ret.server;
/**
 * Test cases for sync states. Tests SUPER advanced change synchronization use cases
 *
 * This tests scenarios involve checking whether the client should be able to send changes on existing objects on the client to the server
 * after the syncState has been mutated on the server.
 */
describe('Super Advanced Test Cases: Change Synchronization from Client to Server', function () {
    describe('App B restriction and old scope = *', function () {
        it('New syncState = {-, second}, after update, client tries to change object with state = first: Result = False', function () {
        });
        it('New syncState = {-, second}, after update, client tries to change object with state = second: Result = True', function () {
        });
    });
    describe('App B restriction and old syncState = {-, ""}', function () {
        it('New scope = *, after update, client tries to change object: Result = True', function () {
        });
    });
    describe('App B restriction and old syncState = {+, "first"}', function () {
        it('New syncState = {+, second}, after update, client tries to change object with state = second: Result = False', function () {
        });
        it('New syncState = {+, second}, after update, client tries to change object with state = first: Result = True', function () {
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3VwZXJBZHZhbmNlZENhc2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU3VwZXJBZHZhbmNlZENhc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsZ0RBQTZDO0FBRTdDLElBQU0sR0FBRyxHQUFHLHFCQUFTLEVBQUUsQ0FBQztBQUV4QixJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQzFCLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFFMUI7Ozs7O0dBS0c7QUFDSCxRQUFRLENBQUMseUVBQXlFLEVBQUU7SUFDaEYsUUFBUSxDQUFDLHFDQUFxQyxFQUFFO1FBQzVDLEVBQUUsQ0FBQyw2R0FBNkcsRUFBRTtRQUVsSCxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyw2R0FBNkcsRUFBRTtRQUVsSCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLCtDQUErQyxFQUFFO1FBQ3RELEVBQUUsQ0FBQywyRUFBMkUsRUFBRTtRQUVoRixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLG9EQUFvRCxFQUFFO1FBQzNELEVBQUUsQ0FBQyw4R0FBOEcsRUFBRTtRQUVuSCxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyw0R0FBNEcsRUFBRTtRQUVqSCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnLi9tb2RlbHMvYm9vdHN0cmFwJztcblxuY29uc3QgcmV0ID0gYm9vdHN0cmFwKCk7XG5cbmNvbnN0IGNsaWVudCA9IHJldC5jbGllbnQ7XG5jb25zdCBzZXJ2ZXIgPSByZXQuc2VydmVyO1xuXG4vKipcbiAqIFRlc3QgY2FzZXMgZm9yIHN5bmMgc3RhdGVzLiBUZXN0cyBTVVBFUiBhZHZhbmNlZCBjaGFuZ2Ugc3luY2hyb25pemF0aW9uIHVzZSBjYXNlc1xuICpcbiAqIFRoaXMgdGVzdHMgc2NlbmFyaW9zIGludm9sdmUgY2hlY2tpbmcgd2hldGhlciB0aGUgY2xpZW50IHNob3VsZCBiZSBhYmxlIHRvIHNlbmQgY2hhbmdlcyBvbiBleGlzdGluZyBvYmplY3RzIG9uIHRoZSBjbGllbnQgdG8gdGhlIHNlcnZlclxuICogYWZ0ZXIgdGhlIHN5bmNTdGF0ZSBoYXMgYmVlbiBtdXRhdGVkIG9uIHRoZSBzZXJ2ZXIuXG4gKi9cbmRlc2NyaWJlKCdTdXBlciBBZHZhbmNlZCBUZXN0IENhc2VzOiBDaGFuZ2UgU3luY2hyb25pemF0aW9uIGZyb20gQ2xpZW50IHRvIFNlcnZlcicsICgpID0+IHtcbiAgICBkZXNjcmliZSgnQXBwIEIgcmVzdHJpY3Rpb24gYW5kIG9sZCBzY29wZSA9IConLCAoKSA9PiB7XG4gICAgICAgIGl0KCdOZXcgc3luY1N0YXRlID0gey0sIHNlY29uZH0sIGFmdGVyIHVwZGF0ZSwgY2xpZW50IHRyaWVzIHRvIGNoYW5nZSBvYmplY3Qgd2l0aCBzdGF0ZSA9IGZpcnN0OiBSZXN1bHQgPSBGYWxzZScsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICAgICAgaXQoJ05ldyBzeW5jU3RhdGUgPSB7LSwgc2Vjb25kfSwgYWZ0ZXIgdXBkYXRlLCBjbGllbnQgdHJpZXMgdG8gY2hhbmdlIG9iamVjdCB3aXRoIHN0YXRlID0gc2Vjb25kOiBSZXN1bHQgPSBUcnVlJywgKCkgPT4ge1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlc2NyaWJlKCdBcHAgQiByZXN0cmljdGlvbiBhbmQgb2xkIHN5bmNTdGF0ZSA9IHstLCBcIlwifScsICgpID0+IHtcbiAgICAgICAgaXQoJ05ldyBzY29wZSA9ICosIGFmdGVyIHVwZGF0ZSwgY2xpZW50IHRyaWVzIHRvIGNoYW5nZSBvYmplY3Q6IFJlc3VsdCA9IFRydWUnLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVzY3JpYmUoJ0FwcCBCIHJlc3RyaWN0aW9uIGFuZCBvbGQgc3luY1N0YXRlID0geyssIFwiZmlyc3RcIn0nLCAoKSA9PiB7XG4gICAgICAgIGl0KCdOZXcgc3luY1N0YXRlID0geyssIHNlY29uZH0sIGFmdGVyIHVwZGF0ZSwgY2xpZW50IHRyaWVzIHRvIGNoYW5nZSBvYmplY3Qgd2l0aCBzdGF0ZSA9IHNlY29uZDogUmVzdWx0ID0gRmFsc2UnLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgICAgIGl0KCdOZXcgc3luY1N0YXRlID0geyssIHNlY29uZH0sIGFmdGVyIHVwZGF0ZSwgY2xpZW50IHRyaWVzIHRvIGNoYW5nZSBvYmplY3Qgd2l0aCBzdGF0ZSA9IGZpcnN0OiBSZXN1bHQgPSBUcnVlJywgKCkgPT4ge1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xufSkiXX0=