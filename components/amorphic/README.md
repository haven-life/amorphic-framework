# Amorphic

## Description

Front-to-back isomorphic framework for developing applications with Node.js

## Installation

To install using npm:

    $ npm install amorphic

To get started with a more complex app see the [Amorphic Ticket Demo](https://github.com/selsamman/amorphic-ticket-demo/)

## Usage

Create an `app.js` entry point as follows:

    require('amorphic').listen(__dirname);

The listen function also has a parameter for a bunyan type logger to be passed in to be used with amorphic. This can be accessed with clientLogger on the SupertypeLogger in SupertypeSession or the object template. In the past this parameter was a sendToLog function but that has been deprecated. sendToLog is now an internal function in SupertypeLogger to pass logs to the logger that is passed in.

Create a `config.json` file top level at least the following options set:

    {
        "application": "name-of-your-application",
        "applications": {
            "name-of-your-application": "directory-of-your-application"
        }
    }

The directory structure for an amorphic application must be the following:

    /apps - directory of all amorphic applications (can have multiple applications under this directory)
        /your-application - where all your app code lives
        /common - where all the code that is common across your applications lives

Create a `schema.json` file in your application directory which will contain your data schema information for persistor to persist your data to the database.

Note: The `schema.json` file needs at least an opening and a closing curly brace.

Start the application:

    $ node app.js --port <available port>

See this [blog post](http://elsamman.com/?p=117) for more info on Amorphic and this
[video ](http://www.screencast.com/t/Z5Y2jMTmJ) that demos the drpatient sample

## Validation 

The Amorphic server has validation middleware that will validate requests coming into the server based on fields specified in a config.

There are four fields to put in the config.json for the amorphic app. These fields are:

```
    validatorAllowList: characters that are allowed in the request, a white list
    validatorDenyList: characters that are not allowed in the request, a black list
    validatorLog: boolean for logging whenever a request is blacklisted, whitelisted, or has HTML values escaped
    validatorEscapeHTML: boolean for allowing HTML characters to be escaped
```

The whitelist and blacklist fields follow the format here: https://www.npmjs.com/package/validator

The whitelist field is especially dangerous to use as it will only allow characters that match the format to pass the validator.

The blacklist field also has certain characters that should not be blocked, such as '-', as that will most likely corrupt the amorphic message and cause problems.

The order that this validation is performed is blacklist, escape, whitelist.

The config.json found for the amorphic postgres unit test found here: components/amorphic/test/postgres/apps/test/config.json, contains examples of how these fields should be used.

There is also a counter under statsd for 'amorphic.server.validator.whitelist.counter', 'amorphic.server.validator.blacklist.counter', and 'amorphic.server.validator.escape.counter' that will count the times requests are blacklisted, whitelisted, or escaped.

## Testing

Run all the tests:

    $ npm test

Run a specific test (in this case, daemon test):

    $ npm run test:daemon

## License

Amorphic is licensed under the MIT license

