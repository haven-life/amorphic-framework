module.exports.objectTemplateInitialize = function(objectTemplate) {
    objectTemplate.toServerRuleSet = ['app1'];
    objectTemplate.toClientRuleSet = ['app1'];
};

module.exports.Controller = async function (objectTemplate, uses) {
    // objectTemplate.debugInfo = 'io;api';

    var myModelThatExtends = await uses('./models/MyModelThatExtends.js', 'MyModelThatExtends');

    var Controller = objectTemplate.create('Controller', {
        mainFunc: {
            on: 'server',
            body: function() {
                return serverAssert();
            }
        },
        someData: {
            type: String,
            value: 'initial'
        }
    });

};
