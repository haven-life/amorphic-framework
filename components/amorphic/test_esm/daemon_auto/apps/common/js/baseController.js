'use strict';

export function baseController(objectTemplate) {
    var BaseController = objectTemplate.create('BaseController', {
        baseProp: {type: Boolean, value: true}
    });

    return {
        BaseController: BaseController
    };
};
