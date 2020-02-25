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

## Testing

Run all the tests:

    $ npm test

Run a specific test (in this case, config test):

    $ npm run test:config

## License

Amorphic is licensed under the MIT license

