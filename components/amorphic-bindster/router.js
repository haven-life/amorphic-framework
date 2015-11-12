AmorphicRouter =
{
    location: (typeof(document) != 'undefined') ? document.location : {pathname: '', search: '', hash: ''},
    history: (typeof(window) != 'undefined' && window.history ? window.history : null),
    paths: {},          // List of routes by paths
    routesById: {},      // List of routes by Id
    routes:{},          // Root of the routes
    currentRoute: null,
    hasPushState: !!(typeof(window) != 'undefined' && window.history && history.pushState),
    pushedRoutes: [],

    /**
     * Set up routing
     *
     * @param controller - a Bindster controller
     * @param routeIn - a routing definitions
     * @param options - options
     */
    route: function(controller, routeIn, options)
    {
        this.controller = controller;
        options = options || {};
        this.options = options;
        var self = this;
        this.routes = function () {
            var callArgs = [self.routes];
            for (var ix = 0; ix < arguments.length; ix++)
                callArgs.push(arguments[ix]);
            self._goTo.apply(self, callArgs);
        }

        this._parseRoute(this.routes, routeIn, {}, '', '');

        // Check regularly to see if path appears in location.href
        var self = this;
        setInterval(function () {self._checkURL()}, options.interval || 500);

        return this.routes;
    },

    /**
     * Called internally when going from route to the other but may
     * be called externally from say a windows.unload event
     */
    leave: function ()
    {
        if (this.currentRoute)
            for (var ix = 0; ix < this.currentRoute.__exit.length; ++ix)
                this.currentRoute.__exit[ix].call(this.controller, this.currentRoute);
        this.currentRoute = null;
    },

    /*
     * Called internally from goTo or when a route appears in location.href
     * but may be called to enter a route without it appearing in the address
     * bar or creating history
     */
    arrive: function (route, parsed)
    {
        if (route.__nested)
            this.pushedRoutes.push(this.currentRoute);
        else
            this.leave();
        this.currentRoute = route;
        for (var key in route.__parameters)
            if (parsed && parsed.parameters[key])
                this.controller.bindSet(route.__parameters[key].bind, parsed.parameters[key]);
        var callArgs = [route];
        if (this.pendingParameters)
            for (var ix = 0; ix < this.pendingParameters.arguments.length; ++ix)
                callArgs.push(this.pendingParameters.arguments[ix]);
        this.executedGoTo = false;
        for (var ix = 0; ix < this.currentRoute.__enter.length; ++ix) {
            if (this.pendingParameters && this.pendingParameters.route == route && ix == (this.currentRoute.__enter.length - 1))
                this.currentRoute.__enter[ix].apply(this.controller, callArgs);
            else
                this.currentRoute.__enter[ix].call(this.controller, this.currentRoute);
            if (this.executedGoTo)
                break;
        }
        this.pendingParameters = null;
        if (!this.executedGoTo) {
            this.controller.arrive(route);
            this.controller.refresh();
        }
    },
    popRoute: function() {
        this.leave();
        this.currentRoute = this.pushedRoutes.pop();
        this._updateURL(this.currentRoute);
    },
    getRoute: function () {
        return this.currentRoute;
    },

    /**
     * Go to a location based on a path (same invoking a route as a function admin.tickets());
     * @param path
     */
    goTo: function (path) {
        var route = this.paths[path.substr(0, 1) == '/' ? path : '/' + path];
        if (route) {
            var callArgs=[route];
            for (var ix = 1; ix < arguments.length; ix++)
                callArgs.push(arguments[ix]);
            this._goTo.apply(this, callArgs);
        }
    },
    /**
     * Go to a location based on id returned from route.getId();
     * @param path
     */
    goToById: function (id) {
        var route = this.routesById[id];
        if (route) {
            var callArgs=[route];
            for (var ix = 1; ix < arguments.length; ix++)
                callArgs.push(arguments[ix]);
            this._goTo.apply(this, callArgs);
        }
    },
    /**
     * Set a new route as active.  The route is a leaf in the routing definition tree
     * It is called internally by each leaf's goTo function.  History is created
     * for the route and it will appear in the address bar.  It may or may not load
     * a new page depending on the load boolean in the leaf.
     * @param route
     */
    _goTo: function (route)
    {
        // Prepare pending parameters
        this.pendingParameters = {route: route, arguments: []};
        for (var ix = 1; ix < arguments.length; ix++)
            this.pendingParameters.arguments.push(arguments[ix]);

        this._updateURL(route);
        if (route.__nested)
            this.arrive(route);
        else {
            this._checkURL();
            this.executedGoTo = true;
        }
    },
    _updateURL: function (route) {
        {
            route = route || {__path: ''}
            var prefix = (this.options.usePushState && this.hasPushState) ?
                route.__prefix : route.__prefix.replace(/-/, '');
            switch(route.__prefix) {

                // Non-pushState handling
                case '/':
                    this.location.href = '/' + this._encodeURL(route, route.__path, false);
                    break;
                case '#':
                    this.location.hash = '#' + this._encodeURL(route, route.__path, true);
                    break;
                case '/#':
                    if (this.location.pathname != '/')
                        this.location.href = '/#'+ this._encodeURL(route, route.__path, true);
                    else
                        this.location.hash = '#' + this._encodeURL(route, route.__path, true);
                    break;

                case '-/':
                    //this.location.hash = '';
                    this.history.pushState(route.__path, route.__title ? route.__title : null, '/' + this._encodeURL(route, route.__path, false));
                    break;
                case '-#':
                    this.history.pushState(route.__path, route.__title ? route.__title : null, '#' + this._encodeURL(route, route.__path, false));
                    break;
                case '-/#':
                    //this.location.hash = '';
                    this.history.pushState(route.__path, route.__title ? route.__title : null, '/#' + this._encodeURL(route, route.__path, false));
                    break;
            }
        }
    },

    /* Internal functions */

    /**
     * Split of current URL and determine if a path has been defined for it.
     * If so arrive at that path
     *
     * @private
     */
    _checkURL: function()
    {
        // Break apart URL which consists of path ? search # hash
        // into component parts of a path and individual parameters
        // both of which are first taken from the path/search and
        // then may be overridden by the hash.  This let's subsequent
        // routes for an SPA be defined through a hash even through
        // the initial one came in as a path ? search.
        var parsed = {parameters: {}, path: '/'};
        var hash = this.location.hash.replace(/^#/, '');
        var search = this.location.search.replace(/^\?/, '');
        if (this.location.pathname)
            parsed = this._parseURL(this.location.pathname + '?' + search);
        if (hash) {
            if (hash.match(/##(.*)/)) {
                search = RegExp.$1;
                hash = hash.replace(/##.*/, '');
            }
            parsed = this._parseURL(decodeURIComponent(hash) + '?' + search, parsed);
        }

        // Grab the route from paths extracted from routeIn and signal arrival
        var route = this.paths[parsed.path] || this.paths['/*'];
        if (route && route != this.currentRoute)
            this.arrive(route, parsed);
    },

    /**
     * Parse a path?search URL into a structure, overriding previous values in
     * that structure in the structure is pased in
     *
     * @param str
     * @param parsed (optional)
     * @returns {*|{path: String, parmeters: {}}}
     * @private
     */
    _parseURL: function(str, parsed)
    {
        parsed = parsed || {parameters: {}};
        var parts = str.split('?');
        parsed.path = parts[0].substr(0, 1) == "/" ? parts[0] : '/' + parts[0];
        if (parts.length > 1) {
            var pairs = parts[1].split('&');
            for (var ix = 0; ix < pairs.length; ++ix) {
                var keyValue = pairs[ix].split('=');
                parsed.parameters[keyValue[0]] = decodeURIComponent(keyValue.length > 1 ? keyValue[1] : '');
            }
        }
        return parsed;
    },

    /**
     * Encode a URL into a search string with key=value pairs separated by & signs and starting with a ?
     *
     * @param route
     * @returns {*}
     * @private
     */
    _encodeURL: function (route, url, isHash)
    {
        url = url.replace(/^\//, '');
        var separator = isHash ? '##' : '?';
        for (var key in route.__parameters) {
            if (!(route.__parameters[key].encode === false)) {
                url += separator + key + '=' + encodeURIComponent(this.controller.bindGet(route.__parameters[key].bind));
                separator = '&';
            }
        }
        return url;
    },

    /**
     * Parse a route definition leaf calling _parseRoute recursively
     *
     * @param route - A route leaf to be populated from ...
     * @param routeIn - A route leaf definition
     * @param inherited - augmented by inherited properties
     * @param currPath - and previous parts of a path
     * @param prop
     * @param parentRoute
     * @private
     */
    _parseRoute: function (route, routeIn, inherited, currPath, prop, parentRoute)
    {
        // Merge based on the path specified in leaf or the property as a path segment
        var pathSegment = typeof(routeIn.path) != 'undefined' ? routeIn.path : prop;
        route.__prefix = this.options.defaultPrefix ? this.options.defaultPrefix : "";
        if (pathSegment.match(/^([-#\/]*)/))
            route.__prefix +=  RegExp.$1;
        while (pathSegment.match(/^[-#\/]/))
            pathSegment = pathSegment.replace(/^[-#\/]/, '');

        if (!route.__prefix)
            route.__prefix = '#';
        if (this.options.usePushState == false)
            route.__prefix = route.__prefix.replace(/-/, '');
        currPath = pathSegment ? currPath + '/' + pathSegment : currPath;
        this.paths[(currPath ? currPath : '/')] = route;
        route.__path = currPath.substr(0,1) == '/' ? currPath : '/' + currPath;

        // Create route that has merged properties
        route.__enter = [];
        route.__exit = [];
        route.__parameters = {};
        route.__route = prop;
        route.__nested = routeIn.nested;

        // Manage the id which is a concatenation of properties in the heirarchy
        route.__id = parentRoute ? (parentRoute.__id ? parentRoute.__id + "." + prop : prop) : "";
        route.getId = function () {return this.__id};
        this.routesById[route.__id] = route;

        // Pull in all of the array parameters from interited (which is a route type structure)
        for (var prop in {__enter: 1, __exit: 1, __parameters: 1})
            if (inherited[prop])
                for (var ix = 0; ix < inherited[prop].length; ++ix)
                    route[prop].push(inherited[prop][ix])
        if (inherited.__parameters)
            for (var param in inherited.__parameters)
                route.__parameters[param] = inherited.__parameters[param]

        // Then for the arrays layer on the one in the current leaf
        var self = this;
        if (routeIn.enter)
            route.__enter.push(function (route) {
                var callArgs = [route];
                for (var ix = 1; ix < arguments.length; ix++)
                    callArgs.push(arguments[ix]);
                routeIn.enter.apply(self.controller, callArgs)
            });
        if (routeIn.exit)
            route.__exit.push(function (route){routeIn.exit.call(self.controller, route)});
        if (routeIn.parameters)
            for (var param in routeIn.parameters)
                route.__parameters[param] = routeIn.parameters[param];

        // Now merge in the user defined properties
        function processProp (source) {
            for (var prop in source)
                if (!prop.match(/^enter$|^exit$|^parameters$|^routes$|^path$|^nested$/) && !prop.match(/^__/))
                    route[prop] = source[prop];
        }
        processProp(inherited);
        processProp(routeIn);

        // Add sub-routes

        if (routeIn.routes)
            for (var prop in routeIn.routes) {
                var self = this;
                (function () {
                    var closureProp = prop;
                    route[prop] = function () {
                        var callArgs=[route[closureProp]];
                        for (var ix = 0; ix < arguments.length; ix++)
                            callArgs.push(arguments[ix]);
                        self._goTo.apply(self, callArgs);
                    }
                })();
                this._parseRoute(route[prop], routeIn.routes[prop], route, currPath, prop, route);
            }
    }
}

if (typeof(window) == 'undefined')
    module.exports = AmorphicRouter;
