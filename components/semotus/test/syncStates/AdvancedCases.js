"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./models/bootstrap");
var ret = bootstrap_1.bootstrap();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWR2YW5jZWRDYXNlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFkdmFuY2VkQ2FzZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxnREFBNkM7QUFFN0MsSUFBTSxHQUFHLEdBQUcscUJBQVMsRUFBRSxDQUFDO0FBRXhCLElBQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDMUIsSUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztBQUUxQjs7OztHQUlHO0FBQ0gsUUFBUSxDQUFDLHlFQUF5RSxFQUFFO0lBQ2hGLEVBQUUsQ0FBQyxxSEFBcUgsRUFBRTtJQUUxSCxDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyx3SUFBd0ksRUFBRTtJQUU3SSxDQUFDLENBQUMsQ0FBQztJQUNILEVBQUUsQ0FBQyx5SUFBeUksRUFBRTtJQUU5SSxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtib290c3RyYXB9IGZyb20gJy4vbW9kZWxzL2Jvb3RzdHJhcCc7XG5cbmNvbnN0IHJldCA9IGJvb3RzdHJhcCgpO1xuXG5jb25zdCBjbGllbnQgPSByZXQuY2xpZW50O1xuY29uc3Qgc2VydmVyID0gcmV0LnNlcnZlcjtcblxuLyoqXG4gKiBUZXN0IGNhc2VzIGZvciBzeW5jIHN0YXRlcy4gVGVzdHMgYWR2YW5jZWQgb2JqZWN0IHN5bmNocm9uaXphdGlvblxuICpcbiAqIFRoaXMgdGVzdHMgc2NlbmFyaW9zIGludm9sdmluZyBjaGFuZ2luZyB0aGUgaW5pdGlhbCBzeW5jU3RhdGUgb2YgdGhlIGFwcCBpbiB0aGUgbWlkc3Qgb2YgZXhlY3V0aW9uIHRocm91Z2ggYW4gQHJlbW90ZSBjYWxsXG4gKi9cbmRlc2NyaWJlKCdBZHZhbmNlZCBUZXN0IENhc2VzOiBPYmplY3QgU3luY2hyb25pemF0aW9uIGFmdGVyIG11dGF0aW9uIG9mIHN5bmNTdGF0ZScsICgpID0+IHtcbiAgICBpdCgnTm8gYXBwIHJlc3RyaWN0aW9uLCBvbGQgc3luY1N0YXRlID0gey0sXCJcIn0sIG5ldyBzeW5jU3RhdGUgPSB7Kn06IFNob3VsZCBzZW5kIGFsbCBvYmplY3RzIHRvIHRoZSBjbGllbnQgYWZ0ZXIgY2hhbmdlJywgKCkgPT4ge1xuXG4gICAgfSk7XG4gICAgaXQoJ0FwcCBCIHJlc3RyaWN0aW9uLCBvbGQgc3luY1N0YXRlID0geyp9LCBuZXcgc3luY1N0YXRlID0geyssIGZpcnN0fTogU2hvdWxkIHNlbmQgYWxsIGNoYW5nZWQgQiBvYmplY3RzIGV4Y2VwdCB0aG9zZSB3aXRoIHN0YXRlID0gc2Vjb25kJywgKCkgPT4ge1xuXG4gICAgfSk7XG4gICAgaXQoJ0FwcCBCIHJlc3RyaWN0aW9uLCBvbGQgc3luY1N0YXRlID0geyp9LCBuZXcgc3luY1N0YXRlID0gey0sIHNlY29uZH06IFNob3VsZCBzaG91bGQgcmV0dXJuIG9ubHkgY2hhbmdlcyBvbiBCIG9iamVjdHMgd2l0aCBzdGF0ZSA9IHNlY29uZCcsICgpID0+IHtcblxuICAgIH0pO1xufSkiXX0=