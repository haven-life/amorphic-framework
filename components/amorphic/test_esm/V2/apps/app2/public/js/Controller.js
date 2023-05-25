let serverController;

export function objectTemplateInitialize(objectTemplate) {
    objectTemplate.toServerRuleSet = ['app2'];
    objectTemplate.toClientRuleSet = ['app2'];
};

export async function Controller(objectTemplate, uses) {
    var myModelThatExtends = await uses('models/MyModelThatExtends.js', 'MyModelThatExtends', {
        app: 'app1'
    });

    var Model = await uses('Model.js', 'Model');

    objectTemplate.create('Controller', {
        mainFunc: {
            on: 'server',
            body: function() {
                return globalThis.serverAssert();
            }
        },
        serverInit: function () {
            serverController = this;
        },
        someData2: {
            type: String,
            value: 'initial'
        }
    });
};