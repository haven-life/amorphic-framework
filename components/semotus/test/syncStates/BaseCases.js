"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var bootstrap_1 = require("./models/bootstrap");
var chai_1 = require("chai");
var BaseCases_1 = require("./results/BaseCases");
var ret = bootstrap_1.bootstrap();
var client = ret.client;
var server = ret.server;
/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', function () {
    describe('Scope is *', function () {
        beforeEach(function () {
            server.mockServerInit(); // Act as if we're initializing the server here
        });
        afterEach(function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, server.reset('server', '*')];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        it.only('Default test: Returns all objects for all apps', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.timeout(5000);
                            return [4 /*yield*/, client.mainFunc()];
                        case 1:
                            _a.sent();
                            chai_1.expect(server.allChanges).to.equal(BaseCases_1.results[0]);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Regardless of state should return everything (no app restriction)', function () {
        });
        it('With state = second should return all B objects (app B restriction)', function () {
        });
    });
    describe('Scope is +', function () {
        it('With app B restriction and state = second will return all B objects with syncState = first', function () {
        });
        it('With no app restrictions and state = second, will return everything but objects with syncState = first', function () {
        });
        it('With app A restriction and state = first, will return all A objects (A has no states)', function () {
        });
    });
    describe('Scope is -', function () {
        it('With no app restriction and no state defined, should return nothing', function () {
        });
        it('With app A restriction and state = second should return nothing (A has no objects with syncStates matching)', function () {
        });
        it('With app B restriction and state = second should return only B objects with syncStates = second', function () {
        });
    });
    it('Edge case: No scope or syncstates defined', function () {
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQmFzZUNhc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBNkM7QUFFN0MsNkJBQTRCO0FBQzVCLGlEQUE0QztBQUU1QyxJQUFNLEdBQUcsR0FBRyxxQkFBUyxFQUFFLENBQUM7QUFFeEIsSUFBTSxNQUFNLEdBQWUsR0FBRyxDQUFDLE1BQU0sQ0FBQztBQUN0QyxJQUFNLE1BQU0sR0FBZSxHQUFHLENBQUMsTUFBTSxDQUFDO0FBRXRDOztHQUVHO0FBQ0gsUUFBUSxDQUFDLGtEQUFrRCxFQUFFO0lBQ3pELFFBQVEsQ0FBQyxZQUFZLEVBQUU7UUFDbkIsVUFBVSxDQUFDO1lBQ1AsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsK0NBQStDO1FBQzVFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsU0FBUyxDQUFDOzs7O2dDQUNOLHFCQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFBOzs0QkFBakMsU0FBaUMsQ0FBQzs7Ozs7U0FDckMsQ0FBQyxDQUFDO1FBQ0gsRUFBRSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsRUFBRTs7Ozs7NEJBQ3RELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ25CLHFCQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQTs7NEJBQXZCLFNBQXVCLENBQUM7NEJBQ3hCLGFBQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxtQkFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Ozs7O1NBQ2xELENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyxtRUFBbUUsRUFBRTtRQUV4RSxDQUFDLENBQUMsQ0FBQztRQUNILEVBQUUsQ0FBQyxxRUFBcUUsRUFBRTtRQUUxRSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLFlBQVksRUFBRTtRQUNuQixFQUFFLENBQUMsNEZBQTRGLEVBQUU7UUFFakcsQ0FBQyxDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsd0dBQXdHLEVBQUU7UUFFN0csQ0FBQyxDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsdUZBQXVGLEVBQUU7UUFFNUYsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxZQUFZLEVBQUU7UUFDbkIsRUFBRSxDQUFDLHFFQUFxRSxFQUFFO1FBRTFFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsRUFBRSxDQUFDLDZHQUE2RyxFQUFFO1FBRWxILENBQUMsQ0FBQyxDQUFDO1FBQ0gsRUFBRSxDQUFDLGlHQUFpRyxFQUFFO1FBRXRHLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsMkNBQTJDLEVBQUU7SUFFaEQsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Ym9vdHN0cmFwfSBmcm9tICcuL21vZGVscy9ib290c3RyYXAnO1xuaW1wb3J0IHtDb250cm9sbGVyfSBmcm9tICcuL21vZGVscy9Db250cm9sbGVyJ1xuaW1wb3J0IHtleHBlY3R9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHtyZXN1bHRzfSBmcm9tICcuL3Jlc3VsdHMvQmFzZUNhc2VzJztcblxuY29uc3QgcmV0ID0gYm9vdHN0cmFwKCk7XG5cbmNvbnN0IGNsaWVudDogQ29udHJvbGxlciA9IHJldC5jbGllbnQ7XG5jb25zdCBzZXJ2ZXI6IENvbnRyb2xsZXIgPSByZXQuc2VydmVyO1xuXG4vKipcbiAqIFRlc3QgY2FzZXMgZm9yIHN5bmMgc3RhdGVzLiBUZXN0cyBiYXNpYyBvYmplY3Qgc3luY2hyb25pemF0aW9uIC8gc2VuZGluZyBvZiBvYmplY3RzIGZyb20gc2VydmVyIHRvIGNsaWVudCBvbiBpbml0aWFsIGxvYWRzXG4gKi9cbmRlc2NyaWJlKCdCYXNpYyBUZXN0IENhc2VzOiBJbml0aWFsIE9iamVjdCBTeW5jaHJvbml6YXRpb24nLCAoKSA9PiB7XG4gICAgZGVzY3JpYmUoJ1Njb3BlIGlzIConLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGJlZm9yZUVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VydmVyLm1vY2tTZXJ2ZXJJbml0KCk7IC8vIEFjdCBhcyBpZiB3ZSdyZSBpbml0aWFsaXppbmcgdGhlIHNlcnZlciBoZXJlXG4gICAgICAgIH0pO1xuICAgICAgICBhZnRlckVhY2goYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXdhaXQgc2VydmVyLnJlc2V0KCdzZXJ2ZXInLCAnKicpO1xuICAgICAgICB9KTtcbiAgICAgICAgaXQub25seSgnRGVmYXVsdCB0ZXN0OiBSZXR1cm5zIGFsbCBvYmplY3RzIGZvciBhbGwgYXBwcycsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMudGltZW91dCg1MDAwKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5hbGxDaGFuZ2VzKS50by5lcXVhbChyZXN1bHRzWzBdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGl0KCdSZWdhcmRsZXNzIG9mIHN0YXRlIHNob3VsZCByZXR1cm4gZXZlcnl0aGluZyAobm8gYXBwIHJlc3RyaWN0aW9uKScsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICAgICAgaXQoJ1dpdGggc3RhdGUgPSBzZWNvbmQgc2hvdWxkIHJldHVybiBhbGwgQiBvYmplY3RzIChhcHAgQiByZXN0cmljdGlvbiknLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgKycsICgpID0+IHtcbiAgICAgICAgaXQoJ1dpdGggYXBwIEIgcmVzdHJpY3Rpb24gYW5kIHN0YXRlID0gc2Vjb25kIHdpbGwgcmV0dXJuIGFsbCBCIG9iamVjdHMgd2l0aCBzeW5jU3RhdGUgPSBmaXJzdCcsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICAgICAgaXQoJ1dpdGggbm8gYXBwIHJlc3RyaWN0aW9ucyBhbmQgc3RhdGUgPSBzZWNvbmQsIHdpbGwgcmV0dXJuIGV2ZXJ5dGhpbmcgYnV0IG9iamVjdHMgd2l0aCBzeW5jU3RhdGUgPSBmaXJzdCcsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICAgICAgaXQoJ1dpdGggYXBwIEEgcmVzdHJpY3Rpb24gYW5kIHN0YXRlID0gZmlyc3QsIHdpbGwgcmV0dXJuIGFsbCBBIG9iamVjdHMgKEEgaGFzIG5vIHN0YXRlcyknLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgLScsICgpID0+IHtcbiAgICAgICAgaXQoJ1dpdGggbm8gYXBwIHJlc3RyaWN0aW9uIGFuZCBubyBzdGF0ZSBkZWZpbmVkLCBzaG91bGQgcmV0dXJuIG5vdGhpbmcnLCAoKSA9PiB7XG5cbiAgICAgICAgfSk7XG4gICAgICAgIGl0KCdXaXRoIGFwcCBBIHJlc3RyaWN0aW9uIGFuZCBzdGF0ZSA9IHNlY29uZCBzaG91bGQgcmV0dXJuIG5vdGhpbmcgKEEgaGFzIG5vIG9iamVjdHMgd2l0aCBzeW5jU3RhdGVzIG1hdGNoaW5nKScsICgpID0+IHtcblxuICAgICAgICB9KTtcbiAgICAgICAgaXQoJ1dpdGggYXBwIEIgcmVzdHJpY3Rpb24gYW5kIHN0YXRlID0gc2Vjb25kIHNob3VsZCByZXR1cm4gb25seSBCIG9iamVjdHMgd2l0aCBzeW5jU3RhdGVzID0gc2Vjb25kJywgKCkgPT4ge1xuXG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgaXQoJ0VkZ2UgY2FzZTogTm8gc2NvcGUgb3Igc3luY3N0YXRlcyBkZWZpbmVkJywgKCkgPT4ge1xuXG4gICAgfSk7XG59KSJdfQ==