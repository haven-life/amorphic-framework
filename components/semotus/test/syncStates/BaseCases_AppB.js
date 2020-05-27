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
var BaseCases_1 = require("./results/BaseCases");
var bootstrap_1 = require("./models/bootstrap");
var server;
var client;
/**
 * Test cases for sync states. Tests basic object synchronization / sending of objects from server to client on initial loads
 */
describe('Basic Test Cases: Initial Object Synchronization', function () {
    before(function () {
        var ret = bootstrap_1.bootstrap('B');
        client = ret.client;
        server = ret.server;
    });
    describe('Scope is *', function () {
        it('With state = second should return all B objects (app B restriction)', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Sam or CustomerA should exist on the property on the front end controller, but its properties should not
                        // Karen or CustomerB should exist
                        return [4 /*yield*/, bootstrap_1.setup(client, server, '*', 'second')];
                        case 1:
                            // Sam or CustomerA should exist on the property on the front end controller, but its properties should not
                            // Karen or CustomerB should exist
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(client.sam.firstName).to.equal(undefined);
                            chai_1.expect(client.sam.lastName).to.equal(undefined);
                            chai_1.expect(client.sam.middleName).to.equal(undefined);
                            chai_1.expect(client.sam.addresses.length).to.equal(0);
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(server.karen.addresses.length).to.equal(4);
                            chai_1.expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
                            chai_1.expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
                            chai_1.expect(server.allChanges).to.equal(BaseCases_1.resultsAppB[0]);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Scope is +', function () {
        it.only('With app B restriction and state = second will only return B and non-appA objects which do not have syncState = first', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Should retrieve Karen, Ashling, but not Sam, and only Karen latter 2 addresses
                        return [4 /*yield*/, bootstrap_1.setup(client, server, '+', 'second')];
                        case 1:
                            // Should retrieve Karen, Ashling, but not Sam, and only Karen latter 2 addresses
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(client.sam.firstName).to.equal(undefined);
                            chai_1.expect(client.sam.lastName).to.equal(undefined);
                            chai_1.expect(client.sam.middleName).to.equal(undefined);
                            chai_1.expect(client.ashling.firstName).to.equal('Ashling');
                            chai_1.expect(client.ashling.lastName).to.equal('Burke');
                            chai_1.expect(client.ashling.middleName).to.equal('');
                            chai_1.expect(client.sam.addresses.length).to.equal(0);
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            // At this moment, this will not remove the object references themselves, but they will be empty objects
                            chai_1.expect(client.karen.addresses.length).to.equal(4);
                            chai_1.expect(server.karen.addresses.length).to.equal(4);
                            chai_1.expect(client.ashling.addresses.length).to.equal(1);
                            // Addresses and related properties on clients that are linked to Part 1 should be undefined
                            chai_1.expect(server.karen.addresses[0].city).to.not.equal(client.karen.addresses[0].city);
                            chai_1.expect(server.karen.addresses[1].city).to.not.equal(client.karen.addresses[1].city);
                            chai_1.expect(client.karen.addresses[0].city).to.be.undefined;
                            chai_1.expect(client.karen.addresses[1].city).to.be.undefined;
                            chai_1.expect(client.karen.addresses[1].account).to.be.undefined;
                            chai_1.expect(client.karen.addresses[2].account).to.be.undefined;
                            chai_1.expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
                            chai_1.expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
                            chai_1.expect(server.allChanges).to.equal(BaseCases_1.resultsAppB[1]);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzX0FwcEIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJCYXNlQ2FzZXNfQXBwQi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTRCO0FBQzVCLGlEQUFnRDtBQUNoRCxnREFBb0Q7QUFHcEQsSUFBSSxNQUFNLENBQUM7QUFDWCxJQUFJLE1BQU0sQ0FBQztBQUdYOztHQUVHO0FBQ0gsUUFBUSxDQUFDLGtEQUFrRCxFQUFFO0lBQ3pELE1BQU0sQ0FBQztRQUNILElBQU0sR0FBRyxHQUFHLHFCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7UUFDcEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDSCxRQUFRLENBQUMsWUFBWSxFQUFFO1FBQ25CLEVBQUUsQ0FBQyxxRUFBcUUsRUFBRTs7Ozs7d0JBQ3RFLDJHQUEyRzt3QkFDM0csa0NBQWtDO3dCQUNsQyxxQkFBTSxpQkFBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUFBOzs0QkFGMUMsMkdBQTJHOzRCQUMzRyxrQ0FBa0M7NEJBQ2xDLFNBQTBDLENBQUM7NEJBQzNDLHFCQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQTs7NEJBQXZCLFNBQXVCLENBQUM7NEJBQ3hCLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDaEUsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDakQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDaEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDaEUsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNoRixhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDaEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLHVCQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Ozs7U0FDdEQsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDSCxRQUFRLENBQUMsWUFBWSxFQUFFO1FBQ25CLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUhBQXVILEVBQUU7Ozs7O3dCQUM3SCxpRkFBaUY7d0JBQ2pGLHFCQUFNLGlCQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLEVBQUE7OzRCQUQxQyxpRkFBaUY7NEJBQ2pGLFNBQTBDLENBQUM7NEJBQzNDLHFCQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBQTs7NEJBQXZCLFNBQXVCLENBQUM7NEJBQ3hCLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDaEUsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDakQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDaEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDckQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDL0MsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFFaEUsd0dBQXdHOzRCQUN4RyxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xELGFBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUVwRCw0RkFBNEY7NEJBQzVGLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDcEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUVwRixhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBQ3ZELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQzs0QkFDdkQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDOzRCQUMxRCxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBRTFELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNoRixhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDaEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLHVCQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Ozs7U0FDdEQsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7ZXhwZWN0fSBmcm9tICdjaGFpJztcbmltcG9ydCB7cmVzdWx0c0FwcEJ9IGZyb20gJy4vcmVzdWx0cy9CYXNlQ2FzZXMnO1xuaW1wb3J0IHtib290c3RyYXAsIHNldHVwfSBmcm9tICcuL21vZGVscy9ib290c3RyYXAnO1xuXG5cbmxldCBzZXJ2ZXI7XG5sZXQgY2xpZW50O1xuXG5cbi8qKlxuICogVGVzdCBjYXNlcyBmb3Igc3luYyBzdGF0ZXMuIFRlc3RzIGJhc2ljIG9iamVjdCBzeW5jaHJvbml6YXRpb24gLyBzZW5kaW5nIG9mIG9iamVjdHMgZnJvbSBzZXJ2ZXIgdG8gY2xpZW50IG9uIGluaXRpYWwgbG9hZHNcbiAqL1xuZGVzY3JpYmUoJ0Jhc2ljIFRlc3QgQ2FzZXM6IEluaXRpYWwgT2JqZWN0IFN5bmNocm9uaXphdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICBiZWZvcmUoZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCByZXQgPSBib290c3RyYXAoJ0InKTtcbiAgICAgICAgY2xpZW50ID0gcmV0LmNsaWVudDtcbiAgICAgICAgc2VydmVyID0gcmV0LnNlcnZlcjtcbiAgICB9KTtcbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgKicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ1dpdGggc3RhdGUgPSBzZWNvbmQgc2hvdWxkIHJldHVybiBhbGwgQiBvYmplY3RzIChhcHAgQiByZXN0cmljdGlvbiknLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBTYW0gb3IgQ3VzdG9tZXJBIHNob3VsZCBleGlzdCBvbiB0aGUgcHJvcGVydHkgb24gdGhlIGZyb250IGVuZCBjb250cm9sbGVyLCBidXQgaXRzIHByb3BlcnRpZXMgc2hvdWxkIG5vdFxuICAgICAgICAgICAgLy8gS2FyZW4gb3IgQ3VzdG9tZXJCIHNob3VsZCBleGlzdFxuICAgICAgICAgICAgYXdhaXQgc2V0dXAoY2xpZW50LCBzZXJ2ZXIsICcqJywgJ3NlY29uZCcpO1xuICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm1haW5GdW5jKCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5maXJzdE5hbWUpLnRvLmVxdWFsKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5sYXN0TmFtZSkudG8uZXF1YWwodW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLm1pZGRsZU5hbWUpLnRvLmVxdWFsKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgwKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoNCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KS50by5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzJdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIuYWxsQ2hhbmdlcykudG8uZXF1YWwocmVzdWx0c0FwcEJbMF0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgKycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQub25seSgnV2l0aCBhcHAgQiByZXN0cmljdGlvbiBhbmQgc3RhdGUgPSBzZWNvbmQgd2lsbCBvbmx5IHJldHVybiBCIGFuZCBub24tYXBwQSBvYmplY3RzIHdoaWNoIGRvIG5vdCBoYXZlIHN5bmNTdGF0ZSA9IGZpcnN0JywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gU2hvdWxkIHJldHJpZXZlIEthcmVuLCBBc2hsaW5nLCBidXQgbm90IFNhbSwgYW5kIG9ubHkgS2FyZW4gbGF0dGVyIDIgYWRkcmVzc2VzXG4gICAgICAgICAgICBhd2FpdCBzZXR1cChjbGllbnQsIHNlcnZlciwgJysnLCAnc2Vjb25kJyk7XG4gICAgICAgICAgICBhd2FpdCBjbGllbnQubWFpbkZ1bmMoKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmZpcnN0TmFtZSkudG8uZXF1YWwodW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmxhc3ROYW1lKS50by5lcXVhbCh1bmRlZmluZWQpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0ubWlkZGxlTmFtZSkudG8uZXF1YWwodW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5maXJzdE5hbWUpLnRvLmVxdWFsKCdBc2hsaW5nJyk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcubGFzdE5hbWUpLnRvLmVxdWFsKCdCdXJrZScpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5hc2hsaW5nLm1pZGRsZU5hbWUpLnRvLmVxdWFsKCcnKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDApO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5maXJzdE5hbWUpO1xuXG4gICAgICAgICAgICAvLyBBdCB0aGlzIG1vbWVudCwgdGhpcyB3aWxsIG5vdCByZW1vdmUgdGhlIG9iamVjdCByZWZlcmVuY2VzIHRoZW1zZWx2ZXMsIGJ1dCB0aGV5IHdpbGwgYmUgZW1wdHkgb2JqZWN0c1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbi5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCg0KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoNCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcuYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoMSk7XG5cbiAgICAgICAgICAgIC8vIEFkZHJlc3NlcyBhbmQgcmVsYXRlZCBwcm9wZXJ0aWVzIG9uIGNsaWVudHMgdGhhdCBhcmUgbGlua2VkIHRvIFBhcnQgMSBzaG91bGQgYmUgdW5kZWZpbmVkXG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1swXS5jaXR5KS50by5ub3QuZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1swXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzFdLmNpdHkpLnRvLm5vdC5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzFdLmNpdHkpO1xuXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1swXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzJdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KS50by5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5hbGxDaGFuZ2VzKS50by5lcXVhbChyZXN1bHRzQXBwQlsxXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iXX0=