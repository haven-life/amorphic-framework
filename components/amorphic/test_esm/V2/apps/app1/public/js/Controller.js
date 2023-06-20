export function objectTemplateInitialize(objectTemplate) {
    objectTemplate.toServerRuleSet = ['app1'];
    objectTemplate.toClientRuleSet = ['app1'];
};

export async function Controller(objectTemplate, uses) {
    // objectTemplate.debugInfo = 'io;api';

    var myModelThatExtends = await uses('./models/MyModelThatExtends.js', 'MyModelThatExtends');

    var Controller = objectTemplate.create('Controller', {
        mainFunc: {
            on: 'server',
            body: function() {
                return globalThis.serverAssert();
            }
        },
        serverInit: function () {
            serverController = this;
        },
        someData: {
            type: String,
            value: 'initial'
        }
    });

};
