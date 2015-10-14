# Amorphic Router

## Purpose

To automated URL mapping for an application using Bindster or other single page application framework.

## Features
The router has these main features

* Maps URLs to the state of your application
* Map search parameters to and from URL parameters
* Calls an entry and exit function for each URL
* Hierarchically organized such that mappings are inherited down the tree
* Automatically uses pushstate in browsers that support it and hashmarks in browsers that don't

## Concepts
You start with a route map that is a an object with properties for each route.  By default the property is the path.
Each path can have these properties

* routes - which defines a sub-tree of paths
* parameters - set of properties that map search parameters to the url
* enter - a function executed when the route is invoked.  It is passed the route itself which contains these properties of interest:
    * getId - function that returns the id of the route independent of the path
    * getPath - function that returns the path of the route
    * Any user property included in the route definition 
* exit - a runction execute when a new route is invoked
* path - let's you override the default url path portion which defaults to #property, which is useful for a single page application
    * /xxx means replace href
    * \#xxx means use bookmark and append to URL
    * \/\#xxx means use bookmark and replace URL
    * -/xxx means replace href using pushState if possible
    * -\#xxx means use bookmark and append to URL using pushState if possible
    * -\/\#xxx means use bookmark and replace URL using pushState if possible
* nested - indicates that the route is nested and the previous route is restored by router.popRoute()

You can also define any other properties.  Since the route object is a tree your own properties are 
inherited as you move down the tree.  This lets you define properties that apply to a whole section of
a tree.  The enter and exit properties also are inherited but are cumulative so that if you specify
an enter/exit function it will get executed prior to any lower level enter/exit functions.  The
enter/exit functions are called with the node of the hierarchy as a parameter 

search properties are also objects which have these properties
* bind - a property in your bindster context that will map to a url search parameter
* toURL - true if url is to be updated when the bind element changes
* fromURL - true if the property is to be bound 

The router has these functions:
* route(routedefinition) - establish routes, returns the top level route in the heirarchy
* goTo(path) - navigate to a route given the path
* goToById(id) - navigate to a route given the id

Here is a sample:

    var main = router.route(controller,
    {
        enter: function (route) {
            if (route.file) {
                this.page = route.getId();
                this.className = route.className;
            }
        },
        parameters: {                   // how to parse and optionally compose  the search part of the url
            utm_campaign: {bind: "utm_campaign", encode: false},
            utm_keywords: {bind: "utm_keywords", encode: false},
            utm_media:    {bind: "utm_media", encode: false}
        },
        file: 'home.html',
        routes: {
            user: {                         // my default this would be a spec for /user
                file: 'home.html',
                path: '',                  // but we override it to be /
                className: "userStyle",     // an extra property we can just reference it is pushed to child nodes
                enter: function () {this.enteredUser = true;}, // when this route is navigated to
                routes: {  // sub-routes by default each property is a url fragment eg /tickets
                    tickets: {file: 'tickets.html'},
                    ticket: {
                        file: 'ticket.html',
                        parameters: {ticket: {bind: "ticketId"}}
                    },
                    profile: {
                        routes: {
                            main: {path: '', file: 'profile.html'},    // /profile/
                            password: {file: 'password.html'},          // /profile/password
                            email: {file: 'email.html'}                 // /profile/email
                        }
                    },
                    dialog: {
                         exit:  function() {
                             this.popup=null
                         },
                        routes: {
                            login: {
                                nested: true,
                                file: null,
                                enter: function (route, p) {
                                    this.popup = 'login.html'
                                    expect(p).to.equal(600);
                                    expect(route).to.equal(main.user.dialog.login);
                                }
                            },
                            change_password: {file: 'change_password.html'}
                        }
                    }
                }
            }
        }
    });

The route itself is a function and the routes returned from router.route are in the same heirarchy so you can navigigate
there like this

    main.user.profile.email();

That first enter property is inherited by all routes and will set the file property to the file name property
and the className to the className of the route.  The className in this example is inherited from the user and
admin levels of the tree.  

This means that with Bindster you can use this to dynamically include the page file you need.

     <div b:class="{className}">
        <b:include urlbind="{file}">
     </div>
 