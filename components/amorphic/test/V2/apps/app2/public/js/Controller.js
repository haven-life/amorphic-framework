module.exports.objectTemplateInitialize = function (objectTemplate) {
    objectTemplate.toServerRuleSet = ['app2'];
    objectTemplate.toClientRuleSet = ['app2'];
};

module.exports.Controller = async function (objectTemplate, uses) {
    var myModelThatExtends = await uses('models/MyModelThatExtends.js', 'MyModelThatExtends', {
        app: 'app1'
    });

    var Model = await uses('Model.js', 'Model');

    objectTemplate.create('Controller', {
        mainFunc: {
            on: 'server',
            body: function() {
                return serverAssert();
            }
        },
        someData2: {
            type: String,
            value: 'initial'
        }
    });
};