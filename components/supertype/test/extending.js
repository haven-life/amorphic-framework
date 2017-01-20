var expect = require('chai').expect;
var ObjectTemplate = require('../index.js');



describe("Extended Templates", function () {
	it ("has extended values", function () {
		var BaseTemplate1 = ObjectTemplate.create("BaseTemplate1",
			{
				boolTrue:   {type: Boolean, value: true},
				boolFalse:  {type: Boolean, value: false},
				num:        {type: Number, value: 100},
				str:        {type: String, value: 'Base'},
				obj:        {type: Object, value: {type: 'Base'}},
				date:       {type: Date, value: new Date(100)},
				enum:		{type: String, values: ['b1'], descriptions: {'b1': 'BaseTemplate1'}}
			});

		var ExtendedTemplate1 = BaseTemplate1.extend("ExtendedTemplate1",
			{
				boolTrue:   {type: Boolean, value: false},
				boolFalse:  {type: Boolean, value: true},
				num:        {type: Number, value: 200},
				str:        {type: String, value: 'Extended'},
				obj:        {type: Object, value: {type: 'Extended'}},
				date:       {type: Date, value: new Date(200)},
				init: function () {
					BaseTemplate1.call(this);
				},
			});

		var ExtendedTemplate2 = BaseTemplate1.extend("ExtendedTemplate2",
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
				},
			});

		var ExtendedTemplate3 = BaseTemplate1.extend("ExtendedTemplate1",
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
				},
			});

		var ExtendedTemplate4 = ExtendedTemplate3.extend("ExtendedTemplate4",
			{
				enum:		{type: String, 
					values: function () {return ['b3']},
					descriptions: function () {return {'b3': this.str}}}
			});
        var ExtendedTemplate5 = ExtendedTemplate3.extend("ExtendedTemplate4",
            {
                enum:		{type: String,
                    values: function () {return ['b3']},
                    descriptions: function () {return {'b3': this.str}}}
            });

    expect(ObjectTemplate.__templateUsage__['BaseTemplate1']).to.equal(undefined);
		expect((new ExtendedTemplate1()).boolTrue).to.equal(false);
    expect(ObjectTemplate.__templateUsage__['BaseTemplate1']).to.equal(true);
    expect(ObjectTemplate.__templateUsage__['ExtendedTemplate1']).to.equal(true);
    expect((new ExtendedTemplate1()).boolFalse).to.equal(true);
		expect((new ExtendedTemplate1()).num).to.equal(200);
		expect((new ExtendedTemplate1()).str).to.equal('Extended');
		expect((new ExtendedTemplate1()).obj.type).to.equal('Extended');
		expect((new ExtendedTemplate1()).date.getTime()).to.equal(200);

		expect((new ExtendedTemplate2()).boolTrue).to.equal(true);
		expect((new ExtendedTemplate2()).boolFalse).to.equal(false);
		expect((new ExtendedTemplate2()).num).to.equal(100);
		expect((new ExtendedTemplate2()).str).to.equal('Base');
		expect((new ExtendedTemplate2()).obj.type).to.equal('Base');
		expect((new ExtendedTemplate2()).date.getTime()).to.equal(100);

		expect((new ExtendedTemplate3()).boolTrue).to.equal(false);
		expect((new ExtendedTemplate3()).boolFalse).to.equal(true);
		expect((new ExtendedTemplate3()).num).to.equal(200);
		expect((new ExtendedTemplate3()).str).to.equal('Extended');
		expect((new ExtendedTemplate3()).obj.type).to.equal('Extended');
		expect((new ExtendedTemplate3()).date.getTime()).to.equal(200);
		console.log(JSON.stringify(BaseTemplate1.props.enum));
		expect(BaseTemplate1.props.enum.values[0]).to.equal('b1');
		expect((new BaseTemplate1()).__prop__('enum').values[0]).to.equal('b1');
		expect((new BaseTemplate1()).__prop__('enum').descriptions['b1']).to.equal('BaseTemplate1');
		expect((new ExtendedTemplate4()).__descriptions__('enum')['b3']).to.equal('Extended');
		
		
	});
});
