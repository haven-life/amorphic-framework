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
var chai_1 = require("chai");
var bootstrap_1 = require("./models/bootstrap");
var server;
var client;
/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', function () {
    before(function () {
        var ret = bootstrap_1.bootstrap('Both');
        client = ret.client;
        server = ret.server;
    });
    describe('Scope is *', function () {
        afterEach(function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, client.reset()];
                        case 1:
                            _a.sent();
                            chai_1.expect(client.controller.sam).to.equal(null);
                            chai_1.expect(client.controller.karen).to.equal(null);
                            chai_1.expect(client.controller.ashling).to.equal(null);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Default test: Returns all objects for all apps', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, bootstrap_1.setup(client, server, '*')];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(server.sam.firstName).to.equal(client.sam.firstName);
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(client.karen.addresses.length).to.equal(4);
                            chai_1.expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
                            chai_1.expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
                            return [2 /*return*/];
                    }
                });
            });
        });
        it('Regardless of state should return everything (no app restriction)', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, bootstrap_1.setup(client, server, '*', 'first')];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(server.sam.firstName).to.equal(client.sam.firstName);
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(client.karen.addresses.length).to.equal(4);
                            chai_1.expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
                            chai_1.expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzX0JvdGhBcHBzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQmFzZUNhc2VzX0JvdGhBcHBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNEI7QUFDNUIsZ0RBQW9EO0FBR3BELElBQUksTUFBTSxDQUFDO0FBQ1gsSUFBSSxNQUFNLENBQUM7QUFFWDs7R0FFRztBQUNILFFBQVEsQ0FBQyxrREFBa0QsRUFBRTtJQUN6RCxNQUFNLENBQUM7UUFDSCxJQUFNLEdBQUcsR0FBRyxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQ3BCLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsUUFBUSxDQUFDLFlBQVksRUFBRTtRQUNuQixTQUFTLENBQUM7Ozs7Z0NBQ04scUJBQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFBOzs0QkFBcEIsU0FBb0IsQ0FBQzs0QkFDckIsYUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDN0MsYUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDL0MsYUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzs7Ozs7U0FDcEQsQ0FBQyxDQUFBO1FBQ0YsRUFBRSxDQUFDLGdEQUFnRCxFQUFFOzs7O2dDQUNqRCxxQkFBTSxpQkFBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLEVBQUE7OzRCQUFoQyxTQUFnQyxD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aW1wb3J0IHtleHBlY3R9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHtib290c3RyYXAsIHNldHVwfSBmcm9tICcuL21vZGVscy9ib290c3RyYXAnO1xuXG5cbmxldCBzZXJ2ZXI7XG5sZXQgY2xpZW50O1xuXG4vKipcbiAqIFRlc3QgY2FzZXMgZm9yIHN5bmMgc3RhdGVzLiBUZXN0cyBiYXNpYyBvYmplY3Qgc3luY2hyb25pemF0aW9uIC8gc2VuZGluZyBvZiBvYmplY3RzIGZyb20gc2VydmVyIHRvIGNsaWVudCBvbiBpbml0aWFsIGxvYWRzXG4gKi9cbmRlc2NyaWJlKCdCYXNpYyBUZXN0IENhc2VzOiBJbml0aWFsIE9iamVjdCBTeW5jaHJvbml6YXRpb24nLCAoKSA9PiB7XG4gICAgYmVmb3JlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgcmV0ID0gYm9vdHN0cmFwKCdCb3RoJyk7XG4gICAgICAgIGNsaWVudCA9IHJldC5jbGllbnQ7XG4gICAgICAgIHNlcnZlciA9IHJldC5zZXJ2ZXI7XG4gICAgfSk7XG4gICAgZGVzY3JpYmUoJ1Njb3BlIGlzIConLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFmdGVyRWFjaChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhd2FpdCBjbGllbnQucmVzZXQoKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuY29udHJvbGxlci5zYW0pLnRvLmVxdWFsKG51bGwpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5jb250cm9sbGVyLmthcmVuKS50by5lcXVhbChudWxsKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuY29udHJvbGxlci5hc2hsaW5nKS50by5lcXVhbChudWxsKTtcbiAgICAgICAgfSlcbiAgICAgICAgaXQoJ0RlZmF1bHQgdGVzdDogUmV0dXJucyBhbGwgb2JqZWN0cyBmb3IgYWxsIGFwcHMnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhd2FpdCBzZXR1cChjbGllbnQsIHNlcnZlciwgJyonKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5maXJzdE5hbWUpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQuc2FtLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDQpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSk7XG4gICAgICAgICAgICAvLyBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNCb3RoWzBdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGl0KCdSZWdhcmRsZXNzIG9mIHN0YXRlIHNob3VsZCByZXR1cm4gZXZlcnl0aGluZyAobm8gYXBwIHJlc3RyaWN0aW9uKScsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnKicsICdmaXJzdCcpO1xuICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm1haW5GdW5jKCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLnNhbS5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5zYW0uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoNCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KS50by5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzJdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KTtcbiAgICAgICAgICAgIC8vIGV4cGVjdChzZXJ2ZXIuYWxsQ2hhbmdlcykudG8uZXF1YWwocmVzdWx0c0JvdGhbMV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pO1xuIl19