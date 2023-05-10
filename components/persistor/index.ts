import { SupertypeConfig } from "@haventech/supertype";

module.exports = require('./lib/index.js');

if (!SupertypeConfig.useAmorphic) {
    module.exports.Persistor = module.exports.Persistor.create();
}
