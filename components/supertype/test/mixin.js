var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;

var Car = ObjectTemplate.create('Car', {
    obj: {
        type: Object,
        value: {
            type: 'Car'
        }
    },
    doorCount: {
        type: Number
    },
    date: {
        type: Date,
        value: new Date(100)
    }
});

Car.mixin({
    init: function() {
        this.startVehicle();
    },
    engineRunning: {
        type: Boolean,
        value: false
    },
    doorCount: {
        type: Number,
        value: 4
    },
    wheelCount: {
        type: Number,
        value: 4
    },
    startVehicle: function() {
        this.engineRunning = true;
    },
    getWheelCountString: function() {
        return 'Has ' + this.wheelCount + ' wheels';
    },
    getDoorCountString: function() {
        return 'Has ' + this.doorCount + ' doors';
    }
});

var Coupe = Car.extend('Coupe', {
    doorCount: {
        type: Number,
        value: 2
    }
});

describe('#mixin', function() {
    it('should preserve original template properties not included in mixin', function() {
        var car = new Car();
        expect(car.obj.type).to.equal('Car');
        expect(car.date.getTime()).to.equal(100);
    });

    it('should override template properties included in mixin', function() {
        var car = new Car();
        expect(car.doorCount).to.equal(4);
        expect(car.engineRunning).to.equal(true);
    });

    it('should have mixed-in values in extended templates', function() {
        var coupe = new Coupe();
        expect(coupe.obj.type).to.equal('Car');
        expect(coupe.engineRunning).to.equal(true);
        expect(coupe.getWheelCountString()).to.equal('Has 4 wheels');
        expect(coupe.getDoorCountString()).to.equal('Has 2 doors');
    });
});
