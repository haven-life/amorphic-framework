var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;

var BaseTemplate1 = ObjectTemplate.create('BaseTemplate1',
    {
        boolTrue:   {type: Boolean, value: true},
        boolFalse:  {type: Boolean, value: false},
        num:        {type: Number, value: 100},
        str:        {type: String, value: 'Base'},
        obj:        {type: Object, value: {type: 'Base'}},
        date:       {type: Date, value: new Date(100)},
        enum:		{type: String, values: ['b1'], descriptions: {'b1': 'BaseTemplate1'}},
        getNum:     function () {
            return this.num;
        }
    }
);

var ExtendedTemplate1 = BaseTemplate1.extend('ExtendedTemplate1',
    {
        boolTrue:   {type: Boolean, value: false},
        boolFalse:  {type: Boolean, value: true},
        num:        {type: Number, value: 200},
        str:        {type: String, value: 'Extended'},
        obj:        {type: Object, value: {type: 'Extended'}},
        date:       {type: Date, value: new Date(200)},
        init: function () {
            BaseTemplate1.call(this);
        }
    }
);

var BaseTemplate2 = ObjectTemplate.create('BaseTemplate2', {
    boolTrue:   {type: Boolean, value: true},
    boolFalse:  {type: Boolean, value: false},
    num:        {type: Number, value: 100},
    str:        {type: String, value: 'Base'},
    obj:        {type: Object, value: {type: 'Base'}},
    date:       {type: Date, value: new Date(100)},
    enum:		{type: String, values: ['b1'], descriptions: {'b1': 'BaseTemplate1'}}
}
);

var ExtendedTemplate2 = BaseTemplate1.extend('ExtendedTemplate2',
    {
        boolTrue:   {type: Boolean, value: false},
        boolFalse:  {type: Boolean, value: true},
        num:        {type: Number, value: 200},
        str:        {type: String, value: 'Extended'},
        obj:        {type: Object, value: {type: 'Extended'}},
        date:       {type: Date, value: new Date(200)},
        init: function () {
            BaseTemplate1.call(this);
            this.boolTrue = true;
            this.boolFalse = false;
            this.num = 100;
            this.str = 'Base';
            this.obj = {type: 'Base'};
            this.date = new Date(100);
        }
    }
);

var ExtendedTemplate3 = BaseTemplate1.extend('ExtendedTemplate1',
    {
        boolTrue:   {type: Boolean, value: false},
        boolFalse:  {type: Boolean, value: true},
        num:        {type: Number, value: 200},
        str:        {type: String, value: 'Extended'},
        obj:        {type: Object, value: {type: 'Extended'}},
        date:       {type: Date, value: new Date(200)},
        init: function () {
            BaseTemplate1.call(this);
            this.boolTrue = false;
            this.boolFalse = true;
            this.num = 200;
            this.str = 'Extended';
            this.obj = {type: 'Extended'};
            this.date = new Date(200);
        }
    }
);

var ExtendedTemplate4 = ExtendedTemplate3.extend('ExtendedTemplate4',
    {
        enum: {
            type: String,
            values: function () {
                return ['b3'];
            },
            descriptions: function () {
                return {'b3': this.str};
            }
        }
    }
);

var ExtendedTemplate5 = ExtendedTemplate3.extend('ExtendedTemplate4',
    {
        enum: {
            type: String,
            values: function () {
                return ['b3'];
            },
            descriptions: function () {
                return {'b3': this.str};
            }
        }
    }
);

describe('#extend', function() {

    it('should extend a base class and create BaseTemplate2', function() {

        expect(ObjectTemplate.__templateUsage__['BaseTemplate1']).to.equal(undefined);

        var extendedTemplate1 = new ExtendedTemplate1();

        expect(ObjectTemplate.__templateUsage__['BaseTemplate1']).to.equal(true);
        expect(ObjectTemplate.__templateUsage__['ExtendedTemplate1']).to.equal(true);

        expect(extendedTemplate1.boolTrue).to.equal(false);
        expect(extendedTemplate1.boolFalse).to.equal(true);
        expect(extendedTemplate1.num).to.equal(200);
        expect(extendedTemplate1.str).to.equal('Extended');
        expect(extendedTemplate1.obj.type).to.equal('Extended');
        expect(extendedTemplate1.date.getTime()).to.equal(200);

    });

    it('should extend a base class and be able to overwrite properties in it\'s init function', function() {
        var extendedTemplate2 = new ExtendedTemplate2();

        expect(extendedTemplate2.boolTrue).to.equal(true);
        expect(extendedTemplate2.boolFalse).to.equal(false);
        expect(extendedTemplate2.num).to.equal(100);
        expect(extendedTemplate2.str).to.equal('Base');
        expect(extendedTemplate2.obj.type).to.equal('Base');
        expect(extendedTemplate2.date.getTime()).to.equal(100);
    });

    it('should extend a base class and use a previously used name and overwrite those properties in the dictionary', function() {
        var extendedTemplate3 = new ExtendedTemplate3();

        expect(extendedTemplate3.boolTrue).to.equal(false);
        expect(extendedTemplate3.boolFalse).to.equal(true);
        expect(extendedTemplate3.num).to.equal(200);
        expect(extendedTemplate3.str).to.equal('Extended');
        expect(extendedTemplate3.obj.type).to.equal('Extended');
        expect(extendedTemplate3.date.getTime()).to.equal(200);

        var baseTemplate1 = new BaseTemplate1();
        expect(BaseTemplate1.props.enum.values[0]).to.equal('b1');
        expect(baseTemplate1.__prop__('enum').values[0]).to.equal('b1');
        expect(baseTemplate1.__prop__('enum').descriptions['b1']).to.equal('BaseTemplate1');
    });

    it('should extend an extended class', function() {
        var extendedTemplate4 = new ExtendedTemplate4();
        expect(extendedTemplate4.__descriptions__('enum')['b3']).to.equal('Extended');
    });

});
