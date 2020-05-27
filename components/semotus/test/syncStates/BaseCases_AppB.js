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
var Changes = require('../../dist/helpers/Changes');
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
    afterEach(function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, client.reset()];
                    case 1:
                        _a.sent();
                        Changes.clearClientSession(client.amorphic, client);
                        chai_1.expect(client.sam).to.equal(null);
                        chai_1.expect(client.karen).to.equal(null);
                        chai_1.expect(client.ashling).to.equal(null);
                        chai_1.expect(server.sam).to.equal(null);
                        chai_1.expect(server.karen).to.equal(null);
                        chai_1.expect(server.ashling).to.equal(null);
                        return [2 /*return*/];
                }
            });
        });
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
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Scope is +', function () {
        it('With app B restriction and state = second will only return B and non-appA objects which do not have syncState = first', function () {
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
                            chai_1.expect(client.karen.addresses[0].account).to.be.undefined;
                            chai_1.expect(client.karen.addresses[1].account).to.be.undefined;
                            chai_1.expect(client.karen.addresses[2].account).to.not.be.undefined;
                            chai_1.expect(client.karen.addresses[2].account.title[0]).to.equal('Dummy');
                            chai_1.expect(server.karen.addresses[2].city).to.equal(client.karen.addresses[2].city);
                            chai_1.expect(server.karen.addresses[3].city).to.equal(client.karen.addresses[3].city);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Scope is -', function () {
        it('With app B restriction and state = second will only return changed B objects which syncState = second.', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Should only retrieve Karen second stage addresses
                        return [4 /*yield*/, bootstrap_1.setup(client, server, '*', 'second')];
                        case 1:
                            // Should only retrieve Karen second stage addresses
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            client.karen.middleName = 'yo';
                            return [4 /*yield*/, client.setState2('server', '-', 'second')];
                        case 3:
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc2()];
                        case 4:
                            _a.sent();
                            // TODO: add assertion for messageCopy.changes here to make sure we are only getting addressess
                            chai_1.expect(server.karen.middleName).to.not.equal(client.karen.middleName);
                            chai_1.expect(client.karen.middleName).to.equal('yo');
                            chai_1.expect(server.karen.middleName).to.equal('dont change');
                            chai_1.expect(client.karen.addresses[3].type).to.equal(server.karen.addresses[3].type);
                            chai_1.expect(client.karen.addresses[0].type).to.not.equal(server.karen.addresses[0].type);
                            chai_1.expect(client.karen.addresses[3].type).to.equal('something');
                            chai_1.expect(server.karen.addresses[0].type).to.equal('nothing');
                            chai_1.expect(client.sam.firstName).to.not.equal(server.sam.firstName);
                            chai_1.expect(client.sam.middleName).to.not.equal(server.sam.middleName);
                            chai_1.expect(client.sam.lastName).to.not.equal(server.sam.lastName);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzX0FwcEIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJCYXNlQ2FzZXNfQXBwQi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTRCO0FBQzVCLGdEQUFvRDtBQUVwRCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUVwRCxJQUFJLE1BQU0sQ0FBQztBQUNYLElBQUksTUFBTSxDQUFDO0FBR1g7O0dBRUc7QUFDSCxRQUFRLENBQUMsa0RBQWtELEVBQUU7SUFDekQsTUFBTSxDQUFDO1FBQ0gsSUFBTSxHQUFHLEdBQUcscUJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUNwQixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztJQUNILFNBQVMsQ0FBQzs7Ozs0QkFDTixxQkFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUE7O3dCQUFwQixTQUFvQixDQUFDO3dCQUNyQixPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDcEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsQyxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3BDLGFBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDdEMsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFD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YUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDakQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDaEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFDckQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDL0MsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQzs0QkFFaEUsd0dBQXdHOzRCQUN4RyxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xELGFBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUVwRCw0RkFBNEY7NEJBQzVGLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDcEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUVwRixhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBQ3ZELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQzs0QkFDdkQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDOzRCQUMxRCxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBQzFELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBQzlELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzs0QkFFckUsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ2hGLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOzs7OztTQUVuRixDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUNILFFBQVEsQ0FBQyxZQUFZLEVBQUU7UUFDbkIsRUFBRSxDQUFDLHdHQUF3RyxFQUFFOzs7Ozt3QkFDekcsb0RBQW9EO3dCQUNwRCxxQkFBTSxpQkFBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUFBOzs0QkFEMUMsb0RBQW9EOzRCQUNwRCxTQUEwQyxDQUFDOzRCQUMzQyxxQkFBTSxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUE7OzRCQUF2QixTQUF1QixDQUFDOzRCQUN4QixNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7NEJBQy9CLHFCQUFNLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsRUFBQTs7NEJBQS9DLFNBQStDLENBQUM7NEJBQ2hELHFCQUFNLE1BQU0sQ0FBQyxTQUFTLEVBQUUsRUFBQTs7NEJBQXhCLFNBQXdCLENBQUM7NEJBQ3pCLCtGQUErRjs0QkFFL0YsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQzs0QkFDdEUsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDL0MsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQzs0QkFDeEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ2hGLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDcEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7NEJBQzdELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUUzRCxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUNoRSxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDOzRCQUNsRSxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDOzs7OztTQUVqRSxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtleHBlY3R9IGZyb20gJ2NoYWknO1xuaW1wb3J0IHtib290c3RyYXAsIHNldHVwfSBmcm9tICcuL21vZGVscy9ib290c3RyYXAnO1xuXG5sZXQgQ2hhbmdlcyA9IHJlcXVpcmUoJy4uLy4uL2Rpc3QvaGVscGVycy9DaGFuZ2VzJyk7XG5cbmxldCBzZXJ2ZXI7XG5sZXQgY2xpZW50O1xuXG5cbi8qKlxuICogVGVzdCBjYXNlcyBmb3Igc3luYyBzdGF0ZXMuIFRlc3RzIGJhc2ljIG9iamVjdCBzeW5jaHJvbml6YXRpb24gLyBzZW5kaW5nIG9mIG9iamVjdHMgZnJvbSBzZXJ2ZXIgdG8gY2xpZW50IG9uIGluaXRpYWwgbG9hZHNcbiAqL1xuZGVzY3JpYmUoJ0Jhc2ljIFRlc3QgQ2FzZXM6IEluaXRpYWwgT2JqZWN0IFN5bmNocm9uaXphdGlvbicsIGZ1bmN0aW9uICgpIHtcbiAgICBiZWZvcmUoZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCByZXQgPSBib290c3RyYXAoJ0InKTtcbiAgICAgICAgY2xpZW50ID0gcmV0LmNsaWVudDtcbiAgICAgICAgc2VydmVyID0gcmV0LnNlcnZlcjtcbiAgICB9KTtcbiAgICBhZnRlckVhY2goYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICBhd2FpdCBjbGllbnQucmVzZXQoKTtcbiAgICAgICAgQ2hhbmdlcy5jbGVhckNsaWVudFNlc3Npb24oY2xpZW50LmFtb3JwaGljLCBjbGllbnQpO1xuICAgICAgICBleHBlY3QoY2xpZW50LnNhbSkudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4pLnRvLmVxdWFsKG51bGwpO1xuICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcpLnRvLmVxdWFsKG51bGwpO1xuICAgICAgICBleHBlY3Qoc2VydmVyLnNhbSkudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4pLnRvLmVxdWFsKG51bGwpO1xuICAgICAgICBleHBlY3Qoc2VydmVyLmFzaGxpbmcpLnRvLmVxdWFsKG51bGwpO1xuICAgIH0pXG4gICAgZGVzY3JpYmUoJ1Njb3BlIGlzIConLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdXaXRoIHN0YXRlID0gc2Vjb25kIHNob3VsZCByZXR1cm4gYWxsIEIgb2JqZWN0cyAoYXBwIEIgcmVzdHJpY3Rpb24pJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gU2FtIG9yIEN1c3RvbWVyQSBzaG91bGQgZXhpc3Qgb24gdGhlIHByb3BlcnR5IG9uIHRoZSBmcm9udCBlbmQgY29udHJvbGxlciwgYnV0IGl0cyBwcm9wZXJ0aWVzIHNob3VsZCBub3RcbiAgICAgICAgICAgIC8vIEthcmVuIG9yIEN1c3RvbWVyQiBzaG91bGQgZXhpc3RcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnKicsICdzZWNvbmQnKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5maXJzdE5hbWUpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0uZmlyc3ROYW1lKS50by5lcXVhbCh1bmRlZmluZWQpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0ubGFzdE5hbWUpLnRvLmVxdWFsKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5taWRkbGVOYW1lKS50by5lcXVhbCh1bmRlZmluZWQpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoMCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDQpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSk7XG4gICAgICAgICAgICAvLyBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNBcHBCWzBdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVzY3JpYmUoJ1Njb3BlIGlzICsnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdXaXRoIGFwcCBCIHJlc3RyaWN0aW9uIGFuZCBzdGF0ZSA9IHNlY29uZCB3aWxsIG9ubHkgcmV0dXJuIEIgYW5kIG5vbi1hcHBBIG9iamVjdHMgd2hpY2ggZG8gbm90IGhhdmUgc3luY1N0YXRlID0gZmlyc3QnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBTaG91bGQgcmV0cmlldmUgS2FyZW4sIEFzaGxpbmcsIGJ1dCBub3QgU2FtLCBhbmQgb25seSBLYXJlbiBsYXR0ZXIgMiBhZGRyZXNzZXNcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnKycsICdzZWNvbmQnKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5maXJzdE5hbWUpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0uZmlyc3ROYW1lKS50by5lcXVhbCh1bmRlZmluZWQpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0ubGFzdE5hbWUpLnRvLmVxdWFsKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5taWRkbGVOYW1lKS50by5lcXVhbCh1bmRlZmluZWQpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5hc2hsaW5nLmZpcnN0TmFtZSkudG8uZXF1YWwoJ0FzaGxpbmcnKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5sYXN0TmFtZSkudG8uZXF1YWwoJ0J1cmtlJyk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcubWlkZGxlTmFtZSkudG8uZXF1YWwoJycpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoMCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG5cbiAgICAgICAgICAgIC8vIEF0IHRoaXMgbW9tZW50LCB0aGlzIHdpbGwgbm90IHJlbW92ZSB0aGUgb2JqZWN0IHJlZmVyZW5jZXMgdGhlbXNlbHZlcywgYnV0IHRoZXkgd2lsbCBiZSBlbXB0eSBvYmplY3RzXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDQpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCg0KTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgxKTtcblxuICAgICAgICAgICAgLy8gQWRkcmVzc2VzIGFuZCByZWxhdGVkIHByb3BlcnRpZXMgb24gY2xpZW50cyB0aGF0IGFyZSBsaW5rZWQgdG8gUGFydCAxIHNob3VsZCBiZSB1bmRlZmluZWRcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzBdLmNpdHkpLnRvLm5vdC5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzBdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMV0uY2l0eSkudG8ubm90LmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMV0uY2l0eSk7XG5cbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzBdLmNpdHkpLnRvLmJlLnVuZGVmaW5lZDtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzFdLmNpdHkpLnRvLmJlLnVuZGVmaW5lZDtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzBdLmFjY291bnQpLnRvLmJlLnVuZGVmaW5lZDtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzFdLmFjY291bnQpLnRvLmJlLnVuZGVmaW5lZDtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzJdLmFjY291bnQpLnRvLm5vdC5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5hY2NvdW50LnRpdGxlWzBdKS50by5lcXVhbCgnRHVtbXknKTtcblxuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSk7XG4gICAgICAgICAgICAvLyBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNBcHBCWzFdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVzY3JpYmUoJ1Njb3BlIGlzIC0nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGl0KCdXaXRoIGFwcCBCIHJlc3RyaWN0aW9uIGFuZCBzdGF0ZSA9IHNlY29uZCB3aWxsIG9ubHkgcmV0dXJuIGNoYW5nZWQgQiBvYmplY3RzIHdoaWNoIHN5bmNTdGF0ZSA9IHNlY29uZC4nLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBTaG91bGQgb25seSByZXRyaWV2ZSBLYXJlbiBzZWNvbmQgc3RhZ2UgYWRkcmVzc2VzXG4gICAgICAgICAgICBhd2FpdCBzZXR1cChjbGllbnQsIHNlcnZlciwgJyonLCAnc2Vjb25kJyk7XG4gICAgICAgICAgICBhd2FpdCBjbGllbnQubWFpbkZ1bmMoKTtcbiAgICAgICAgICAgIGNsaWVudC5rYXJlbi5taWRkbGVOYW1lID0gJ3lvJztcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5zZXRTdGF0ZTIoJ3NlcnZlcicsICctJywgJ3NlY29uZCcpO1xuICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm1haW5GdW5jMigpO1xuICAgICAgICAgICAgLy8gVE9ETzogYWRkIGFzc2VydGlvbiBmb3IgbWVzc2FnZUNvcHkuY2hhbmdlcyBoZXJlIHRvIG1ha2Ugc3VyZSB3ZSBhcmUgb25seSBnZXR0aW5nIGFkZHJlc3Nlc3NcblxuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5taWRkbGVOYW1lKS50by5ub3QuZXF1YWwoY2xpZW50LmthcmVuLm1pZGRsZU5hbWUpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbi5taWRkbGVOYW1lKS50by5lcXVhbCgneW8nKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4ubWlkZGxlTmFtZSkudG8uZXF1YWwoJ2RvbnQgY2hhbmdlJyk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS50eXBlKS50by5lcXVhbChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLnR5cGUpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMF0udHlwZSkudG8ubm90LmVxdWFsKHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMF0udHlwZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS50eXBlKS50by5lcXVhbCgnc29tZXRoaW5nJyk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1swXS50eXBlKS50by5lcXVhbCgnbm90aGluZycpO1xuXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5maXJzdE5hbWUpLnRvLm5vdC5lcXVhbChzZXJ2ZXIuc2FtLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5taWRkbGVOYW1lKS50by5ub3QuZXF1YWwoc2VydmVyLnNhbS5taWRkbGVOYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmxhc3ROYW1lKS50by5ub3QuZXF1YWwoc2VydmVyLnNhbS5sYXN0TmFtZSk7XG4gICAgICAgICAgICAvLyBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNBcHBCWzFdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdfQ==