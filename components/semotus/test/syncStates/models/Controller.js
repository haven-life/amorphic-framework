"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
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
var dist_1 = require("../../../dist");
var Customer_1 = require("./Customer");
var Account_1 = require("./Account");
var Address_1 = require("./Address");
var delay = require('../../../dist/helpers/Utilities.js').delay;
var Controller = /** @class */ (function (_super) {
    __extends(Controller, _super);
    function Controller() {
        return _super.call(this) || this;
    }
    Controller.prototype.mockServerInit = function () {
        // this.syncState = {scope: undefined, state: undefined};
        // Setup customers and addresses
        var sam = new Customer_1.CustomerA('Sam', 'M', 'Elsamman');
        var karen = new Customer_1.CustomerB('Karen', 'M', 'Burke');
        var ashling = new Customer_1.Customer('Ashling', '', 'Burke');
        // Setup referrers
        sam.referrers = [ashling, karen];
        ashling.referredBy = sam;
        karen.referredBy = sam;
        // Setup addresses
        sam.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028');
        sam.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572');
        karen.addAddress(['500 East 83d', 'Apt 1E'], 'New York', 'NY', '10028'); // first stage
        karen.addAddress(['38 Haggerty Hill Rd'], 'Rhinebeck', 'NY', '12572'); // first stage
        karen.addAddress(['SomeRandom Address here'], 'Town', 'HI', '00000'); // Second Stage
        karen.addAddress(['Another random Address'], 'Second', 'Hola', '88888'); // Second Stage
        ashling.addAddress(['End of the Road', ''], 'Lexington', 'KY', '34421');
        // Setup accounts
        var samsAccount = new Account_1.Account(1234, ['Sam Elsamman'], sam, sam.addresses[0]);
        var jointAccount = new Account_1.Account(123, ['Sam Elsamman', 'Karen Burke', 'Ashling Burke'], sam, karen.addresses[0]);
        jointAccount.addCustomer(karen, 'joint');
        jointAccount.addCustomer(ashling, 'joint');
        samsAccount.credit(100); // Sam has 100
        samsAccount.debit(50); // Sam has 50
        jointAccount.credit(200); // Joint has 200
        jointAccount.transferTo(100, samsAccount); // Joint has 100, Sam has 150
        jointAccount.transferFrom(50, samsAccount); // Joint has 150, Sam has 100
        jointAccount.debit(25); // Joint has 125
        this.sam = sam;
        this.karen = karen;
        this.ashling = ashling;
    };
    Controller.prototype.setState = function (role, scope, state) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log("Role is: " + role);
                console.log("Setting syncState. Original value is " + JSON.stringify(this.syncState));
                this.syncState = { scope: scope, state: state };
                this.ashling = this.sam = this.karen = null;
                console.log('Controller sync state successfully set');
                return [2 /*return*/];
            });
        });
    };
    Controller.prototype.mainFunc = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, delay(1000)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Controller.prototype.postServerCall = function (hasChanges, callContext, changeString) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.remoteChanges = changeString;
                return [2 /*return*/];
            });
        });
    };
    Controller.prototype.inspectMessage = function (messageCopy) {
        this.allChanges = messageCopy.changes;
    };
    Controller.prototype.giveSamASecondAccount = function () {
        var address = new Address_1.Address(this.sam, ['Plantana']);
        var samsNewAccount = new Account_1.Account(1234, ['Sam Elsamman'], this.sam, address);
        samsNewAccount.addCustomer(this.sam, 'sole');
    };
    Controller.prototype.equals = function (other) {
        // Always create them with serverInit
        return this.sam.equals(other.sam) && this.ashling.equals(other.ashling) && this.karen.equals(other.karen);
    };
    Controller.prototype.reset = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.sam = null;
                this.karen = null;
                this.ashling = null;
                return [2 /*return*/];
            });
        });
    };
    __decorate([
        dist_1.property(),
        __metadata("design:type", Customer_1.CustomerA)
    ], Controller.prototype, "sam", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", Customer_1.CustomerB)
    ], Controller.prototype, "karen", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", Customer_1.Customer)
    ], Controller.prototype, "ashling", void 0);
    __decorate([
        dist_1.remote({ on: 'server' }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, Object, Object]),
        __metadata("design:returntype", Promise)
    ], Controller.prototype, "setState", null);
    __decorate([
        dist_1.remote({
            on: 'server'
        }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", Promise)
    ], Controller.prototype, "mainFunc", null);
    __decorate([
        dist_1.remote(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], Controller.prototype, "reset", null);
    Controller = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [])
    ], Controller);
    return Controller;
}(dist_1.Supertype));
exports.Controller = Controller;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBMEU7QUFFMUUsdUNBQTBEO0FBQzFELHFDQUFrQztBQUNsQyxxQ0FBa0M7QUFFbEMsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBR2hFO0lBQWdDLDhCQUFTO0lBWXhDO2VBQ0MsaUJBQU87SUFDUixDQUFDO0lBRUQsbUNBQWMsR0FBZDtRQUNDLHlEQUF5RDtRQUN6RCxnQ0FBZ0M7UUFDaEMsSUFBSSxHQUFHLEdBQUcsSUFBSSxvQkFBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEQsSUFBSSxLQUFLLEdBQUcsSUFBSSxvQkFBUyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDakQsSUFBSSxPQUFPLEdBQUcsSUFBSSxtQkFBUSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFbkQsa0JBQWtCO1FBQ2xCLEdBQUcsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakMsT0FBTyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFDekIsS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFHdkIsa0JBQWtCO1FBQ2xCLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN0RSxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxPQUFP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QUFRLEVBQUU7a0NBQ0osb0JBQVM7NkNBQUM7SUFFakI7UUFEQyxlQUFRLEVBQUU7a0NBQ0YsbUJBQVE7K0NBQUM7SUFxRGxCO1FBREMsYUFBTSxDQUFDLEVBQUMsRUFBRSxFQUFFLFFBQVEsRUFBQyxDQUFDOzs7OzhDQU90QjtJQUtEO1FBSEMsYUFBTSxDQUFDO1lBQ1AsRUFBRSxFQUFFLFFBQVE7U0FDWixDQUFDOzs7OzhDQUlEO0lBc0JEO1FBREMsYUFBTSxFQUFFOzs7OzJDQUtSO0lBbkdXLFVBQVU7UUFEdEIscUJBQWM7O09BQ0YsVUFBVSxDQW9HdEI7SUFBRCxpQkFBQztDQUFBLEFBcEdELENBQWdDLGdCQUFTLEdBb0d4QztBQXBHWSxnQ0FBVSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cHJvcGVydHksIHJlbW90ZSwgU3VwZXJ0eXBlLCBzdXBlcnR5cGVDbGFzc30gZnJvbSAnLi4vLi4vLi4vZGlzdCc7XG5pbXBvcnQge0NhbGxDb250ZXh0LCBDaGFuZ2VTdHJpbmcsIENvbnRyb2xsZXJTeW5jU3RhdGUsIElTZW1vdHVzQ29udHJvbGxlcn0gZnJvbSAnLi4vLi4vLi4vc3JjL2hlbHBlcnMvVHlwZXMnXG5pbXBvcnQge0N1c3RvbWVyLCBDdXN0b21lckEsIEN1c3RvbWVyQn0gZnJvbSAnLi9DdXN0b21lcic7XG5pbXBvcnQge0FjY291bnR9IGZyb20gJy4vQWNjb3VudCc7XG5pbXBvcnQge0FkZHJlc3N9IGZyb20gJy4vQWRkcmVzcyc7XG5cbmxldCBkZWxheSA9IHJlcXVpcmUoJy4uLy4uLy4uL2Rpc3QvaGVscGVycy9VdGlsaXRpZXMuanMnKS5kZWxheTtcblxuQHN1cGVydHlwZUNsYXNzXG5leHBvcnQgY2xhc3MgQ29udHJvbGxlciBleHRlbmRzIFN1cGVydHlwZSBpbXBsZW1lbnRzIElTZW1vdHVzQ29udHJvbGxlciB7XG5cdEBwcm9wZXJ0eSgpXG5cdHNhbTogQ3VzdG9tZXJBOyAvLyBDdXN0b21lciBBXG5cdEBwcm9wZXJ0eSgpXG5cdGthcmVuOiBDdXN0b21lckI7IC8vIEN1c3RvbWVyIEJcblx0QHByb3BlcnR5KClcblx0YXNobGluZzogQ3VzdG9tZXI7XG5cblx0c3luY1N0YXRlOiBDb250cm9sbGVyU3luY1N0YXRlO1xuXHRyZW1vdGVDaGFuZ2VzOiBDaGFuZ2VTdHJpbmc7XG5cdGFsbENoYW5nZXM6IGFueTtcblxuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHR9XG5cblx0bW9ja1NlcnZlckluaXQoKSB7XG5cdFx0Ly8gdGhpcy5zeW5jU3RhdGUgPSB7c2NvcGU6IHVuZGVmaW5lZCwgc3RhdGU6IHVuZGVmaW5lZH07XG5cdFx0Ly8gU2V0dXAgY3VzdG9tZXJzIGFuZCBhZGRyZXNzZXNcblx0XHR2YXIgc2FtID0gbmV3IEN1c3RvbWVyQSgnU2FtJywgJ00nLCAnRWxzYW1tYW4nKTtcblx0XHR2YXIga2FyZW4gPSBuZXcgQ3VzdG9tZXJCKCdLYXJlbicsICdNJywgJ0J1cmtlJyk7XG5cdFx0dmFyIGFzaGxpbmcgPSBuZXcgQ3VzdG9tZXIoJ0FzaGxpbmcnLCAnJywgJ0J1cmtlJyk7XG5cblx0XHQvLyBTZXR1cCByZWZlcnJlcnNcblx0XHRzYW0ucmVmZXJyZXJzID0gW2FzaGxpbmcsIGthcmVuXTtcblx0XHRhc2hsaW5nLnJlZmVycmVkQnkgPSBzYW07XG5cdFx0a2FyZW4ucmVmZXJyZWRCeSA9IHNhbTtcblxuXG5cdFx0Ly8gU2V0dXAgYWRkcmVzc2VzXG5cdFx0c2FtLmFkZEFkZHJlc3MoWyc1MDAgRWFzdCA4M2QnLCAnQXB0IDFFJ10sICdOZXcgWW9yaycsICdOWScsICcxMDAyOCcpO1xuXHRcdHNhbS5hZGRBZGRyZXNzKFsnMzggSGFnZ2VydHkgSGlsbCBSZCcsICcnXSwgJ1JoaW5lYmVjaycsICdOWScsICcxMjU3MicpO1xuXG5cdFx0a2FyZW4uYWRkQWRkcmVzcyhbJzUwMCBFYXN0IDgzZCcsICdBcHQgMUUnXSwgJ05ldyBZb3JrJywgJ05ZJywgJzEwMDI4Jyk7IC8vIGZpcnN0IHN0YWdlXG5cdFx0a2FyZW4uYWRkQWRkcmVzcyhbJzM4IEhhZ2dlcnR5IEhpbGwgUmQnXSwgJ1JoaW5lYmVjaycsICdOWScsICcxMjU3MicpOyAvLyBmaXJzdCBzdGFnZVxuXHRcdGthcmVuLmFkZEFkZHJlc3MoWydTb21lUmFuZG9tIEFkZHJlc3MgaGVyZSddLCAnVG93bicsICdISScsICcwMDAwMCcpOyAvLyBTZWNvbmQgU3RhZ2Vcblx0XHRrYXJlbi5hZGRBZGRyZXNzKFsnQW5vdGhlciByYW5kb20gQWRkcmVzcyddLCAnU2Vjb25kJywgJ0hvbGEnLCAnODg4ODgnKTsgLy8gU2Vjb25kIFN0YWdlXG5cblx0XHRhc2hsaW5nLmFkZEFkZHJlc3MoWydFbmQgb2YgdGhlIFJvYWQnLCAnJ10sICdMZXhpbmd0b24nLCAnS1knLCAnMzQ0MjEnKTtcblxuXHRcdC8vIFNldHVwIGFjY291bnRzXG5cdFx0dmFyIHNhbXNBY2NvdW50ID0gbmV3IEFjY291bnQoMTIzNCwgWydTYW0gRWxzYW1tYW4nXSwgc2FtLCBzYW0uYWRkcmVzc2VzWzBdKTtcblx0XHR2YXIgam9pbnRBY2NvdW50ID0gbmV3IEFjY291bnQoMTIzLCBbJ1NhbSBFbHNhbW1hbicsICdLYXJlbiBCdXJrZScsICdBc2hsaW5nIEJ1cmtlJ10sIHNhbSwga2FyZW4uYWRkcmVzc2VzWzBdKTtcblx0XHRqb2ludEFjY291bnQuYWRkQ3VzdG9tZXIoa2FyZW4sICdqb2ludCcpO1xuXHRcdGpvaW50QWNjb3VudC5hZGRDdXN0b21lcihhc2hsaW5nLCAnam9pbnQnKTtcblxuXHRcdHNhbXNBY2NvdW50LmNyZWRpdCgxMDApOyAvLyBTYW0gaGFzIDEwMFxuXHRcdHNhbXNBY2NvdW50LmRlYml0KDUwKTsgLy8gU2FtIGhhcyA1MFxuXHRcdGpvaW50QWNjb3VudC5jcmVkaXQoMjAwKTsgLy8gSm9pbnQgaGFzIDIwMFxuXHRcdGpvaW50QWNjb3VudC50cmFuc2ZlclRvKDEwMCwgc2Ftc0FjY291bnQpOyAvLyBKb2ludCBoYXMgMTAwLCBTYW0gaGFzIDE1MFxuXHRcdGpvaW50QWNjb3VudC50cmFuc2ZlckZyb20oNTAsIHNhbXNBY2NvdW50KTsgLy8gSm9pbnQgaGFzIDE1MCwgU2FtIGhhcyAxMDBcblx0XHRqb2ludEFjY291bnQuZGViaXQoMjUpOyAvLyBKb2ludCBoYXMgMTI1XG5cblx0XHR0aGlzLnNhbSA9IHNhbTtcblx0XHR0aGlzLmthcmVuID0ga2FyZW47XG5cdFx0dGhpcy5hc2hsaW5nID0gYXNobGluZztcblx0fVxuXG5cdEByZW1vdGUoe29uOiAnc2VydmVyJ30pXG5cdGFzeW5jIHNldFN0YXRlKHJvbGUsIHNjb3BlLCBzdGF0ZT8pOiBQcm9taXNlPGFueT4ge1xuXHRcdGNvbnNvbGUubG9nKGBSb2xlIGlzOiAke3JvbGV9YCk7XG5cdFx0Y29uc29sZS5sb2coYFNldHRpbmcgc3luY1N0YXRlLiBPcmlnaW5hbCB2YWx1ZSBpcyAke0pTT04uc3RyaW5naWZ5KHRoaXMuc3luY1N0YXRlKX1gKTtcblx0XHR0aGlzLnN5bmNTdGF0ZSA9IHtzY29wZSwgc3RhdGV9O1xuXHRcdHRoaXMuYXNobGluZyA9IHRoaXMuc2FtID0gdGhpcy5rYXJlbiA9IG51bGw7XG5cdFx0Y29uc29sZS5sb2coJ0NvbnRyb2xsZXIgc3luYyBzdGF0ZSBzdWNjZXNzZnVsbHkgc2V0Jyk7XG5cdH1cblxuXHRAcmVtb3RlKHtcblx0XHRvbjogJ3NlcnZlcidcblx0fSlcblx0YXN5bmMgbWFpbkZ1bmMoLi4uYXJncyk6IFByb21pc2U8YW55PiB7XG5cdFx0YXdhaXQgZGVsYXkoMTAwMCk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0YXN5bmMgcG9zdFNlcnZlckNhbGwoaGFzQ2hhbmdlczogYm9vbGVhbiwgY2FsbENvbnRleHQ6IENhbGxDb250ZXh0LCBjaGFuZ2VTdHJpbmc6IENoYW5nZVN0cmluZyk6IFByb21pc2U8YW55PiB7XG5cdFx0dGhpcy5yZW1vdGVDaGFuZ2VzID0gY2hhbmdlU3RyaW5nO1xuXHR9XG5cblx0aW5zcGVjdE1lc3NhZ2UobWVzc2FnZUNvcHkpIHtcblx0XHR0aGlzLmFsbENoYW5nZXMgPSBtZXNzYWdlQ29weS5jaGFuZ2VzO1xuXHR9XG5cblx0Z2l2ZVNhbUFTZWNvbmRBY2NvdW50KCkge1xuXHRcdHZhciBhZGRyZXNzID0gbmV3IEFkZHJlc3ModGhpcy5zYW0sIFsnUGxhbnRhbmEnXSk7XG5cdFx0dmFyIHNhbXNOZXdBY2NvdW50ID0gbmV3IEFjY291bnQoMTIzNCwgWydTYW0gRWxzYW1tYW4nXSwgdGhpcy5zYW0sIGFkZHJlc3MpO1xuXHRcdHNhbXNOZXdBY2NvdW50LmFkZEN1c3RvbWVyKHRoaXMuc2FtLCAnc29sZScpO1xuXHR9XG5cblx0ZXF1YWxzKG90aGVyOiBDb250cm9sbGVyKSB7XG5cdFx0Ly8gQWx3YXlzIGNyZWF0ZSB0aGVtIHdpdGggc2VydmVySW5pdFxuXHRcdHJldHVybiB0aGlzLnNhbS5lcXVhbHMob3RoZXIuc2FtKSAmJiB0aGlzLmFzaGxpbmcuZXF1YWxzKG90aGVyLmFzaGxpbmcpICYmIHRoaXMua2FyZW4uZXF1YWxzKG90aGVyLmthcmVuKTtcblx0fVxuXG5cdEByZW1vdGUoKVxuXHRhc3luYyByZXNldCgpIHtcblx0XHR0aGlzLnNhbSA9IG51bGw7XG5cdFx0dGhpcy5rYXJlbiA9IG51bGw7XG5cdFx0dGhpcy5hc2hsaW5nID0gbnVsbDtcblx0fVxufSJdfQ==