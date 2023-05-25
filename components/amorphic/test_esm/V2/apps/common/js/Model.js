export function Model(objectTemplate, uses) {
    objectTemplate.create({
        name: 'Model',
        toClient: true,
        toServer: true
    }, {
        data: {
            type: String,
            value: 'initial'
        }
    });
};
