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
        var ret = bootstrap_1.bootstrap('A');
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
    describe('Scope is +', function () {
        it('With app A restriction and state = first will return all non App B objects', function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Sam (App A) has no state-specific objects
                        return [4 /*yield*/, bootstrap_1.setup(client, server, '+', 'second')];
                        case 1:
                            // Sam (App A) has no state-specific objects
                            _a.sent();
                            return [4 /*yield*/, client.mainFunc()];
                        case 2:
                            _a.sent();
                            chai_1.expect(server.sam.firstName).to.equal(client.sam.firstName);
                            chai_1.expect(client.karen.firstName).to.equal(undefined);
                            chai_1.expect(client.karen.lastName).to.equal(undefined);
                            chai_1.expect(client.karen.middleName).to.equal(undefined);
                            chai_1.expect(client.ashling.firstName).to.equal('Ashling');
                            chai_1.expect(client.ashling.lastName).to.equal('Burke');
                            chai_1.expect(client.ashling.middleName).to.equal('');
                            chai_1.expect(client.karen.addresses.length).to.equal(0);
                            chai_1.expect(client.sam.addresses.length).to.equal(2);
                            chai_1.expect(server.sam.addresses.length).to.equal(2);
                            chai_1.expect(client.ashling.addresses.length).to.equal(1);
                            chai_1.expect(server.sam.addresses[0].city).to.equal(client.sam.addresses[0].city);
                            chai_1.expect(server.sam.addresses[1].city).to.equal(client.sam.addresses[1].city);
                            return [2 /*return*/];
                    }
                });
            });
        });
    });
    describe('Scope is -', function () {
        it('With app A restriction and state = second, should not return any changes (except refs on controller)', function () {
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
                            return [4 /*yield*/, client.setState2('server', '-', 'second')];
                        case 3:
                            _a.sent();
                            server.mockServerInit();
                            return [4 /*yield*/, client.mainFunc2()];
                        case 4:
                            _a.sent();
                            // TODO: add assertion for messageCopy.changes here to make sure we are only getting addressess
                            chai_1.expect(server.karen.middleName).to.not.equal(client.karen.middleName);
                            chai_1.expect(server.karen.addresses.length).to.not.equal(client.karen.addresses.length);
                            chai_1.expect(server.sam.addresses.length).to.not.equal(client.sam.addresses.length);
                            chai_1.expect(client.karen.addresses.length).to.equal(0);
                            chai_1.expect(client.sam.addresses.length).to.equal(0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZUNhc2VzX0FwcEEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJCYXNlQ2FzZXNfQXBwQS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTRCO0FBQzVCLGdEQUFvRDtBQUVwRCxJQUFJLE9BQU8sR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUVwRCxJQUFJLE1BQU0sQ0FBQztBQUNYLElBQUksTUFBTSxDQUFDO0FBR1g7O0dBRUc7QUFDSCxRQUFRLENBQUMsa0RBQWtELEVBQUU7SUFDekQsTUFBTSxDQUFDO1FBQ0gsSUFBTSxHQUFHLEdBQUcscUJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUNwQixNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztJQUNILFNBQVMsQ0FBQzs7Ozs0QkFDTixxQkFBTSxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUE7O3dCQUFwQixTQUFvQixDQUFDO3dCQUNyQixPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQzt3QkFDcEQsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsQyxhQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3BDLGFBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDdEMsYUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFD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LE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBRWhELGFBQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7NEJBQ2hFLGFBQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7NEJBQ2xFLGFBQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Ozs7O1NBRWpFLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2V4cGVjdH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQge2Jvb3RzdHJhcCwgc2V0dXB9IGZyb20gJy4vbW9kZWxzL2Jvb3RzdHJhcCc7XG5cbmxldCBDaGFuZ2VzID0gcmVxdWlyZSgnLi4vLi4vZGlzdC9oZWxwZXJzL0NoYW5nZXMnKTtcblxubGV0IHNlcnZlcjtcbmxldCBjbGllbnQ7XG5cblxuLyoqXG4gKiBUZXN0IGNhc2VzIGZvciBzeW5jIHN0YXRlcy4gVGVzdHMgYmFzaWMgb2JqZWN0IHN5bmNocm9uaXphdGlvbiAvIHNlbmRpbmcgb2Ygb2JqZWN0cyBmcm9tIHNlcnZlciB0byBjbGllbnQgb24gaW5pdGlhbCBsb2Fkc1xuICovXG5kZXNjcmliZSgnQmFzaWMgVGVzdCBDYXNlczogSW5pdGlhbCBPYmplY3QgU3luY2hyb25pemF0aW9uJywgZnVuY3Rpb24gKCkge1xuICAgIGJlZm9yZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0IHJldCA9IGJvb3RzdHJhcCgnQScpO1xuICAgICAgICBjbGllbnQgPSByZXQuY2xpZW50O1xuICAgICAgICBzZXJ2ZXIgPSByZXQuc2VydmVyO1xuICAgIH0pO1xuICAgIGFmdGVyRWFjaChhc3luYyBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGF3YWl0IGNsaWVudC5yZXNldCgpO1xuICAgICAgICBDaGFuZ2VzLmNsZWFyQ2xpZW50U2Vzc2lvbihjbGllbnQuYW1vcnBoaWMsIGNsaWVudCk7XG4gICAgICAgIGV4cGVjdChjbGllbnQuc2FtKS50by5lcXVhbChudWxsKTtcbiAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbikudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZykudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChzZXJ2ZXIuc2FtKS50by5lcXVhbChudWxsKTtcbiAgICAgICAgZXhwZWN0KHNlcnZlci5rYXJlbikudG8uZXF1YWwobnVsbCk7XG4gICAgICAgIGV4cGVjdChzZXJ2ZXIuYXNobGluZykudG8uZXF1YWwobnVsbCk7XG4gICAgfSlcbiAgICBkZXNjcmliZSgnU2NvcGUgaXMgKycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaXQoJ1dpdGggYXBwIEEgcmVzdHJpY3Rpb24gYW5kIHN0YXRlID0gZmlyc3Qgd2lsbCByZXR1cm4gYWxsIG5vbiBBcHAgQiBvYmplY3RzJywgYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gU2FtIChBcHAgQSkgaGFzIG5vIHN0YXRlLXNwZWNpZmljIG9iamVjdHNcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnKycsICdzZWNvbmQnKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uZmlyc3ROYW1lKS50by5lcXVhbChjbGllbnQuc2FtLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmZpcnN0TmFtZSkudG8uZXF1YWwodW5kZWZpbmVkKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQua2FyZW4ubGFzdE5hbWUpLnRvLmVxdWFsKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLm1pZGRsZU5hbWUpLnRvLmVxdWFsKHVuZGVmaW5lZCk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmFzaGxpbmcuZmlyc3ROYW1lKS50by5lcXVhbCgnQXNobGluZycpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5hc2hsaW5nLmxhc3ROYW1lKS50by5lcXVhbCgnQnVya2UnKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5taWRkbGVOYW1lKS50by5lcXVhbCgnJyk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LmthcmVuLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDApO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5zYW0uYWRkcmVzc2VzLmxlbmd0aCkudG8uZXF1YWwoMik7XG4gICAgICAgICAgICBleHBlY3Qoc2VydmVyLnNhbS5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgyKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuYXNobGluZy5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgxKTtcblxuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uYWRkcmVzc2VzWzBdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5zYW0uYWRkcmVzc2VzWzBdLmNpdHkpO1xuICAgICAgICAgICAgZXhwZWN0KHNlcnZlci5zYW0uYWRkcmVzc2VzWzFdLmNpdHkpLnRvLmVxdWFsKGNsaWVudC5zYW0uYWRkcmVzc2VzWzFdLmNpdHkpO1xuICAgICAgICAgICAgLy8gZXhwZWN0KHNlcnZlci5hbGxDaGFuZ2VzKS50by5lcXVhbChyZXN1bHRzQXBwQlsxXSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlc2NyaWJlKCdTY29wZSBpcyAtJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpdCgnV2l0aCBhcHAgQSByZXN0cmljdGlvbiBhbmQgc3RhdGUgPSBzZWNvbmQsIHNob3VsZCBub3QgcmV0dXJuIGFueSBjaGFuZ2VzIChleGNlcHQgcmVmcyBvbiBjb250cm9sbGVyKScsIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFNob3VsZCBvbmx5IHJldHJpZXZlIEthcmVuIHNlY29uZCBzdGFnZSBhZGRyZXNzZXNcbiAgICAgICAgICAgIGF3YWl0IHNldHVwKGNsaWVudCwgc2VydmVyLCAnKicsICdzZWNvbmQnKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYygpO1xuICAgICAgICAgICAgYXdhaXQgY2xpZW50LnNldFN0YXRlMignc2VydmVyJywgJy0nLCAnc2Vjb25kJyk7XG4gICAgICAgICAgICBzZXJ2ZXIubW9ja1NlcnZlckluaXQoKTtcbiAgICAgICAgICAgIGF3YWl0IGNsaWVudC5tYWluRnVuYzIoKTtcbiAgICAgICAgICAgIC8vIFRPRE86IGFkZCBhc3NlcnRpb24gZm9yIG1lc3NhZ2VDb3B5LmNoYW5nZXMgaGVyZSB0byBtYWtlIHN1cmUgd2UgYXJlIG9ubHkgZ2V0dGluZyBhZGRyZXNzZXNzXG5cbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4ubWlkZGxlTmFtZSkudG8ubm90LmVxdWFsKGNsaWVudC5rYXJlbi5taWRkbGVOYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIua2FyZW4uYWRkcmVzc2VzLmxlbmd0aCkudG8ubm90LmVxdWFsKGNsaWVudC5rYXJlbi5hZGRyZXNzZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGV4cGVjdChzZXJ2ZXIuc2FtLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLm5vdC5lcXVhbChjbGllbnQuc2FtLmFkZHJlc3Nlcy5sZW5ndGgpO1xuICAgICAgICAgICAgZXhwZWN0KGNsaWVudC5rYXJlbi5hZGRyZXNzZXMubGVuZ3RoKS50by5lcXVhbCgwKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmFkZHJlc3Nlcy5sZW5ndGgpLnRvLmVxdWFsKDApO1xuXG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5maXJzdE5hbWUpLnRvLm5vdC5lcXVhbChzZXJ2ZXIuc2FtLmZpcnN0TmFtZSk7XG4gICAgICAgICAgICBleHBlY3QoY2xpZW50LnNhbS5taWRkbGVOYW1lKS50by5ub3QuZXF1YWwoc2VydmVyLnNhbS5taWRkbGVOYW1lKTtcbiAgICAgICAgICAgIGV4cGVjdChjbGllbnQuc2FtLmxhc3ROYW1lKS50by5ub3QuZXF1YWwoc2VydmVyLnNhbS5sYXN0TmFtZSk7XG4gICAgICAgICAgICAvLyBleHBlY3Qoc2VydmVyLmFsbENoYW5nZXMpLnRvLmVxdWFsKHJlc3VsdHNBcHBCWzFdKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59KTtcbiJdfQ==