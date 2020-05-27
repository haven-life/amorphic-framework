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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQmFzZUNhc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGdEQUFnRDtBQUNoRCwrQkFBK0I7QUFDL0IsK0NBQStDO0FBQy9DLEVBQUU7QUFDRixFQUFFO0FBQ0YsY0FBYztBQUNkLGNBQWM7QUFDZCxFQUFFO0FBQ0Ysc0RBQXNEO0FBQ3RELGtDQUFrQztBQUNsQyxpQ0FBaUM7QUFDakMsaUNBQWlDO0FBQ2pDLG1CQUFtQjtBQUNuQix5REFBeUQ7QUFDekQsUUFBUTtBQUNSLCtFQUErRTtBQUMvRSwrQkFBK0I7QUFDL0IsSUFBSTtBQUNKLEVBQUU7QUFDRixNQUFNO0FBQ04sZ0lBQWdJO0FBQ2hJLE1BQU07QUFDTix1RUFBdUU7QUFDdkUsMkNBQTJDO0FBQzNDLHdDQUF3QztBQUN4QyxvREFBb0Q7QUFDcEQsY0FBYztBQUNkLG1GQUFtRjtBQUNuRixnREFBZ0Q7QUFDaEQsdUNBQXVDO0FBQ3ZDLCtFQUErRTtBQUMvRSwyRUFBMkU7QUFDM0UsK0VBQStFO0FBQy9FLGlFQUFpRTtBQUNqRSwrRkFBK0Y7QUFDL0YsK0ZBQStGO0FBQy9GLDhEQUE4RDtBQUM5RCxjQUFjO0FBQ2Qsc0dBQXNHO0FBQ3RHLHlEQUF5RDtBQUN6RCx1Q0FBdUM7QUFDdkMsK0VBQStFO0FBQy9FLDJFQUEyRTtBQUMzRSwrRUFBK0U7QUFDL0UsaUVBQWlFO0FBQ2pFLCtGQUErRjtBQUMvRiwrRkFBK0Y7QUFDL0YsOERBQThEO0FBQzlELGNBQWM7QUFDZCw0RkFBNEY7QUFDNUYsRUFBRTtBQUNGLGNBQWM7QUFDZCxVQUFVO0FBQ1YsRUFBRTtBQUNGLHFDQUFxQztBQUNyQyxtSEFBbUg7QUFDbkgsRUFBRTtBQUNGLGNBQWM7QUFDZCwrSEFBK0g7QUFDL0gsRUFBRTtBQUNGLGNBQWM7QUFDZCw4R0FBOEc7QUFDOUcsRUFBRTtBQUNGLGNBQWM7QUFDZCxVQUFVO0FBQ1YsRUFBRTtBQUNGLHFDQUFxQztBQUNyQyw0RkFBNEY7QUFDNUYsRUFBRTtBQUNGLGNBQWM7QUFDZCxvSUFBb0k7QUFDcEksRUFBRTtBQUNGLGNBQWM7QUFDZCx3SEFBd0g7QUFDeEgsRUFBRTtBQUNGLGNBQWM7QUFDZCxVQUFVO0FBQ1YsRUFBRTtBQUNGLDhEQUE4RDtBQUM5RCxFQUFFO0FBQ0YsVUFBVTtBQUNWLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnLi9tb2RlbHMvYm9vdHN0cmFwJztcbi8vIGltcG9ydCB7ZXhwZWN0fSBmcm9tICdjaGFpJztcbi8vIGltcG9ydCB7cmVzdWx0c30gZnJvbSAnLi9yZXN1bHRzL0Jhc2VDYXNlcyc7XG4vL1xuLy9cbi8vIGxldCBzZXJ2ZXI7XG4vLyBsZXQgY2xpZW50O1xuLy9cbi8vIGFzeW5jIGZ1bmN0aW9uIGNhbGxCb290c3RyYXAoYXBwLCBzY29wZT8sIHN0YXRlPykge1xuLy8gICAgIGNvbnN0IHJldCA9IGJvb3RzdHJhcChhcHApO1xuLy8gICAgIGNvbnN0IHNlcnZlciA9IHJldC5zZXJ2ZXI7XG4vLyAgICAgY29uc3QgY2xpZW50ID0gcmV0LmNsaWVudDtcbi8vICAgICBpZiAoc2NvcGUpIHtcbi8vICAgICAgICAgYXdhaXQgc2VydmVyLnNldFN0YXRlKCdzZXJ2ZXInLCBzY29wZSwgc3RhdGUpO1xuLy8gICAgIH1cbi8vICAgICBzZXJ2ZXIubW9ja1NlcnZlckluaXQoKTsgLy8gQWN0IGFzIGlmIHdlJ3JlIGluaXRpYWxpemluZyB0aGUgc2VydmVyIGhlcmVcbi8vICAgICByZXR1cm4ge2NsaWVudCwgc2VydmVyfTtcbi8vIH1cbi8vXG4vLyAvKipcbi8vICAqIFRlc3QgY2FzZXMgZm9yIHN5bmMgc3RhdGVzLiBUZXN0cyBiYXNpYyBvYmplY3Qgc3luY2hyb25pemF0aW9uIC8gc2VuZGluZyBvZiBvYmplY3RzIGZyb20gc2VydmVyIHRvIGNsaWVudCBvbiBpbml0aWFsIGxvYWRzXG4vLyAgKi9cbi8vIGRlc2NyaWJlKCdCYXNpYyBUZXN0IENhc2VzOiBJbml0aWFsIE9iamVjdCBTeW5jaHJvbml6YXRpb24nLCAoKSA9PiB7XG4vLyAgICAgZGVzY3JpYmUoJ1Njb3BlIGlzIConLCBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgIGFmdGVyRWFjaChhc3luYyBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICAgICBhd2FpdCBzZXJ2ZXIuc2V0U3RhdGUoJ3NlcnZlcicsICcqJyk7XG4vLyAgICAgICAgIH0pO1xuLy8gICAgICAgICBpdCgnRGVmYXVsdCB0ZXN0OiBSZXR1cm5zIGFsbCBvYmplY3RzIGZvciBhbGwgYXBwcycsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgICAgIGF3YWl0IGNhbGxCb290c3RyYXAoJ0JvdGgnLCAnKicpO1xuLy8gICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm1haW5GdW5jKCk7XG4vLyAgICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4vLyAgICAgICAgICAgICBleHBlY3Qoc2VydmVyLnNhbS5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5zYW0uZmlyc3ROYW1lKTtcbi8vICAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcbi8vICAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoNCk7XG4vLyAgICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KS50by5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzJdLmNpdHkpO1xuLy8gICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KTtcbi8vICAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIuYWxsQ2hhbmdlcykudG8uZXF1YWwocmVzdWx0c1swXSk7XG4vLyAgICAgICAgIH0pO1xuLy8gICAgICAgICBpdCgnUmVnYXJkbGVzcyBvZiBzdGF0ZSBzaG91bGQgcmV0dXJuIGV2ZXJ5dGhpbmcgKG5vIGFwcCByZXN0cmljdGlvbiknLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICAgICBhd2FpdCBjYWxsQm9vdHN0cmFwKCdCb3RoJywgJyonLCAnZmlyc3QnKTtcbi8vICAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuLy8gICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5maXJzdE5hbWUpO1xuLy8gICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQuc2FtLmZpcnN0TmFtZSk7XG4vLyAgICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4vLyAgICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDQpO1xuLy8gICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KTtcbi8vICAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSk7XG4vLyAgICAgICAgICAgICBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNbMF0pO1xuLy8gICAgICAgICB9KTtcbi8vICAgICAgICAgaXQoJ1dpdGggc3RhdGUgPSBzZWNvbmQgc2hvdWxkIHJldHVybiBhbGwgQiBvYmplY3RzIChhcHAgQiByZXN0cmljdGlvbiknLCAoKSA9PiB7XG4vL1xuLy8gICAgICAgICB9KTtcbi8vICAgICB9KTtcbi8vXG4vLyAgICAgZGVzY3JpYmUoJ1Njb3BlIGlzICsnLCAoKSA9PiB7XG4vLyAgICAgICAgIGl0KCdXaXRoIGFwcCBCIHJlc3RyaWN0aW9uIGFuZCBzdGF0ZSA9IHNlY29uZCB3aWxsIHJldHVybiBhbGwgQiBvYmplY3RzIHdpdGggc3luY1N0YXRlID0gZmlyc3QnLCAoKSA9PiB7XG4vL1xuLy8gICAgICAgICB9KTtcbi8vICAgICAgICAgaXQoJ1dpdGggbm8gYXBwIHJlc3RyaWN0aW9ucyBhbmQgc3RhdGUgPSBzZWNvbmQsIHdpbGwgcmV0dXJuIGV2ZXJ5dGhpbmcgYnV0IG9iamVjdHMgd2l0aCBzeW5jU3RhdGUgPSBmaXJzdCcsICgpID0+IHtcbi8vXG4vLyAgICAgICAgIH0pO1xuLy8gICAgICAgICBpdCgnV2l0aCBhcHAgQSByZXN0cmljdGlvbiBhbmQgc3RhdGUgPSBmaXJzdCwgd2lsbCByZXR1cm4gYWxsIEEgb2JqZWN0cyAoQSBoYXMgbm8gc3RhdGVzKScsICgpID0+IHtcbi8vXG4vLyAgICAgICAgIH0pO1xuLy8gICAgIH0pO1xuLy9cbi8vICAgICBkZXNjcmliZSgnU2NvcGUgaXMgLScsICgpID0+IHtcbi8vICAgICAgICAgaXQoJ1dpdGggbm8gYXBwIHJlc3RyaWN0aW9uIGFuZCBubyBzdGF0ZSBkZWZpbmVkLCBzaG91bGQgcmV0dXJuIG5vdGhpbmcnLCAoKSA9PiB7XG4vL1xuLy8gICAgICAgICB9KTtcbi8vICAgICAgICAgaXQoJ1dpdGggYXBwIEEgcmVzdHJpY3Rpb24gYW5kIHN0YXRlID0gc2Vjb25kIHNob3VsZCByZXR1cm4gbm90aGluZyAoQSBoYXMgbm8gb2JqZWN0cyB3aXRoIHN5bmNTdGF0ZXMgbWF0Y2hpbmcpJywgKCkgPT4ge1xuLy9cbi8vICAgICAgICAgfSk7XG4vLyAgICAgICAgIGl0KCdXaXRoIGFwcCBCIHJlc3RyaWN0aW9uIGFuZCBzdGF0ZSA9IHNlY29uZCBzaG91bGQgcmV0dXJuIG9ubHkgQiBvYmplY3RzIHdpdGggc3luY1N0YXRlcyA9IHNlY29uZCcsICgpID0+IHtcbi8vXG4vLyAgICAgICAgIH0pO1xuLy8gICAgIH0pO1xuLy9cbi8vICAgICBpdCgnRWRnZSBjYXNlOiBObyBzY29wZSBvciBzeW5jc3RhdGVzIGRlZmluZWQnLCAoKSA9PiB7XG4vL1xuLy8gICAgIH0pO1xuLy8gfSkiXX0=