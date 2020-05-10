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
var Role = /** @class */ (function (_super) {
    __extends(Role, _super);
    function Role(customer, account, relationship) {
        var _this = _super.call(this) || this;
        _this.relationship = 'primary';
        _this.customer = customer;
        _this.account = account;
        if (relationship)
            _this.relationship = relationship;
        return _this;
    }
    ;
    Role.prototype.equals = function (other) {
        return this.relationship === other.relationship;
    };
    __decorate([
        dist_1.property(),
        __metadata("design:type", String)
    ], Role.prototype, "relationship", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Customer_1.Customer;
            }
        }),
        __metadata("design:type", Customer_1.Customer)
    ], Role.prototype, "customer", void 0);
    __decorate([
        dist_1.property({
            getType: function () {
                return Account_1.Account;
            }
        }),
        __metadata("design:type", Account_1.Account)
    ], Role.prototype, "account", void 0);
    Role = __decorate([
        dist_1.supertypeClass,
        __metadata("design:paramtypes", [Object, Object, Object])
    ], Role);
    return Role;
}(dist_1.Supertype));
exports.Role = Role;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUm9sZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJvbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsc0NBQWtFO0FBQ2xFLHVDQUFvQztBQUNwQyxxQ0FBa0M7QUFHbEM7SUFBMEIsd0JBQVM7SUFpQi9CLGNBQVksUUFBUSxFQUFFLE9BQU8sRUFBRSxZQUFZO1FBQTNDLFlBQ0ksaUJBQU8sU0FLVjtRQXBCRCxrQkFBWSxHQUFXLFNBQVMsQ0FBQztRQWdCN0IsS0FBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsS0FBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxZQUFZO1lBQ1osS0FBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7O0lBQ3pDLENBQUM7SUFBQSxDQUFDO0lBRUYscUJBQU0sR0FBTixVQUFPLEtBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxZQUFZLEtBQUssS0FBSyxDQUFDLFlBQVksQ0FBQztJQUNwRCxDQUFDO0lBeEJEO1FBREMsZUFBUSxFQUFFOzs4Q0FDc0I7SUFNakM7UUFMQyxlQUFRLENBQUM7WUFDTixPQUFPLEVBQUU7Z0JBQ0wsT0FBTyxtQkFBUSxDQUFBO1lBQ25CLENBQUM7U0FDSixDQUFDO2tDQUNRLG1CQUFROzBDQUFDO0lBTW5CO1FBTEMsZUFBUSxDQUFDO1lBQ04sT0FBTyxFQUFFO2dCQUNMLE9BQU8saUJBQU8sQ0FBQTtZQUNsQixDQUFDO1NBQ0osQ0FBQztrQ0FDTyxpQkFBTzt5Q0FBQztJQWZSLElBQUk7UUFEaEIscUJBQWM7O09BQ0YsSUFBSSxDQTRCaEI7SUFBRCxXQUFDO0NBQUEsQUE1QkQsQ0FBMEIsZ0JBQVMsR0E0QmxDO0FBNUJZLG9CQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtwcm9wZXJ0eSwgU3VwZXJ0eXBlLCBzdXBlcnR5cGVDbGFzc30gZnJvbSAnLi4vLi4vLi4vZGlzdCc7XG5pbXBvcnQge0N1c3RvbWVyfSBmcm9tICcuL0N1c3RvbWVyJztcbmltcG9ydCB7QWNjb3VudH0gZnJvbSAnLi9BY2NvdW50JztcblxuQHN1cGVydHlwZUNsYXNzXG5leHBvcnQgY2xhc3MgUm9sZSBleHRlbmRzIFN1cGVydHlwZSB7XG5cbiAgICBAcHJvcGVydHkoKVxuICAgIHJlbGF0aW9uc2hpcDogc3RyaW5nID0gJ3ByaW1hcnknO1xuICAgIEBwcm9wZXJ0eSh7XG4gICAgICAgIGdldFR5cGU6ICgpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBDdXN0b21lclxuICAgICAgICB9XG4gICAgfSlcbiAgICBjdXN0b21lcjogQ3VzdG9tZXI7XG4gICAgQHByb3BlcnR5KHtcbiAgICAgICAgZ2V0VHlwZTogKCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIEFjY291bnRcbiAgICAgICAgfVxuICAgIH0pXG4gICAgYWNjb3VudDogQWNjb3VudDtcblxuICAgIGNvbnN0cnVjdG9yKGN1c3RvbWVyLCBhY2NvdW50LCByZWxhdGlvbnNoaXApIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5jdXN0b21lciA9IGN1c3RvbWVyO1xuICAgICAgICB0aGlzLmFjY291bnQgPSBhY2NvdW50O1xuICAgICAgICBpZiAocmVsYXRpb25zaGlwKVxuICAgICAgICAgICAgdGhpcy5yZWxhdGlvbnNoaXAgPSByZWxhdGlvbnNoaXA7XG4gICAgfTtcblxuICAgIGVxdWFscyhvdGhlcjogUm9sZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5yZWxhdGlvbnNoaXAgPT09IG90aGVyLnJlbGF0aW9uc2hpcDtcbiAgICB9XG59XG4iXX0=