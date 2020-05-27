"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./models/bootstrap");
var ret = bootstrap_1.bootstrap('');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3VwZXJDYXNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlN1cGVyQ2FzZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBNkM7QUFFN0MsSUFBTSxHQUFHLEdBQUcscUJBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUUxQixJQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQzFCLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFFMUI7Ozs7O0dBS0c7QUFDSCxRQUFRLENBQUMseUVBQXlFLEVBQUU7SUFDaEYsUUFBUSxDQUFDLHFDQUFxQyxFQUFFO1FBQzVDLEVBQUUsQ0FBQyw2R0FBNkcsRUFBRTtRQUVsSCxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyw2R0FBNkcsRUFBRTtRQUVsSCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLCtDQUErQyxFQUFFO1FBQ3RELEVBQUUsQ0FBQywyRUFBMkUsRUFBRTtRQUVoRixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLG9EQUFvRCxFQUFFO1FBQzNELEVBQUUsQ0FBQyw4R0FBOEcsRUFBRTtRQUVuSCxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyw0R0FBNEcsRUFBRTtRQUVqSCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnLi9tb2RlbHMvYm9vdHN0cmFwJztcblxuY29uc3QgcmV0ID0gYm9vdHN0cmFwKCcnKTtcblxuY29uc3QgY2xpZW50ID0gcmV0LmNsaWVudDtcbmNvbnN0IHNlcnZlciA9IHJldC5zZXJ2ZXI7XG5cbi8qKlxuICogVGVzdCBjYXNlcyBmb3Igc3luYyBzdGF0ZXMuIFRlc3RzIFNVUEVSIGFkdmFuY2VkIGNoYW5nZSBzeW5jaHJvbml6YXRpb24gdXNlIGNhc2VzXG4gKlxuICogVGhpcyB0ZXN0cyBzY2VuYXJpb3MgaW52b2x2ZSBjaGVja2luZyB3aGV0aGVyIHRoZSBjbGllbnQgc2hvdWxkIGJlIGFibGUgdG8gc2VuZCBjaGFuZ2VzIG9uIGV4aXN0aW5nIG9iamVjdHMgb24gdGhlIGNsaWVudCB0byB0aGUgc2VydmVyXG4gKiBhZnRlciB0aGUgc3luY1N0YXRlIGhhcyBiZWVuIG11dGF0ZWQgb24gdGhlIHNlcnZlci5cbiAqL1xuZGVzY3JpYmUoJ1N1cGVyIEFkdmFuY2VkIFRlc3QgQ2FzZXM6IENoYW5nZSBTeW5jaHJvbml6YXRpb24gZnJvbSBDbGllbnQgdG8gU2VydmVyJywgKCkgPT4ge1xuICAgIGRlc2NyaWJlKCdBcHAgQiByZXN0cmljdGlvbiBhbmQgb2xkIHNjb3BlID0gKicsICgpID0+IHtcbiAgICAgICAgaXQoJ05ldyBzeW5jU3RhdGUgPSB7LSwgc2Vjb25kfSwgYWZ0ZXIgdXBkYXRlLCBjbGllbnQgdHJpZXMgdG8gY2hhbmdlIG9iamVjdCB3aXRoIHN0YXRlID0gZmlyc3Q6IFJlc3VsdCA9IEZhbHNlJywgKCkgPT4ge1xuXG4gICAgICAgIH0pO1xuICAgICAgICBpdCgnTmV3IHN5bmNTdGF0ZSA9IHstLCBzZWNvbmR9LCBhZnRlciB1cGRhdGUsIGNsaWVudCB0cmllcyB0byBjaGFuZ2Ugb2JqZWN0IHdpdGggc3RhdGUgPSBzZWNvbmQ6IFJlc3VsdCA9IFRydWUnLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVzY3JpYmUoJ0FwcCBCIHJlc3RyaWN0aW9uIGFuZCBvbGQgc3luY1N0YXRlID0gey0sIFwiXCJ9JywgKCkgPT4ge1xuICAgICAgICBpdCgnTmV3IHNjb3BlID0gKiwgYWZ0ZXIgdXBkYXRlLCBjbGllbnQgdHJpZXMgdG8gY2hhbmdlIG9iamVjdDogUmVzdWx0ID0gVHJ1ZScsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZXNjcmliZSgnQXBwIEIgcmVzdHJpY3Rpb24gYW5kIG9sZCBzeW5jU3RhdGUgPSB7KywgXCJmaXJzdFwifScsICgpID0+IHtcbiAgICAgICAgaXQoJ05ldyBzeW5jU3RhdGUgPSB7Kywgc2Vjb25kfSwgYWZ0ZXIgdXBkYXRlLCBjbGllbnQgdHJpZXMgdG8gY2hhbmdlIG9iamVjdCB3aXRoIHN0YXRlID0gc2Vjb25kOiBSZXN1bHQgPSBGYWxzZScsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICAgICAgaXQoJ05ldyBzeW5jU3RhdGUgPSB7Kywgc2Vjb25kfSwgYWZ0ZXIgdXBkYXRlLCBjbGllbnQgdHJpZXMgdG8gY2hhbmdlIG9iamVjdCB3aXRoIHN0YXRlID0gZmlyc3Q6IFJlc3VsdCA9IFRydWUnLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG59KSJdfQ==