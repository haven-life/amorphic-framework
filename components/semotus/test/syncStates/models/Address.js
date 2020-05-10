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
        var checkPrims = this.city === other.city && this.lines === other.lines && this.state === other.state && this.type === other.type;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRkcmVzcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkFkZHJlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQWtFO0FBQ2xFLHVDQUFvQztBQUNwQyxxQ0FBa0M7QUFHbEM7SUFBNkIsMkJBQVM7SUF1QmxDLGlCQUFZLFFBQVEsRUFBRSxJQUFLLEVBQUUsS0FBTSxFQUFFLEtBQU07UUFBM0MsWUFDSSxpQkFBTyxTQUtWO1FBMUJELFdBQUssR0FBa0IsRUFBRSxDQUFDO1FBRTFCLFVBQUksR0FBVyxFQUFFLENBQUM7UUFFbEIsV0FBSyxHQUFXLEVBQUUsQ0FBQztRQWtCZixLQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixLQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDekIsS0FBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7O0lBQzdCLENBQUM7SUFFRCx3QkFBTSxHQUFOLFVBQU8sS0FBYztRQUNqQixJQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDcEksSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO1lBQy9CLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDckQ7YUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRTtZQUN0QyxZQUFZLEdBQUcsS0FBSyxDQUFDO1NBQ3hCO1FBQ0QsT0FBTyxVQUFVLElBQUksWUFBWSxDQUFDO0lBQ3RDLENBQUM7SUFyQ0Q7UUFEQyxlQUFRLENBQUMsRUFBQyxJQUFJLEVBQUUsTUFBTSxFQUFDLENBQUM7a0NBQ2xCLEtBQUs7MENBQWM7SUFFMUI7UUFEQyxlQUFRLEVBQUU7a0NBQ0wsTUFBTTt5Q0FBTTtJQUVsQjtRQURDLGVBQVEsRUFBRTs7MENBQ1E7SUFNbkI7UUFMQyxlQUFRLENBQUM7WUFDTixPQUFPLEVBQUU7Z0JBQ0wsT0FBTyxtQkFBUSxDQUFBO1lBQ25CLENBQUM7U0FDSixDQUFDO2tDQUNRLG1CQUFROzZDQUFDO0lBRW5CO1FBREMsZUFBUSxFQUFFOzt5Q0FDRTtJQU1iO1FBTEMsZUFBUSxDQUFDO1lBQ04sT0FBTyxFQUFFO2dCQUNMLE9BQU8saUJBQU8sQ0FBQTtZQUNsQixDQUFDO1NBQ0osQ0FBQztrQ0FDTyxpQkFBTzs0Q0FBQztJQXJCUixPQUFPO1FBRG5CLHFCQUFjOztPQUNGLE9BQU8sQ0F5Q25CO0lBQUQsY0FBQztDQUFBLEFBekNELENBQTZCLGdCQUFTLEdBeUNyQztBQXpDWSwwQkFBTztBQTRDcEI7SUFBOEIsNEJBQU87SUFBckM7O0lBRUEsQ0FBQztJQUZZLFFBQVE7UUFEcEIscUJBQWMsQ0FBQyxFQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsRUFBQyxDQUFDO09BQzdCLFFBQVEsQ0FFcEI7SUFBRCxlQUFDO0NBQUEsQUFGRCxDQUE4QixPQUFPLEdBRXBDO0FBRlksNEJBQVE7QUFLckI7SUFBd0Msc0NBQU87SUFBL0M7O0lBRUEsQ0FBQztJQUZZLGtCQUFrQjtRQUQ5QixxQkFBYyxDQUFDLEVBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFDLENBQUM7T0FDcEQsa0JBQWtCLENBRTlCO0lBQUQseUJBQUM7Q0FBQSxBQUZELENBQXdDLE9BQU8sR0FFOUM7QUFGWSxnREFBa0I7QUFLL0I7SUFBeUMsdUNBQU87SUFBaEQ7O0lBRUEsQ0FBQztJQUZZLG1CQUFtQjtRQUQvQixxQkFBYyxDQUFDLEVBQUMsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFDLENBQUM7T0FDckQsbUJBQW1CLENBRS9CO0lBQUQsMEJBQUM7Q0FBQSxBQUZELENBQXlDLE9BQU8sR0FFL0M7QUFGWSxrREFBbUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3Byb3BlcnR5LCBTdXBlcnR5cGUsIHN1cGVydHlwZUNsYXNzfSBmcm9tICcuLi8uLi8uLi9kaXN0JztcbmltcG9ydCB7Q3VzdG9tZXJ9IGZyb20gJy4vQ3VzdG9tZXInO1xuaW1wb3J0IHtBY2NvdW50fSBmcm9tICcuL0FjY291bnQnO1xuXG5Ac3VwZXJ0eXBlQ2xhc3NcbmV4cG9ydCBjbGFzcyBBZGRyZXNzIGV4dGVuZHMgU3VwZXJ0eXBlIHtcblxuICAgIEBwcm9wZXJ0eSh7dHlwZTogU3RyaW5nfSlcbiAgICBsaW5lczogQXJyYXk8U3RyaW5nPiA9IFtdO1xuICAgIEBwcm9wZXJ0eSgpXG4gICAgY2l0eTogU3RyaW5nID0gJyc7XG4gICAgQHByb3BlcnR5KClcbiAgICBzdGF0ZTogc3RyaW5nID0gJyc7XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEN1c3RvbWVyXG4gICAgICAgIH1cbiAgICB9KVxuICAgIGN1c3RvbWVyOiBDdXN0b21lcjtcbiAgICBAcHJvcGVydHkoKVxuICAgIHR5cGU6IHN0cmluZztcbiAgICBAcHJvcGVydHkoe1xuICAgICAgICBnZXRUeXBlOiAoKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudFxuICAgICAgICB9XG4gICAgfSlcbiAgICBhY2NvdW50OiBBY2NvdW50O1xuXG4gICAgY29uc3RydWN0b3IoY3VzdG9tZXIsIGNpdHk/LCBzdGF0ZT8sIGxpbmVzPykge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmNpdHkgPSBjaXR5O1xuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XG4gICAgICAgIHRoaXMubGluZXMgPSBsaW5lcyB8fCBbXTtcbiAgICAgICAgdGhpcy5jdXN0b21lciA9IGN1c3RvbWVyO1xuICAgIH1cblxuICAgIGVxdWFscyhvdGhlcjogQWRkcmVzcykge1xuICAgICAgICBjb25zdCBjaGVja1ByaW1zID0gdGhpcy5jaXR5ID09PSBvdGhlci5jaXR5ICYmIHRoaXMubGluZXMgPT09IG90aGVyLmxpbmVzICYmIHRoaXMuc3RhdGUgPT09IG90aGVyLnN0YXRlICYmIHRoaXMudHlwZSA9PT0gb3RoZXIudHlwZTtcbiAgICAgICAgbGV0IGNoZWNrQWNjb3VudCA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLmFjY291bnQgJiYgb3RoZXIuYWNjb3VudCkge1xuICAgICAgICAgICAgY2hlY2tBY2NvdW50ID0gdGhpcy5hY2NvdW50LmVxdWFscyhvdGhlci5hY2NvdW50KTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmFjY291bnQgfHwgb3RoZXIuYWNjb3VudCkge1xuICAgICAgICAgICAgY2hlY2tBY2NvdW50ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNoZWNrUHJpbXMgJiYgY2hlY2tBY2NvdW50O1xuICAgIH1cbn1cblxuQHN1cGVydHlwZUNsYXNzKHt0b0NsaWVudDogWydBJywgJ0JvdGgnXX0pXG5leHBvcnQgY2xhc3MgQWRkcmVzc0EgZXh0ZW5kcyBBZGRyZXNzIHtcblxufVxuXG5Ac3VwZXJ0eXBlQ2xhc3Moe3RvQ2xpZW50OiBbJ0InLCAnQm90aCddLCBzeW5jU3RhdGVzOiBbJ2ZpcnN0J119KVxuZXhwb3J0IGNsYXNzIEFkZHJlc3NCRmlyc3RTdGFnZSBleHRlbmRzIEFkZHJlc3Mge1xuXG59XG5cbkBzdXBlcnR5cGVDbGFzcyh7dG9DbGllbnQ6IFsnQicsICdCb3RoJ10sIHN5bmNTdGF0ZXM6IFsnc2Vjb25kJ119KVxuZXhwb3J0IGNsYXNzIEFkZHJlc3NCU2Vjb25kU3RhZ2UgZXh0ZW5kcyBBZGRyZXNzIHtcblxufVxuIl19