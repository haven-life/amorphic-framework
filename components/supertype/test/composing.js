var expect = require('chai').expect;
var ObjectTemplate = require('../dist/index.js').default;

describe('Composing Templates', function () {
    it ('has extended values', function () {
        var TemplatePartialBase = ObjectTemplate.create('TemplatePartialBase',
            {
                obj:        {type: Object, value: {type: 'Base'}},
                date:       {type: Date, value: new Date(100)},
                enum:		{type: String, values: ['b1'], descriptions: {'b1': 'BaseTemplate1'}},
                templatePartialBase: function () {
                    return 'TemplatePartialBase';
                },
                init: function () {
                    this.num = 300;
                }
            });

        var TemplatePartial = TemplatePartialBase.extend('TemplatePartial',
            {
                boolTrue:   {type: Boolean, value: true},
                boolFalse:  {type: Boolean, value: false},
                num:        {type: Number, value: 200},
                str:        {type: String, value: 'Extended'},
                templatePartial: function () {
                    return 'TemplatePartial';
                },
                init: function () {
                    TemplatePartialBase.call(this);
                    this.str = 'InitValue';
                }
            });

        var FinalTemplate = ObjectTemplate.create('FinalTemplate',
            {
                boolTrue2:   {type: Boolean, value: false},
                boolFalse2:  {type: Boolean, value: true},
                num2:        {type: Number, value: 200},
                str2:        {type: String, value: 'Extended'},
                obj2:        {type: Object, value: {type: 'Extended'}},
                date2:       {type: Date, value: new Date(200)},
                finalTemplate: function () {
                    return 'FinalTemplate';
                },
                init: function () {
                    this.boolTrue2 = true;
                    this.boolFalse2 = false;
                    this.num2 = 100;
                    this.str2 = 'InitValue';
                    this.obj2 = {type: 'InitValue'};
                    this.date2 = new Date(999);
                }
            });
        FinalTemplate.mixin(TemplatePartial);

        expect((new FinalTemplate()).boolTrue).to.equal(true);
        expect((new FinalTemplate()).boolFalse).to.equal(false);
        expect((new FinalTemplate()).num).to.equal(300);
        expect((new FinalTemplate()).str).to.equal('InitValue');
        expect((new FinalTemplate()).obj.type).to.equal('Base');
        expect((new FinalTemplate()).date.getTime()).to.equal(100);

        expect((new FinalTemplate()).boolTrue2).to.equal(true);
        expect((new FinalTemplate()).boolFalse2).to.equal(false);
        expect((new FinalTemplate()).num2).to.equal(100);
        expect((new FinalTemplate()).str2).to.equal('InitValue');
        expect((new FinalTemplate()).obj2.type).to.equal('InitValue');
        expect((new FinalTemplate()).date2.getTime()).to.equal(999);

        expect((new FinalTemplate()).finalTemplate()).to.equal('FinalTemplate');
        expect((new FinalTemplate()).templatePartial()).to.equal('TemplatePartial');
        expect((new FinalTemplate()).templatePartialBase()).to.equal('TemplatePartialBase');

    });
});
