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
        var ret = bootstrap_1.bootstrap('Both');
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
    describe('Scope is +', function () {
        it('Should return all objects across both apps except those with state = first', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, bootstrap_1.setup(client, server, '+', 'second')];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(server.sam.firstName).to.equal(client.sam.firstName);
                            chai_1.expect(client.sam.lastName).to.equal('Elsamman');
                            chai_1.expect(client.sam.middleName).to.equal('M');
                            chai_1.expect(client.ashling.firstName).to.equal('Ashling');
                            chai_1.expect(client.ashling.lastName).to.equal('Burke');
                            chai_1.expect(client.ashling.middleName).to.equal('');
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            // At this moment, this will not remove the object references themselves, but they will be empty objects
                            chai_1.expect(client.karen.addresses.length).to.equal(4);
                            chai_1.expect(server.karen.addresses.length).to.equal(4);
                            chai_1.expect(client.sam.addresses.length).to.equal(2);
                            chai_1.expect(server.sam.addresses[0].city).to.be.equal(client.sam.addresses[0].city);
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
        it('Expect everything to be transferred except for those objects with stage defined (Addresses and their accounts) to be transferred because state is set to undefined', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, bootstrap_1.setup(client, server, '-', undefined)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(server.sam.firstName).to.equal(client.sam.firstName);
                            chai_1.expect(client.sam.lastName).to.equal('Elsamman');
                            chai_1.expect(client.sam.middleName).to.equal('M');
                            chai_1.expect(client.ashling.firstName).to.equal('Ashling');
                            chai_1.expect(client.ashling.lastName).to.equal('Burke');
                            chai_1.expect(client.ashling.middleName).to.equal('');
                            chai_1.expect(server.karen.firstName).to.equal(client.karen.firstName);
                            chai_1.expect(client.karen.addresses.length).to.equal(4);
                            chai_1.expect(server.karen.addresses.length).to.equal(4);
                            chai_1.expect(client.sam.addresses.length).to.equal(2);
                            chai_1.expect(client.ashling.addresses.length).to.equal(1);
                            // Addresses and related properties on clients that are linked to Part 1 should be undefined
                            chai_1.expect(server.karen.addresses[0].city).to.not.equal(client.karen.addresses[0].city);
                            chai_1.expect(server.karen.addresses[1].city).to.not.equal(client.karen.addresses[1].city);
                            chai_1.expect(server.karen.addresses[2].city).to.not.equal(client.karen.addresses[2].city);
                            chai_1.expect(server.karen.addresses[3].city).to.not.equal(client.karen.addresses[3].city);
                            chai_1.expect(client.karen.addresses[0].city).to.be.undefined;
                            chai_1.expect(client.karen.addresses[1].city).to.be.undefined;
                            chai_1.expect(client.karen.addresses[0].account).to.be.undefined;
                            chai_1.expect(client.karen.addresses[1].account).to.be.undefined;
                            chai_1.expect(client.karen.addresses[2].city).to.be.undefined;
                            chai_1.expect(client.karen.addresses[3].city).to.be.undefined;
                            chai_1.expect(client.karen.addresses[2].account).to.be.undefined;
                            chai_1.expect(client.karen.addresses[3].account).to.be.undefined;
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzX0JvdGhBcHBzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQmFzZUNhc2VzX0JvdGhBcHBzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2QkFBNEI7QUFDNUIsZ0RBQW9EO0FBRXBELElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBR3BELElBQUksTUFBTSxDQUFDO0FBQ1gsSUFBSSxNQUFNLENBQUM7QUFFWDs7R0FFRztBQUNILFFBQVEsQ0FBQyxrREFBa0QsRUFBRTtJQUN6RCxNQUFNLENBQUM7UUFDSCxJQUFNLEdBQUcsR0FBRyxxQkFBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBQ3BCLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsU0FBUyxDQUFDOzs7OzRCQUNOLHFCQUFNLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFBQTs7d0JBQXBCLFNBQW9CLENBQUM7d0JBQ3JCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO3dCQUNwRCxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xDLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDcEMsYUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUN0QyxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxD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QUM1RCxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDOzRCQUNqRCxhQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUM1QyxhQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzRCQUNyRCxhQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUNsRCxhQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUMvQyxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7NEJBRWhFLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2hELGFBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUVwRCw0RkFBNEY7NEJBQzVGLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDcEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNwRixhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ3BGLGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFFcEYsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDOzRCQUN2RCxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBQ3ZELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQzs0QkFDMUQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDOzRCQUMxRCxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7NEJBQ3ZELGFBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQzs0QkFDdkQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDOzRCQUMxRCxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUM7Ozs7O1NBQzdELENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2V4cGVjdH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQge2Jvb3RzdHJhcCwgc2V0dXB9IGZyb20gJy4vbW9kZWxzL2Jvb3RzdHJhcCc7XG5cbmxldCBDaGFuZ2VzID0gcmVxdWlyZSgnLi4vLi4vZGlzdC9oZWxwZXJzL0NoYW5nZXMnKTtcblxuXG5sZXQgc2VydmVyO1xubGV0IGNsaWVudDtcblxuLyoqXG4gKiBUZXN0IGNhc2VzIGZvciBzeW5jIHN0YXRlcy4gVGVzdHMgYmFzaWMgb2JqZWN0IHN5bmNocm9uaXphdGlvbiAvIHNlbmRpbmcgb2Ygb2JqZWN0cyBmcm9tIHNlcnZlciB0byBjbGllbnQgb24gaW5pdGlhbCBsb2Fkc1xuICovXG5kZXNjcmliZSgnQmFzaWMgVGVzdCBDYXNlczogSW5pdGlhbCBPYmplY3QgU3luY2hyb25pemF0aW9uJywgKCkgPT4ge1xuICAgIGJlZm9yZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGJvb3RzdHJhcCgnQm90aCcpO1xuICAgICAgICBjbGllbnQgPSByZXQuY2xpZW50O1xuICAgICAgICBzZXJ2ZXIgPSByZXQuc2VydmVyO1xuICAgIH0pO1xuICAgIGFmdGVyRWFjaChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGF3YWl0IGNsaWVudC5yZXNldCgpO1xuICAgICAgICBDaGFuZ2VzLmNsZWFyQ2xpZW50U2Vzc2lvbihjbGllbnQuYW1vcnBoaWMsIGNsaWVudCk7XG4gICAgICAgIGV4cGVjdChjbGllbnQuc2FtKS50by5lcXVhbChudWxsKTtcbiAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbikudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZykudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChzZXJ2ZXIuc2FtKS50by5lcXVhbChudWxsKTtcbiAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbikudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChzZXJ2ZXIuYXNobGluZykudG8uZXF1YWwobnVsbCk7XG4gICAgfSlcbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgKicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ0RlZmF1bHQgdGVzdDogUmV0dXJucyBhbGwgb2JqZWN0cyBmb3IgYWxsIGFwcHMnLCBhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhd2FpdCBzZXR1cChjbGllbnQsIHNlcnZlciwgJyonKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5maXJzdE5hbWUpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQuc2FtLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDQpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSk7XG4gICAgICAgICAgICAvLyBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNCb3RoWzBdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGl0KCdSZWdhcmRsZXNzIG9mIHN0YXRlIHNob3VsZCByZXR1cm4gZXZlcnl0aGluZyAobm8gYXBwIHJlc3RyaWN0aW9uKScsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnKicsICdmaXJzdCcpO1xuICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm1haW5GdW5jKCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLnNhbS5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5zYW0uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoNCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KS50by5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzJdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbM10uY2l0eSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KTtcbiAgICAgICAgICAgIC8vIGV4cGVjdChzZXJ2ZXIuYWxsQ2hhbmdlcykudG8uZXF1YWwocmVzdWx0c0JvdGhbMV0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgKycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ1Nob3VsZCByZXR1cm4gYWxsIG9iamVjdHMgYWNyb3NzIGJvdGggYXBwcyBleGNlcHQgdGhvc2Ugd2l0aCBzdGF0ZSA9IGZpcnN0JywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXdhaXQgc2V0dXAoY2xpZW50LCBzZXJ2ZXIsICcrJywgJ3NlY29uZCcpO1xuICAgICAgICAgICAgYXdhaXQgY2xpZW50Lm1haW5GdW5jKCk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLnNhbS5maXJzdE5hbWUpLnRvLmVxdWFsKGNsaWVudC5zYW0uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmxhc3ROYW1lKS50by5lcXVhbCgnRWxzYW1tYW4nKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLm1pZGRsZU5hbWUpLnRvLmVxdWFsKCdNJyk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcuZmlyc3ROYW1lKS50by5lcXVhbCgnQXNobGluZycpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5hc2hsaW5nLmxhc3ROYW1lKS50by5lcXVhbCgnQnVya2UnKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5taWRkbGVOYW1lKS50by5lcXVhbCgnJyk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LmthcmVuLmZpcnN0TmFtZSk7XG5cbiAgICAgICAgICAgIC8vIEF0IHRoaXMgbW9tZW50LCB0aGlzIHdpbGwgbm90IHJlbW92ZSB0aGUgb2JqZWN0IHJlZmVyZW5jZXMgdGhlbXNlbHZlcywgYnV0IHRoZXkgd2lsbCBiZSBlbXB0eSBvYmplY3RzXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDQpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCg0KTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDIpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uYWRkcmVzc2VzWzBdLmNpdHkpLnRvLmJlLmVxdWFsKGNsaWVudC5zYW0uYWRkcmVzc2VzWzBdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5hc2hsaW5nLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDEpO1xuXG4gICAgICAgICAgICAvLyBBZGRyZXNzZXMgYW5kIHJlbGF0ZWQgcHJvcGVydGllcyBvbiBjbGllbnRzIHRoYXQgYXJlIGxpbmtlZCB0byBQYXJ0IDEgc2hvdWxkIGJlIHVuZGVmaW5lZFxuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMF0uY2l0eSkudG8ubm90LmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMF0uY2l0eSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1sxXS5jaXR5KS50by5ub3QuZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5jaXR5KTtcblxuXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1swXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1swXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5hY2NvdW50KS50by5ub3QuYmUudW5kZWZpbmVkO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMl0uYWNjb3VudC50aXRsZVswXSkudG8uZXF1YWwoJ0R1bW15Jyk7XG5cbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzJdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMl0uY2l0eSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KS50by5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgLScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ0V4cGVjdCBldmVyeXRoaW5nIHRvIGJlIHRyYW5zZmVycmVkIGV4Y2VwdCBmb3IgdGhvc2Ugb2JqZWN0cyB3aXRoIHN0YWdlIGRlZmluZWQgKEFkZHJlc3NlcyBhbmQgdGhlaXIgYWNjb3VudHMpIHRvIGJlIHRyYW5zZmVycmVkIGJlY2F1c2Ugc3RhdGUgaXMgc2V0IHRvIHVuZGVmaW5lZCcsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnLScsIHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBhd2FpdCBjbGllbnQubWFpbkZ1bmMoKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIuc2FtLmZpcnN0TmFtZSkudG8uZXF1YWwoY2xpZW50LnNhbS5maXJzdE5hbWUpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0ubGFzdE5hbWUpLnRvLmVxdWFsKCdFbHNhbW1hbicpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0ubWlkZGxlTmFtZSkudG8uZXF1YWwoJ00nKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5maXJzdE5hbWUpLnRvLmVxdWFsKCdBc2hsaW5nJyk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcubGFzdE5hbWUpLnRvLmVxdWFsKCdCdXJrZScpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5hc2hsaW5nLm1pZGRsZU5hbWUpLnRvLmVxdWFsKCcnKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQua2FyZW4uZmlyc3ROYW1lKTtcblxuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbi5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCg0KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoNCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgyKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgxKTtcblxuICAgICAgICAgICAgLy8gQWRkcmVzc2VzIGFuZCByZWxhdGVkIHByb3BlcnRpZXMgb24gY2xpZW50cyB0aGF0IGFyZSBsaW5rZWQgdG8gUGFydCAxIHNob3VsZCBiZSB1bmRlZmluZWRcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzBdLmNpdHkpLnRvLm5vdC5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzBdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbi5hZGRyZXNzZXNbMV0uY2l0eSkudG8ubm90LmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXNbMV0uY2l0eSk7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KS50by5ub3QuZXF1YWwoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpLnRvLm5vdC5lcXVhbChjbGllbnQua2FyZW4uYWRkcmVzc2VzWzNdLmNpdHkpO1xuXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1swXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1swXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1sxXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS5jaXR5KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1syXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlc1szXS5hY2NvdW50KS50by5iZS51bmRlZmluZWQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufSk7XG4iXX0=