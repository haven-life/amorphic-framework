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
var ObjectTemplate = require('../../../dist');
var delay = require('../../../dist/helpers/Utilities.js').delay;
ObjectTemplate['toClientRuleSet'] = ['Both'];
ObjectTemplate['toServerRuleSet'] = ['Both'];
var Controller = /** @class */ (function (_super) {
    __extends(Controller, _super);
    function Controller() {
        return _super.call(this) || this;
    }
    Controller.prototype.mockServerInit = function () {
        this.syncState = { scope: undefined, state: undefined };
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
        karen.addAddress(['38 Haggerty Hill Rd', ''], 'Rhinebeck', 'NY', '12572'); // first stage
        karen.addAddress(['SomeRandom Address here', ''], 'Town', 'HI', '00000'); // Second Stage
        karen.addAddress(['Another random Address', ''], 'Second', 'Hola', '88888'); // Second Stage
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
    Controller.prototype.reset = function (role, scope, state) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log("Role is: " + role);
                console.log("Resetting syncState. Original value is " + JSON.stringify(this.syncState));
                this.syncState.scope = scope;
                this.syncState.state = state || undefined;
                this.ashling = this.sam = this.karen = null;
                console.log('Controller sync state successfully reset');
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
    Controller.prototype.inspectMessage = function (message) {
        this.allChanges = message.changes;
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
    ], Controller.prototype, "reset", null);
    __decorate([
        dist_1.remote({
            on: 'server'
        }),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", Promise)
    ], Controller.prototype, "mainFunc", null);
    Controller = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [])
    ], Controller);
    return Controller;
}(dist_1.Supertype));
exports.Controller = Controller;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzQ0FBMEU7QUFFMUUsdUNBQTBEO0FBQzFELHFDQUFrQztBQUNsQyxxQ0FBa0M7QUFFbEMsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlDLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNoRSxjQUFjLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzdDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7QUFJN0M7SUFBZ0MsOEJBQVM7SUFZeEM7ZUFDQyxpQkFBTztJQUNSLENBQUM7SUFFRCxtQ0FBYyxHQUFkO1FBQ0MsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBQyxDQUFDO1FBQ3RELGdDQUFnQztRQUNoQyxJQUFJLEdBQUcsR0FBRyxJQUFJLG9CQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNoRCxJQUFJLEtBQUssR0FBRyxJQUFJLG9CQUFTLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqRCxJQUFJLE9BQU8sR0FBRyxJQUFJLG1CQUFRLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUVuRCxrQkFBa0I7UUFDbEIsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztRQUN6QixLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztRQUd2QixrQkFBa0I7UUFDbEIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3RFLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXhFLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWM7UUFDdkYsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjO1FBQ3pGLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTtRQUN6RixLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7UUFHNUYsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFeEUsaUJBQWlCO1FBQ2pCLElBQUksV0FBVyxHQUFHLElBQUksaUJBQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdFLElBQUksWUFBWSxHQUFHLElBQUksaUJBQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDL0csWUFBWSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFM0MsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWM7UUFDdkMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGFBQWE7UUFDcEMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQjtRQUMxQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLDZCQUE2QjtRQUN4RSxZQUFZLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLDZCQUE2QjtRQUN6RSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1FBRXhDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO1FBQ2YsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUdLLDBCQUFLLEdBQVgsVUFBWSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQU07OztnQkFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFZLElBQU0sQ0FBQyxDQUFDO2dCQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUEwQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUcsQ0FBQyxDQUFDO2dCQUN4RixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxTQUFTLENBQUM7Z0JBQzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDOzs7O0tBQ3hEO0lBS0ssNkJBQVEsR0FBZDtRQUFlLGNBQU87YUFBUCxVQUFPLEVBQVAscUJBQU8sRUFBUCxJQUFPO1lBQVAseUJBQU87Ozs7OzRCQUNyQixxQkFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUE7O3dCQUFqQixTQUFpQixDQUFDO3dCQUNsQixzQkFBTzs7OztLQUNQO0lBRUssbUNBQWMsR0FBcEIsVUFBcUIsVUFBbUIsRUFBRSxXQUF3QixFQUFFLFlBQTBCOzs7Z0JBQzdGLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDOzs7O0tBQ2xDO0lBRUQsbUNBQWMsR0FBZCxVQUFlLE9BQU87UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ25DLENBQUM7SUFFRCwwQ0FBcUIsR0FBckI7UUFDQyxJQUFJLE9BQU8sR0FBRyxJQUFJLGlCQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDbEQsSUFBSSxjQUFjLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDNUUsY0FBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCwyQkFBTSxHQUFOLFVBQU8sS0FBaUI7UUFDdkIscUNBQXFDO1FBQ3JDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDM0csQ0FBQztJQTVGRDtRQURDLGVBQVEsRUFBRTtrQ0FDTixvQkFBUzsyQ0FBQztJQUVmO1FBREMsZUFBUSxFQUFFO2tDQUNKLG9CQUFTOzZDQUFDO0lBRWpCO1FBREMsZUFBUSxFQUFFO2tDQUNGLG1CQUFROytDQUFDO0lBc0RsQjtRQURDLGFBQU0sQ0FBQyxFQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUMsQ0FBQzs7OzsyQ0FRdEI7SUFLRDtRQUhDLGFBQU0sQ0FBQztZQUNQLEVBQUUsRUFBRSxRQUFRO1NBQ1osQ0FBQzs7Ozs4Q0FJRDtJQTNFVyxVQUFVO1FBRHRCLHFCQUFjOztPQUNGLFVBQVUsQ0ErRnRCO0lBQUQsaUJBQUM7Q0FBQSxBQS9GRCxDQUFnQyxnQkFBUyxHQStGeEM7QUEvRlksZ0NBQVUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3Byb3BlcnR5LCByZW1vdGUsIFN1cGVydHlwZSwgc3VwZXJ0eXBlQ2xhc3N9IGZyb20gJy4uLy4uLy4uL2Rpc3QnO1xuaW1wb3J0IHtDYWxsQ29udGV4dCwgQ2hhbmdlU3RyaW5nLCBDb250cm9sbGVyU3luY1N0YXRlLCBJU2Vtb3R1c0NvbnRyb2xsZXJ9IGZyb20gJy4uLy4uLy4uL3NyYy9oZWxwZXJzL1R5cGVzJ1xuaW1wb3J0IHtDdXN0b21lciwgQ3VzdG9tZXJBLCBDdXN0b21lckJ9IGZyb20gJy4vQ3VzdG9tZXInO1xuaW1wb3J0IHtBY2NvdW50fSBmcm9tICcuL0FjY291bnQnO1xuaW1wb3J0IHtBZGRyZXNzfSBmcm9tICcuL0FkZHJlc3MnO1xuXG5sZXQgT2JqZWN0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi8uLi9kaXN0Jyk7XG5sZXQgZGVsYXkgPSByZXF1aXJlKCcuLi8uLi8uLi9kaXN0L2hlbHBlcnMvVXRpbGl0aWVzLmpzJykuZGVsYXk7XG5PYmplY3RUZW1wbGF0ZVsndG9DbGllbnRSdWxlU2V0J10gPSBbJ0JvdGgnXTtcbk9iamVjdFRlbXBsYXRlWyd0b1NlcnZlclJ1bGVTZXQnXSA9IFsnQm90aCddO1xuXG5cbkBzdXBlcnR5cGVDbGFzc1xuZXhwb3J0IGNsYXNzIENvbnRyb2xsZXIgZXh0ZW5kcyBTdXBlcnR5cGUgaW1wbGVtZW50cyBJU2Vtb3R1c0NvbnRyb2xsZXIge1xuXHRAcHJvcGVydHkoKVxuXHRzYW06IEN1c3RvbWVyQTsgLy8gQ3VzdG9tZXIgQVxuXHRAcHJvcGVydHkoKVxuXHRrYXJlbjogQ3VzdG9tZXJCOyAvLyBDdXN0b21lciBCXG5cdEBwcm9wZXJ0eSgpXG5cdGFzaGxpbmc6IEN1c3RvbWVyO1xuXG5cdHN5bmNTdGF0ZTogQ29udHJvbGxlclN5bmNTdGF0ZTtcblx0cmVtb3RlQ2hhbmdlczogQ2hhbmdlU3RyaW5nO1xuXHRhbGxDaGFuZ2VzOiBhbnk7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0fVxuXG5cdG1vY2tTZXJ2ZXJJbml0KCkge1xuXHRcdHRoaXMuc3luY1N0YXRlID0ge3Njb3BlOiB1bmRlZmluZWQsIHN0YXRlOiB1bmRlZmluZWR9O1xuXHRcdC8vIFNldHVwIGN1c3RvbWVycyBhbmQgYWRkcmVzc2VzXG5cdFx0dmFyIHNhbSA9IG5ldyBDdXN0b21lckEoJ1NhbScsICdNJywgJ0Vsc2FtbWFuJyk7XG5cdFx0dmFyIGthcmVuID0gbmV3IEN1c3RvbWVyQignS2FyZW4nLCAnTScsICdCdXJrZScpO1xuXHRcdHZhciBhc2hsaW5nID0gbmV3IEN1c3RvbWVyKCdBc2hsaW5nJywgJycsICdCdXJrZScpO1xuXG5cdFx0Ly8gU2V0dXAgcmVmZXJyZXJzXG5cdFx0c2FtLnJlZmVycmVycyA9IFthc2hsaW5nLCBrYXJlbl07XG5cdFx0YXNobGluZy5yZWZlcnJlZEJ5ID0gc2FtO1xuXHRcdGthcmVuLnJlZmVycmVkQnkgPSBzYW07XG5cblxuXHRcdC8vIFNldHVwIGFkZHJlc3Nlc1xuXHRcdHNhbS5hZGRBZGRyZXNzKFsnNTAwIEVhc3QgODNkJywgJ0FwdCAxRSddLCAnTmV3IFlvcmsnLCAnTlknLCAnMTAwMjgnKTtcblx0XHRzYW0uYWRkQWRkcmVzcyhbJzM4IEhhZ2dlcnR5IEhpbGwgUmQnLCAnJ10sICdSaGluZWJlY2snLCAnTlknLCAnMTI1NzInKTtcblxuXHRcdGthcmVuLmFkZEFkZHJlc3MoWyc1MDAgRWFzdCA4M2QnLCAnQXB0IDFFJ10sICdOZXcgWW9yaycsICdOWScsICcxMDAyOCcpOyAvLyBmaXJzdCBzdGFnZVxuXHRcdGthcmVuLmFkZEFkZHJlc3MoWyczOCBIYWdnZXJ0eSBIaWxsIFJkJywgJyddLCAnUmhpbmViZWNrJywgJ05ZJywgJzEyNTcyJyk7IC8vIGZpcnN0IHN0YWdlXG5cdFx0a2FyZW4uYWRkQWRkcmVzcyhbJ1NvbWVSYW5kb20gQWRkcmVzcyBoZXJlJywgJyddLCAnVG93bicsICdISScsICcwMDAwMCcpOyAvLyBTZWNvbmQgU3RhZ2Vcblx0XHRrYXJlbi5hZGRBZGRyZXNzKFsnQW5vdGhlciByYW5kb20gQWRkcmVzcycsICcnXSwgJ1NlY29uZCcsICdIb2xhJywgJzg4ODg4Jyk7IC8vIFNlY29uZCBTdGFnZVxuXG5cblx0XHRhc2hsaW5nLmFkZEFkZHJlc3MoWydFbmQgb2YgdGhlIFJvYWQnLCAnJ10sICdMZXhpbmd0b24nLCAnS1knLCAnMzQ0MjEnKTtcblxuXHRcdC8vIFNldHVwIGFjY291bnRzXG5cdFx0dmFyIHNhbXNBY2NvdW50ID0gbmV3IEFjY291bnQoMTIzNCwgWydTYW0gRWxzYW1tYW4nXSwgc2FtLCBzYW0uYWRkcmVzc2VzWzBdKTtcblx0XHR2YXIgam9pbnRBY2NvdW50ID0gbmV3IEFjY291bnQoMTIzLCBbJ1NhbSBFbHNhbW1hbicsICdLYXJlbiBCdXJrZScsICdBc2hsaW5nIEJ1cmtlJ10sIHNhbSwga2FyZW4uYWRkcmVzc2VzWzBdKTtcblx0XHRqb2ludEFjY291bnQuYWRkQ3VzdG9tZXIoa2FyZW4sICdqb2ludCcpO1xuXHRcdGpvaW50QWNjb3VudC5hZGRDdXN0b21lcihhc2hsaW5nLCAnam9pbnQnKTtcblxuXHRcdHNhbXNBY2NvdW50LmNyZWRpdCgxMDApOyAvLyBTYW0gaGFzIDEwMFxuXHRcdHNhbXNBY2NvdW50LmRlYml0KDUwKTsgLy8gU2FtIGhhcyA1MFxuXHRcdGpvaW50QWNjb3VudC5jcmVkaXQoMjAwKTsgLy8gSm9pbnQgaGFzIDIwMFxuXHRcdGpvaW50QWNjb3VudC50cmFuc2ZlclRvKDEwMCwgc2Ftc0FjY291bnQpOyAvLyBKb2ludCBoYXMgMTAwLCBTYW0gaGFzIDE1MFxuXHRcdGpvaW50QWNjb3VudC50cmFuc2ZlckZyb20oNTAsIHNhbXNBY2NvdW50KTsgLy8gSm9pbnQgaGFzIDE1MCwgU2FtIGhhcyAxMDBcblx0XHRqb2ludEFjY291bnQuZGViaXQoMjUpOyAvLyBKb2ludCBoYXMgMTI1XG5cblx0XHR0aGlzLnNhbSA9IHNhbTtcblx0XHR0aGlzLmthcmVuID0ga2FyZW47XG5cdFx0dGhpcy5hc2hsaW5nID0gYXNobGluZztcblx0fVxuXG5cdEByZW1vdGUoe29uOiAnc2VydmVyJ30pXG5cdGFzeW5jIHJlc2V0KHJvbGUsIHNjb3BlLCBzdGF0ZT8pOiBQcm9taXNlPGFueT4ge1xuXHRcdGNvbnNvbGUubG9nKGBSb2xlIGlzOiAke3JvbGV9YCk7XG5cdFx0Y29uc29sZS5sb2coYFJlc2V0dGluZyBzeW5jU3RhdGUuIE9yaWdpbmFsIHZhbHVlIGlzICR7SlNPTi5zdHJpbmdpZnkodGhpcy5zeW5jU3RhdGUpfWApO1xuXHRcdHRoaXMuc3luY1N0YXRlLnNjb3BlID0gc2NvcGU7XG5cdFx0dGhpcy5zeW5jU3RhdGUuc3RhdGUgPSBzdGF0ZSB8fCB1bmRlZmluZWQ7XG5cdFx0dGhpcy5hc2hsaW5nID0gdGhpcy5zYW0gPSB0aGlzLmthcmVuID0gbnVsbDtcblx0XHRjb25zb2xlLmxvZygnQ29udHJvbGxlciBzeW5jIHN0YXRlIHN1Y2Nlc3NmdWxseSByZXNldCcpO1xuXHR9XG5cblx0QHJlbW90ZSh7XG5cdFx0b246ICdzZXJ2ZXInXG5cdH0pXG5cdGFzeW5jIG1haW5GdW5jKC4uLmFyZ3MpOiBQcm9taXNlPGFueT4ge1xuXHRcdGF3YWl0IGRlbGF5KDEwMDApO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGFzeW5jIHBvc3RTZXJ2ZXJDYWxsKGhhc0NoYW5nZXM6IGJvb2xlYW4sIGNhbGxDb250ZXh0OiBDYWxsQ29udGV4dCwgY2hhbmdlU3RyaW5nOiBDaGFuZ2VTdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuXHRcdHRoaXMucmVtb3RlQ2hhbmdlcyA9IGNoYW5nZVN0cmluZztcblx0fVxuXG5cdGluc3BlY3RNZXNzYWdlKG1lc3NhZ2UpIHtcblx0XHR0aGlzLmFsbENoYW5nZXMgPSBtZXNzYWdlLmNoYW5nZXM7XG5cdH1cblxuXHRnaXZlU2FtQVNlY29uZEFjY291bnQoKSB7XG5cdFx0dmFyIGFkZHJlc3MgPSBuZXcgQWRkcmVzcyh0aGlzLnNhbSwgWydQbGFudGFuYSddKTtcblx0XHR2YXIgc2Ftc05ld0FjY291bnQgPSBuZXcgQWNjb3VudCgxMjM0LCBbJ1NhbSBFbHNhbW1hbiddLCB0aGlzLnNhbSwgYWRkcmVzcyk7XG5cdFx0c2Ftc05ld0FjY291bnQuYWRkQ3VzdG9tZXIodGhpcy5zYW0sICdzb2xlJyk7XG5cdH1cblxuXHRlcXVhbHMob3RoZXI6IENvbnRyb2xsZXIpIHtcblx0XHQvLyBBbHdheXMgY3JlYXRlIHRoZW0gd2l0aCBzZXJ2ZXJJbml0XG5cdFx0cmV0dXJuIHRoaXMuc2FtLmVxdWFscyhvdGhlci5zYW0pICYmIHRoaXMuYXNobGluZy5lcXVhbHMob3RoZXIuYXNobGluZykgJiYgdGhpcy5rYXJlbi5lcXVhbHMob3RoZXIua2FyZW4pO1xuXHR9XG59Il19