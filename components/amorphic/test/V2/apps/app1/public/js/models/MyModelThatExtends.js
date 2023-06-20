module.exports.MyModelThatExtends = async function(objectTemplate, uses) {
    var Model = await uses('Model.js', 'Model');

    Model.extend({
        name: 'MyModelThatExtends',
        toClient: false,
        toServer: true
    }, {
        extendedTemplateData: {
            type: String,
            value: 'initial'
        }
    });
};
