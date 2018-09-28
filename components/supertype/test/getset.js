var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;

/* Teacher Student Example */

var Please = ObjectTemplate.create('Please',
    {
        prop_please: {type: String, value: 'init'},
        prop_prettyPlease: {type: String, value: 'init'},
        please: {type: String, value: 'init', get: function(v) {
            return v.match(/please/) ? v : v + ' please';
        }},
        prettyPlease: {type: String, value: 'init',
            get: function(v) {
                return v.match(/please/) ? v : v + ' please';
            },
            set: function(v) {
                return v.match(/pretty/) ? v : v + ' pretty';
            }
        },
        half1: {type: Number, value: 5},
        half2: {type: Number, value: 5},
        whole: {type: Number, isVirtual: true,
            get: function (x) {
                return this.half1 + this.half2;
            },
            set: function (x) {
                this.half1 = x / 2; this.half2 = x / 2;
            }}

    });

var ExtendedPlease = Please.extend('ExtendedPlease',
    {
        prop_please: {type: String, value: 'init', get: function(v) {
            return v.match(/please/) ? v : v + ' please';
        }},
        prop_prettyPlease: {type: String, value: 'init',
            get: function(v) {
                return v.match(/please/) ? v : v + ' please';
            },
            set: function(v) {
                return v.match(/pretty/) ? v : v + ' pretty';
            }
        }
    });

describe('Getters and setters', function () {

    it ('work in base classes', function (done) {
        var t1 = new Please();
        expect(t1.please).to.equal('init please');
        expect(t1.prettyPlease).to.equal('init pretty please');
        done();
    });

    it ('work in extended classes', function (done) {
        var t1 = new ExtendedPlease();
        expect(t1.please).to.equal('init please');
        expect(t1.prettyPlease).to.equal('init pretty please');
        expect(t1.prop_please).to.equal('init please');
        expect(t1.prop_prettyPlease).to.equal('init pretty please');
        expect(t1.__prop_prettyPlease).to.equal('init pretty');
        done();
    });

    it ('can do virtual functions', function (done) {
        var t1 = new Please();
        expect(t1.half1).to.equal(5);
        expect(t1.half2).to.equal(5);
        expect(t1.whole).to.equal(10);
        t1.whole = 20;
        expect(t1.half1).to.equal(10);
        expect(t1.half2).to.equal(10);
        expect(t1.whole).to.equal(20);
        expect(t1.__whole).to.equal(undefined);
        done();
    });

});
