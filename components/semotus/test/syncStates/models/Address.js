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
Object.defineProperty(exports, "__esModule", { value: true });
var dist_1 = require("../../../dist");
var Customer_1 = require("./Customer");
var Account_1 = require("./Account");
var _ = require("underscore");
var Address = /** @class */ (function (_super) {
    __extends(Address, _super);
    function Address(customer, city, state, lines) {
        var _this = _super.call(this) || this;
        _this.lines = [];
        _this.city = '';
        _this.state = '';
        _this.city = city;
        _this.state = state;
        _this.lines = lines || [];
        _this.customer = customer;
        return _this;
    }
    Address.prototype.equals = function (other) {
        var checkPrims = this.city === other.city && _.isEqual(this.lines, other.lines) && this.state === other.state && this.type === other.type;
        var checkAccount = true;
        if (this.account && other.account) {
            checkAccount = this.account.equals(other.account);
        }
        else if (this.account || other.account) {
            checkAccount = false;
        }
        return checkPrims && checkAccount;
    };
    __decorate([
        dist_1.property({ type: String }),
        __metadata("design:type", Array)
    ], Address.prototype, "lines", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Address.prototype, "city", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Address.prototype, "state", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Customer_1.Customer;
            }
        }),
        __metadata("design:type", Customer_1.Customer)
    ], Address.prototype, "customer", void 0);
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Address.prototype, "type", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Account_1.Account;
            }
        }),
        __metadata("design:type", Account_1.Account)
    ], Address.prototype, "account", void 0);
    Address = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object, Object])
    ], Address);
    return Address;
}(dist_1.Supertype));
exports.Address = Address;
var AddressA = /** @class */ (function (_super) {
    __extends(AddressA, _super);
    function AddressA() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AddressA = __decorate([
        dist_1.supertypeClass({ toClient: ['A', 'Both'] })
    ], AddressA);
    return AddressA;
}(Address));
exports.AddressA = AddressA;
var AddressBFirstStage = /** @class */ (function (_super) {
    __extends(AddressBFirstStage, _super);
    function AddressBFirstStage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AddressBFirstStage = __decorate([
        dist_1.supertypeClass({ toClient: ['B', 'Both'], syncStates: ['first'] })
    ], AddressBFirstStage);
    return AddressBFirstStage;
}(Address));
exports.AddressBFirstStage = AddressBFirstStage;
var AddressBSecondStage = /** @class */ (function (_super) {
    __extends(AddressBSecondStage, _super);
    function AddressBSecondStage() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AddressBSecondStage = __decorate([
        dist_1.supertypeClass({ toClient: ['B', 'Both'], syncStates: ['second'] })
    ], AddressBSecondStage);
    return AddressBSecondStage;
}(Address));
exports.AddressBSecondStage = AddressBSecondStage;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRkcmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFkZHJlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQWtFO0FBQ2xFLHVDQUFvQztBQUNwQyxxQ0FBa0M7QUFDbEMsOEJBQWdDO0FBR2hDO0lBQTZCLDJCQUFTO0lBdUJsQyxpQkFBWSxRQUFRLEVBQUUsSUFBSyxFQUFFLEtBQU0sRUFBRSxLQUFNO1FBQTNDLFlBQ0ksaUJBQU8sU0FLVjtRQTFCRCxXQUFLLEdBQWtCLEVBQUUsQ0FBQztRQUUxQixVQUFJLEdBQVcsRUFBRSxDQUFDO1FBRWxCLFdBQUssR0FBVyxFQUFFLENBQUM7UUFrQmYsS0FBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsS0FBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsS0FBSSxDQUFDLEtBQUssR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3pCLEtBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDOztJQUM3QixDQUFDO0lBRUQsd0JBQU0sR0FBTixVQUFPLEtBQWM7UUFDakIsSUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQztRQUM1SSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUU7WUFDL0IsWUFBWSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNyRDthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQ3RDLFlBQVksR0FBRyxLQUFLLENBQUM7U0FDeEI7UUFDRCxPQUFPLFVBQVUsSUFBSSxZQUFZLENBQUM7SUFDdEMsQ0FBQztJQXJDRDtRQURDLGVBQVEsQ0FBQyxFQUFDLElBQUksRUFBRSxNQUFNLEVBQUMsQ0FBQztrQ0FDbEIsS0FBSzswQ0FBYztJQUUxQjtRQURDLGVBQVEsRUFBRTtrQ0FDTCxNQUFNO3lDQUFNO0lBRWxCO1FBREMsZUFBUSxFQUFFOzswQ0FDUTtJQU1uQjtRQUxDLGVBQVEsQ0FBQztZQUNOLE9BQU8sRUFBRTtnQkFDTCxPQUFPLG1CQUFRLENBQUE7WUFDbkIsQ0FBQztTQUNKLENBQUM7a0NBQ1EsbUJBQVE7NkNBQUM7SUFFbkI7UUFEQyxlQUFRLEVBQUU7O3lDQUNFO0lBTWI7UUFMQyxlQUFRLENBQUM7WUFDTixPQUFPLEVBQUU7Z0JBQ0wsT0FBTyxpQkFBTyxDQUFBO1lBQ2xCLENBQUM7U0FDSixDQUFDO2tDQUNPLGlCQUFPOzRDQUFDO0lBckJSLE9BQU87UUFEbkIscUJBQWM7O09BQ0YsT0FBTyxDQXlDbkI7SUFBRCxjQUFDO0NBQUEsQUF6Q0QsQ0FBNkIsZ0JBQVMsR0F5Q3JDO0FBekNZLDBCQUFPO0FBNENwQjtJQUE4Qiw0QkFBTztJQUFyQzs7SUFFQSxDQUFDO0lBRlksUUFBUTtRQURwQixxQkFBYyxDQUFDLEVBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFDLENBQUM7T0FDN0IsUUFBUSxDQUVwQjtJQUFELGVBQUM7Q0FBQSxBQUZELENBQThCLE9BQU8sR0FFcEM7QUFGWSw0QkFBUTtBQUtyQjtJQUF3QyxzQ0FBTztJQUEvQzs7SUFFQSxDQUFDO0lBRlksa0JBQWtCO1FBRDlCLHFCQUFjLENBQUMsRUFBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUMsQ0FBQztPQUNwRCxrQkFBa0IsQ0FFOUI7SUFBRCx5QkFBQztDQUFBLEFBRkQsQ0FBd0MsT0FBTyxHQUU5QztBQUZZLGdEQUFrQjtBQUsvQjtJQUF5Qyx1Q0FBTztJQUFoRDs7SUFFQSxDQUFDO0lBRlksbUJBQW1CO1FBRC9CLHFCQUFjLENBQUMsRUFBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUMsQ0FBQztPQUNyRCxtQkFBbUIsQ0FFL0I7SUFBRCwwQkFBQztDQUFBLEFBRkQsQ0FBeUMsT0FBTyxHQUUvQztBQUZZLGtEQUFtQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7cHJvcGVydHksIFN1cGVydHlwZSwgc3VwZXJ0eXBlQ2xhc3N9IGZyb20gJy4uLy4uLy4uL2Rpc3QnO1xuaW1wb3J0IHtDdXN0b21lcn0gZnJvbSAnLi9DdXN0b21lcic7XG5pbXBvcnQge0FjY291bnR9IGZyb20gJy4vQWNjb3VudCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5Ac3VwZXJ0eXBlQ2xhc3NcbmV4cG9ydCBjbGFzcyBBZGRyZXNzIGV4dGVuZHMgU3VwZXJ0eXBlIHtcblxuICAgIEBwcm9wZXJ0eSh7dHlwZTogU3RyaW5nfSlcbiAgICBsaW5lczogQXJyYXk8U3RyaW5nPiA9IFtdO1xuICAgIEBwcm9wZXJ0eSgpXG4gICAgY2l0eTogU3RyaW5nID0gJyc7XG4gICAgQHByb3BlcnR5KClcbiAgICBzdGF0ZTogc3RyaW5nID0gJyc7XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEN1c3RvbWVyXG4gICAgICAgIH1cbiAgICB9KVxuICAgIGN1c3RvbWVyOiBDdXN0b21lcjtcbiAgICBAcHJvcGVydHkoKVxuICAgIHR5cGU6IHN0cmluZztcbiAgICBAcHJvcGVydHkoe1xuICAgICAgICBnZXRUeXBlOiAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudFxuICAgICAgICB9XG4gICAgfSlcbiAgICBhY2NvdW50OiBBY2NvdW50O1xuXG4gICAgY29uc3RydWN0b3IoY3VzdG9tZXIsIGNpdHk/LCBzdGF0ZT8sIGxpbmVzPykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmNpdHkgPSBjaXR5O1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMubGluZXMgPSBsaW5lcyB8fCBbXTtcbiAgICAgICAgdGhpcy5jdXN0b21lciA9IGN1c3RvbWVyO1xuICAgIH1cblxuICAgIGVxdWFscyhvdGhlcjogQWRkcmVzcykge1xuICAgICAgICBjb25zdCBjaGVja1ByaW1zID0gdGhpcy5jaXR5ID09PSBvdGhlci5jaXR5ICYmIF8uaXNFcXVhbCh0aGlzLmxpbmVzLCBvdGhlci5saW5lcykgJiYgdGhpcy5zdGF0ZSA9PT0gb3RoZXIuc3RhdGUgJiYgdGhpcy50eXBlID09PSBvdGhlci50eXBlO1xuICAgICAgICBsZXQgY2hlY2tBY2NvdW50ID0gdHJ1ZTtcbiAgICAgICAgaWYgKHRoaXMuYWNjb3VudCAmJiBvdGhlci5hY2NvdW50KSB7XG4gICAgICAgICAgICBjaGVja0FjY291bnQgPSB0aGlzLmFjY291bnQuZXF1YWxzKG90aGVyLmFjY291bnQpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuYWNjb3VudCB8fCBvdGhlci5hY2NvdW50KSB7XG4gICAgICAgICAgICBjaGVja0FjY291bnQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2hlY2tQcmltcyAmJiBjaGVja0FjY291bnQ7XG4gICAgfVxufVxuXG5Ac3VwZXJ0eXBlQ2xhc3Moe3RvQ2xpZW50OiBbJ0EnLCAnQm90aCddfSlcbmV4cG9ydCBjbGFzcyBBZGRyZXNzQSBleHRlbmRzIEFkZHJlc3Mge1xuXG59XG5cbkBzdXBlcnR5cGVDbGFzcyh7dG9DbGllbnQ6IFsnQicsICdCb3RoJ10sIHN5bmNTdGF0ZXM6IFsnZmlyc3QnXX0pXG5leHBvcnQgY2xhc3MgQWRkcmVzc0JGaXJzdFN0YWdlIGV4dGVuZHMgQWRkcmVzcyB7XG5cbn1cblxuQHN1cGVydHlwZUNsYXNzKHt0b0NsaWVudDogWydCJywgJ0JvdGgnXSwgc3luY1N0YXRlczogWydzZWNvbmQnXX0pXG5leHBvcnQgY2xhc3MgQWRkcmVzc0JTZWNvbmRTdGFnZSBleHRlbmRzIEFkZHJlc3Mge1xuXG59XG4iXX0=