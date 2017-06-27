/*
 Copyright 2011-2013 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* Release history
 *
 *  2-5-2012 - 0.4: First release
 *  5-26-2013 - 0.5: Bug Fixes and Features
 *
 */
function Bindster(model, view, controller, namespace, defer)
{
    document.body.style.visibility = "visible";
    // Create an anchor for events
    if (typeof(window['bindster_instance_count']) == 'undefined') {
        window['bindster_instance_count'] = 0;
        window['bindster_instances'] = [];
    }
    window['bindster_instances'][window['bindster_instance_count']] = this;
    this.instance = "window['bindster_instances'][" + window['bindster_instance_count'] + "]"
    window['bindster_instance_count']++;

    this.controller = controller;
    if (model)
        this.setModel(model);
    else
        this.data = controller;
    if (controller)
        this.setController(controller)
    this.data.none = null;
    this.next_id = 1;
    this.iterate_id = 1;
    this.wrappers = {};
    this.mappers = {};
    this.wraps = {};
    this.cuts = {};
    this.rules = {};
    this.attr = [];
    this.functions = [];
    this.messages = {};
    this.hasErrors = false;
    this.clearErrors = false;
    this.bindster_error_prefix = "_field_error_";
    this.bindster_temp_prefix = "_field_temp_";
    this.tagDelimiter = " %% ";
    this.node_id = 1;
    this.cuts_id = 1;
    this.set_focus = true;
    this.alertCount = 0;
    this.radioButtonAlert = 0;
    this.attrToProp = {'class': "className", 'maxlength': "maxLength", 'for': "htmlFor"};
    this.urlSuffix = null;
    if (controller && typeof(controller.preRenderInitialize) == 'function')
        controller.preRenderInitialize();
    if (!defer)
        this.start(view, namespace);
    if (controller && typeof(controller.initialize) == 'function') {
        controller.initialize();
        controller.refresh()
    }
}
Bindster.prototype.setModel = function(model)
{
    this.data = model;
    this.data.controller = this.controller;
    this.data.c = this.controller;
    if (this.controller) {
        this.controller.m = this.data;
        this.controller.model = this.data;
    }
    if (this.data && this.data.__stats) {
        this.data.__stats.renders = 0;
        this.data.__stats.total_render_time = 0;
        this.data.__stats.last_render_time = 0;
    }
}
Bindster.prototype.setController = function(controller)
{
    this.controller = controller;
    controller.model = this.data;
    controller.m = this.data;
    this.data.c = controller;
    this.data.controller = controller;
    controller.bindster = this;
    controller.bindsterClearErrors = function(data) {
        this.bindster.clearErrors = true;
        this.bindster.render(data);
        this.bindster.clearErrors = true;
    }
    controller.bindsterIsError = function (propRef) {
        return this.bindster.isError(propRef)
    }
    controller.bindsterHasErrors = function(data) {
        return this.bindster.hasErrors;
    }
    controller.bindsterIsPending = function (propRef) {
        return this.bindster.isPending(propRef)
    }
    controller.bindsterValidate = function(data) {
        // A re-render can end up calling validate again
        if (!this.bindster.validate) {
            this.bindster.validate = true;
            var node = typeof(data) == 'string' ? document.getElementById(data) : data;
            node = node ? node.firstChild : node;
            this.bindster.render(node);
        }
        return !this.hasErrors();
    }
    controller.bindsterRender = function(data){
        var node = typeof(data) == 'string' ? document.getElementById(data) : data;
        node = node ? node.firstChild : node;
        this.bindster.render(node);
    }
    controller.bindsterSetError = function (objRef, propRef, error) {
        if (!error) {
            error = propRef;
            propRef = objRef;
            objRef = this.data;
        }
        this.bindster.setError(objRef, propRef, error);
    }
    controller.bindsterGetErrorMessage = function(message) {
        return this.bindster.getBindErrorData(null, message);
    }
    controller.bindsterClearError = function (objRef, propRef) {
        this.bindster.clearError(objRef, propRef);
    }
    controller.bindsterRefresh = function(defer) {
        this.bindster.scheduleRender(defer);
    }
    controller.bindsterAlert =  function(msg) {
        var focus = document.activeElement;
        alert(msg);
        focus.focus();
    }
    controller.bindsterAttr = function(selector, attr, value) {
        this.bindster.setAttr(selector, attr, value);
    }
    controller.bindsterRule = function(rule, value) {
        this.bindster.rules[rule] = value;
    }
    controller.bindsterGetRules = function() {
        return this.bindster.rules[rule];
    }
    controller.bindsterSet = function(tags, value) {
        this.value = value;
        this.bindster.eval(this.bindster.getBindAction(tags, "bindster.controller.value"), null, "controller.set");
    }
    controller.bindsterBindSet = function(bind, value)
    {
        this.value = value;
        var tags = this.getTags(bind);
        this.bindster.eval(this.bindster.getBindAction(tags, "bindster.controller.value"), null, "controller.set");
    }
    controller.bindsterBindGet = function(bind)
    {
        var tags = this.getTags(bind);
        var bind_data = this.bindster.eval(this.bindster.resolveValue(tags.bind), null, "bind");
        if (typeof(bind_data) == 'undefined')
            bind_data = null;
        if (tags.format)
            bind_data = this.bindster.evalWithValue(tags.format, bind_data, 'format');
        return bind_data;
    }
    controller.bindsterGetTags = function(bindRef)
    {
        var pattrs = this.bindster.getPropAttrs(null, bindRef);
        var attrs = {bind: bindRef};

        for (var attr in pattrs)
        {
            if (attr.match(/validate|format|parse/))
                attrs[attr] = this.bindster.convertValue(pattrs[attr]);

            if (attr.match(/rule/)) {
                var name = pattrs["rule"];
                this.bindster.processRules(null, name, attrs);
            }
        }

        return attrs;
    }
    controller.bindsterSetIncludeURLSuffix = function (suffix) {
        this.bindster.urlSuffix = suffix
    }
    controller.bindsterArrive = function(route) {
        this.bindster.DOMTestResolve("arrival");
        if (typeof(bindsterTestFrameworkRoute) == "function")
            bindsterTestFrameworkRoute(route);

    }

    // Legacy names
    controller.clearErrors = controller.bindsterClearErrors;
    controller.isError = controller.bindsterIsError;
    controller.hasErrors = controller.bindsterHasErrors;
    controller.isPending = controller.bindsterIsPending;
    controller.validate = controller.bindsterValidate;
    controller.render = controller.bindsterRender;
    controller.setError = controller.bindsterSetError;
    controller.getErrorMessage = controller.bindsterGetErrorMessage;
    controller.clearError = controller.bindsterClearError;
    controller.refresh = controller.bindsterRefresh;
    controller.alert = controller.bindsterAlert;
    controller.attr = controller.bindsterAttr;
    controller.rule = controller.bindsterRule;
    controller.getRules = controller.bindsterGetRules;
    controller.set = controller.bindsterSet;
    controller.bindSet = controller.bindsterBindSet;
    controller.bindGet = controller.bindsterBindGet;
    controller.getTags = controller.bindsterGetTags;
    controller.setIncludeURLSuffix = controller.bindsterSetIncludeURLSuffix;
    controller.arrive = controller.bindsterArrive;


}
Bindster.prototype.alert = function(msg)
{
    alert(msg)
}
Bindster.prototype.start = function(node, prefix)
{
    this.renderNode = node;
    if (typeof(this.renderNode) == 'string') {
        this.renderNode = document.getElementById(node);
        if (!this.renderNode)
            this.alert('cannot find view: ' + node);
    }
    this.namespace_prefix = prefix ? prefix : 'b'
    this.add_events_mode = true;
    this.render()
    this.add_events_mode = false;
    if (this.bookmarks)
    {
        this.current_location = document.location.href;
        //if (document.location.hash)  Not clear why this check was here
        this.checkLocation(true);
        this.bookmark_interval = setInterval(this.instance + ".checkLocation()",100);
        for (var ix = 0; ix < this.bookmarks.length; ++ix)
            document.body.insertBefore(this.bookmarks[ix].node, document.body.firstChild);
    }
}
Bindster.prototype.stop = function(node, prefix) {
    if (this.bookmark_interval)
        clearInterval(this.bookmark_interval);
    if (this.timeout_token)
        clearTimeout(this.timeout_token)
}
Bindster.prototype.render = function (node, context, parent_fingerprint, wrapped_entity, mapAttrs, cloned, iterating_entity, hasErrors)
{
    var topLevel = typeof(context) == 'undefined' ? true : false;
    if (topLevel) {
        this.originalActionSequenceTracker = {};
        var topLevelNode = node;
        this.errorCount = 0;
        this.hasErrors = hasErrors ? true : false;
        this.last_focus_priority = 1;
        if (this.data && this.data.__stats) {
            this.start_render = new Date();
        }
        if (this.controller && typeof(this.controller.onprerender) == "function")
            this.controller.onprerender.call(this.controller);
        if (typeof(bindsterTestFrameworkPreRender) == "function")
            bindsterTestFrameworkPreRender();

    }
    node = node ? node : (this.renderNode ? this.renderNode :  document.body.firstChild);

    context = context ? context : "";
    parent_fingerprint = parent_fingerprint ? parent_fingerprint : "";
    tag_string = "";
    // Go through all nodes in a recursive descent
    while(node)
    {
        var do_render = true;
        var do_kill = false;
        var finger_print = parent_fingerprint;

        if (node.nodeType == 8 && node.data.match(/#include.*virtual="(.*)"/))  //<!--#include virtual="bindster_shared.jsp" -->
            this.includeComment(RegExp.$1, node);

        // ELEMENT_NODE that is not used by another bindster instance (class __bindster_view)
        if (node.nodeType == 1 && (node == this.renderNode || (typeof(node.className) != 'string') || !node.className.match(/__bindster_view__/))) // Element
        {
            // Create our property
            this.initNode(node);

            // Record finger_print for our poor man's selector detector
            finger_print += "/";
            if (node.id)
                finger_print += ('#' + node.id + ';')
            var classes = node.className.split ? node.className.split(" ") : []; //SVG className is not a string
            for (var ix = 0; ix < classes.length; ++ix)
                if (classes[ix])
                    finger_print += ('.' + classes[ix] + ';');
            finger_print += (' ' + node.tagName + ';');

            var tags = this.getTags(node, mapAttrs, finger_print);

            // Special case code to handle browser's poor handling of mixing namespaces specifically when our elements
            // are in a table heirarchy.  Webkit pushes them to previousSibling of the table element and Opera just refuses to nest at all.
            // So we push the tags from childless iterates down into the tr and kill the iterate
            if (node.tagName.match(/:iterate/i) && !this.getFirstChild(node) && node.nextSibling &&
                (node.nextSibling.tagName == "TABLE" || node.nextSibling.tagName == "TR")) {
                var nextSibling = node.nextSibling;
                node.parentNode.removeChild(node);
                node = nextSibling;
                var rowNode = nextSibling.tagName == "TR" ? nextSibling :
                    nextSibling.getElementsByTagName("TBODY")[0].getElementsByTagName("TR")[0];
                this.initNode(rowNode);
                this.initNode(node);
                rowNode.bindster.pushed_tags = tags;
            }
            // Process insertion of wraps
            //if (!wrapped_entity)
            var wrap = node.getAttribute("bindster_wrap") ? null : this.getWrap(finger_print);
            if (wrap)
            {
                var nextSibling = node.nextSibling;
                var parentNode = node.parentNode;
                var wrapNode = wrap.outer.cloneNode(true);
                var insertNode = wrapNode.getElementsByTagName('INSERT')[0] ||
                    wrapNode.getElementsByTagName(this.namespace_prefix.toUpperCase() +':INSERT')[0] ||
                    wrapNode.getElementsByTagName('INS')[0];

                var className = node.className;
                //node.className = className.replace(/(\S+)/g, "$1_inner")
                node.setAttribute("bindster_wrap",  'wrapped');
                insertNode.parentNode.insertBefore(node, insertNode);	// Shove in current node into wrap
                insertNode.parentNode.removeChild(insertNode);			// Kill the insert marker
                node = parentNode.insertBefore(wrapNode, nextSibling);	// Stick the wrap in
                this.initNode(node);
                node.setAttribute("bindster_wrap", 'wrapper');
                //node.className = className.replace(/(\S+)/g, "$1_outer");
                if (className.length > 0)
                    node.className = node.className + (node.className.length > 0 ? ' ' : '') + className + "_outer";
                this.restoreElement(node);
            }

            var tags = this.getTags(node, mapAttrs, finger_print); // Fetch again in case hosed by Webkit oddity code above
            this.evalTags(tags, node);

            // Process Mapper
            if (tags.map && !node.getAttribute("bindster_map")) {
                //node.appendChild(this.mappers[tags.map.name].cloneNode(true));
                // Cut out existing content in case it is to be inserted in template
                var child = node.firstChild;
                var originalChild = child;
                if (child) {
                    var cut = document.createElement("DIV");
                    while (child) {
                        var nextChild = child.nextSibling;
                        cut.appendChild(child.parentNode.removeChild(child));
                        child = nextChild;
                    }
                }
                this.insertElements(node, this.mappers[tags.map.name].cloneNode(true).firstChild);
                if (originalChild) {
                    var insertNode = node.getElementsByTagName('INSERT')[0] ||
                        node.getElementsByTagName(this.namespace_prefix.toUpperCase() +':INSERT')[0] ||
                        node.getElementsByTagName('INS')[0];
                    if (insertNode) {
                        this.insertElementsBefore(insertNode.parentNode, cut.firstChild, insertNode);	// Insert old content
                        insertNode.parentNode.removeChild(insertNode);	// Kill the insert marker
                    } else
                        this.throwError(node, tags.map.name, "Must close explicitly with </" + node.tagName.toLowerCase() + ">");
                }
                node.setAttribute("bindster_map", "mapped");
            }

            // Process includes
            if (tags.includeurl) {
                // Nothing loaded or the wrong url is loaded
                var insertNode = tags.includeinsert ? node.getElementsByTagName(tags.includeinsert.toUpperCase())[0] : node;

                var url = tags.includeurl.match(/^\{(.*)\}$/) ? this.eval(RegExp.$1, null, "include", node) : tags.includeurl;

                if (!this.getFirstChild(insertNode) ||
                    (this.getFirstChild(insertNode).tagName && this.getFirstChild(insertNode).tagName.match(/insert/i)) ||
                    (node.getAttribute("bindster_includeurl") && node.getAttribute("bindster_includeurl") != url))
                {
                    var self = this;
                    this.includeNode(url, insertNode, tags.includeasync ? true : false,
                        function () {
                            if (tags.includewhenloaded)
                                self.eval(tags.includewhenloaded, null, "then", node);
                            if (tags.includeifloaded)
                                self.eval(tags.includeifloaded, null, "then", node);
                        });
                    node.setAttribute("bindster_includeurl", url);
                } else {
                    if (tags.includeifloaded)
                        this.eval(tags.includeifloaded, null, "then", node);
                }
            }
            // Process recording of mappers
            if (tags.mappertag && !this.mappers[tags.mappertag]) {
                this.mappers[tags.mappertag] = node.cloneNode(true);
                tags = {};				// Ignore processing
                do_render = false;		// Don't traverse down (will be traversed after insertion)
                do_kill = true;			// Remove it
            }

            // Process recording of wrappers
            if (tags.wrappername && !this.wrappers[tags.wrappername]) {
                this.hideElement(node);
                this.wrappers[tags.wrappername] = node;
                tags = {};				// Ignore processing
                do_render = false;		// Don't traverse down (will be traversed after insertion)
            }

            // Process wrap directives to force wrapper to be the node to be hidden or shown
            var hide_show_node = node;
            if (node.getAttribute("bindster_wrap") == 'wrapped')
                while (hide_show_node && hide_show_node.getAttribute("bindster_wrap") != 'wrapper')
                    hide_show_node = hide_show_node.parentNode;

            // Setup an interface for controller to talk to and create the controller
            if (tags.controller && !node.bindster.controller) {
                var controller_interface = new BindsterControllerInterface(this, node, tags.controllerdata);
                node.bindster.controller = eval("new " + tags.controller + "(controller_interface)");
                this.restoreElement(node);
            }

            if (tags.bind)
                var bind_data = this.get(tags.bind);

            var hidden = false;
            if (tags.test) {
                if (!tags.hide || tags.hide == 'remove')
                {
                    if (this.eval(tags.test, null, null, node))
                        this.insertElement(hide_show_node);
                    else {
                        this.removeElement(hide_show_node);
                    }
                } else if (tags.onshow && tags.onhide)
                {
                    if (this.eval(tags.test, null, null, node))
                        this.eval(tags.onshow, null, null, node)
                    else {
                        this.eval(tags.onhide, null, null, node)
                        hidden = true;
                    }
                } else {
                    if (this.eval(tags.test, null, null, node))
                        this.restoreElement(hide_show_node);
                    else {
                        this.hideElement(hide_show_node, tags.hide);
                        hidden = (tags.hide == "display");
                    }
                }
            }
            if (tags.onarrival)
            {
                if (!this.bookmarks) {
                    this.bookmarks = [];
                }

                if (node.tagName == 'A')
                    if (!node.getAttribute("bookmarked")) {
                        this.bookmarks.push(
                            {node: node,
                                hash: tags.match ? tags.match :
                                "^" + ((node.name && node.name.length > 0) ? node.name : (node.id ? node.id : "__domstr_start__")) + "$",
                                action: tags.onarrival}
                        );
                        node.setAttribute("bookmarked", true);
                    }
            }
            var skip = false;
            if (hidden) // When hidden we don't process tags or descend
            {
                // Make sure we remember the fact that this node's parents were cloned
                if (cloned)
                    node.bindster.cloned =  'yes';
            } else {

                // Iterate
                var bypass = false;
                var iterateon = tags.iterateon;
                if (iterateon && !iterating_entity && !skip)
                {
                    do_render = false;
                    var fill_data = this.get(this.resolveValue(iterateon));
                    if (!(fill_data instanceof Array) && tags.fill) {
                        fill_data = this.getValueIterator(node, tags);
                        iterateon += '__values__';
                        with ({__value__: fill_data}) {eval (this.instance + ".data." + iterateon + "= __value__")};
                    }
                    var nothing_rendered = true;
                    var previousNode;
                    // Render nodes adding more through cloning if needed
                    if (fill_data)
                    {
                        var iterate_id = tags.iterateid;
                        node.setAttribute("bindster_iterateid", iterate_id)

                        var counter = 0;
                        var loopIndex = 0; // Loop index is a 1 based index // of filtered rows
                        for (var ix = 0; fill_data && ix < fill_data.length; ++ix)
                        {
                            counter++;
                            loopIndex++;
                            // Create new context for setting up index values in events and binds
                            var new_context = (tags.iterateindex || tags.iteratewith) ?
                            context + (
                                (tags.iteratewith ? this.instance + ".set('" + tags.iteratewith + "', \""
                                /*+ this.instance + ".data."*/ + iterateon + "[" + ix + "]\");" :  "")
                                + (tags.iterateindex ? this.instance + ".set('" + tags.iterateindex + "', " + ix + ");" : "")
                                + (tags.iterateloopindex ? this.instance + ".set('" + tags.iterateloopindex + "', " + loopIndex + ");" : "")
                                + (tags.iteratecounter ? this.instance + ".set('" + tags.iteratecounter + "', " + counter + ");" : "")
                            ) : context;
                            this.eval(new_context, null, 'with, index or counter attributes of iterate', node);

                            // Check filter expression
                            if (!tags.iteratefilter || this.eval(tags.iteratefilter, null, 'filter attribute of iterate', node ))
                            {
                                // On subsequent iterations advance to next node and clone if needed.
                                // We clone if there are not subsequent nodes with the same iteration id.
                                if (!nothing_rendered) {
                                    if (!node.nextSibling || !node.nextSibling.getAttribute || !node.nextSibling.getAttribute("bindster_iterateid") ||
                                        (node.nextSibling.getAttribute("bindster_iterateid") != iterate_id)) {
                                        var new_node = node.parentNode.insertBefore(node.cloneNode(true), node.nextSibling);
                                        this.cleanNode(new_node.firstChild);
                                        this.initNode(new_node, true);
                                        this.radioButtonAlert = 2;  // Clone radio buttons causes original to be unchecked
                                        new_node.bindster.cloned = "yes";
                                    }
                                    node = node.nextSibling;
                                    this.initNode(node);
                                }
                                nothing_rendered = false;
                                // Render the node
                                this.restoreElement(node);
                                node.bindster.inwaiting =  'no';
                                this.render(node, new_context, finger_print, this.wrapStatus(node, wrapped_entity),
                                    tags.map ? tags.map.attrs : mapAttrs, cloned ||
                                    node.bindster.cloned == 'yes' || node.bindster.inwaiting == 'yes', true);
                                bypass = true;
                            }
                            else{
                                loopIndex--;
                            }
                        }
                    } else
                    if (typeof(fill_data) == "undefined")
                        this.throwError(node, 'iterate', 'iterate-on value is undefined');
                    // If nothing rendered hide first element
                    if (nothing_rendered) {
                        this.hideElement(node, 'display');
                        node.bindster.inwaiting =  'yes';
                        skip = true;
                    }

                    // Trim extra previously iterated nodes
                    var kill_node = node.nextSibling;
                    while(kill_node && kill_node.getAttribute && kill_node.getAttribute("bindster_iterateid") &&
                    (kill_node.getAttribute("bindster_iterateid") == iterate_id))
                    {
                        var next = kill_node.nextSibling;
                        kill_node.parentNode.removeChild(kill_node);
                        kill_node = next;
                    }
                    if (!nothing_rendered)
                        tags.events = {};
                }
                if (!bypass)
                {
                    // Handle binding of the error fields to the view.  If this a forced clear then clear the error

                    if (tags.binderror  && !skip)
                    {
                        if (this.clearErrors)
                            this.clearBindError(tags.binderror, node);
                        var bind_error = this.getBindErrorReference(tags.binderror);
                        var bind_data = this.eval(bind_error, null, "binderror", node);
                        if (typeof(bind_data) == "object") {
                            bind_data = this.getBindErrorData(node, bind_data, tags.binderrordata);
                            this.errorCount++;
                        }
                        bind_data = bind_data && bind_data != '__pending__' ? bind_data : "";
                        var last_value = node.bindster.bind;
                        if (last_value != bind_data) {
                            node.innerHTML = bind_data;
                            node.bindster.bind = bind_data;
                        }
                        do_render = false;
                    } else

                    // Bind the model to the view (DOM) by comparing the value in the DOM to that

                    if (tags.bind  && !skip)
                    {
                        var bind_error = this.getBindErrorReference(tags.bind);
                        var bind_error_value = this.get(bind_error);
                        var bind_error = bind_error ? (bind_error_value ? true : false) : false;
                        if (bind_error_value != '__pending__') {
                            if (!bind_error) {
                                // Process various tags
                                if (tags.fill)
                                {
                                    var fill_data = this.eval(this.resolveValue(tags.fill, tags.bind, node), null, "fill", node);
                                    var fill_using = this.eval(this.resolveValue(tags.using, tags.bind, node), null, "using", node);
                                    if (!fill_data)
                                        this.throwError(node, 'fill', 'cannot get data to fill' + tags.fill);
                                    else
                                    {
                                        var kv = this.getSelectKeyValues(fill_data, fill_using, tags, node);
                                        var keys = kv.keys;
                                        var values = kv.values;
                                        var materialize = false;
                                        if (node.tagName == 'SELECT')
                                        {
                                            do_render = false;

                                            // Iterate through the data
                                            var child = node.firstChild;
                                            var selected = 0;
                                            var lastValue = null;
                                            for (var ix = 0; ix < keys.length; ++ix)
                                            {
                                                var key = keys[ix];
                                                var value = values[key];
                                                if (value != lastValue) {
                                                    var child = child ? child : node.appendChild(document.createElement('OPTION'));
                                                    if (child.value != key) {
                                                        child.value = key;
                                                        materialize = true;
                                                        node.bindster.forceRefresh = true;
                                                    }
                                                    if (child.text != value) {
                                                        child.text = value;
                                                        materialize = true;
                                                        node.bindster.forceRefresh = true;
                                                    }
                                                    child = child.nextSibling;
                                                    lastValue = value;
                                                }
                                            }
                                            // Kill extra options
                                            if (child && child == node.firstChild)
                                                this.hideElement(node);
                                            else
                                                while(child)
                                                {
                                                    var next_node = child.nextSibling;
                                                    node.removeChild(child)
                                                    child = next_node;
                                                    materialize = true;
                                                }
                                            if (materialize && typeof($) == 'function') {
                                                (function () {
                                                    var select = $(node);
                                                    select = select ? select[0] : null;
                                                    select = select ? $(select) : null;
                                                    if (select && typeof(select.material_select) == 'function')
                                                        setTimeout(function (){select.material_select()}, 0);
                                                    console.log("Calling Material Select");
                                                })()
                                            }
                                        }
                                    }
                                    processed_tags = true;
                                }
                                var bind_data = this.eval(this.resolveValue(tags.bind), null, "bind", node);
                                if (typeof(bind_data) == 'undefined')
                                    bind_data = null;
                                if (tags.format)
                                    bind_data = this.evalWithValue(tags.format, bind_data, 'format', node);
                            } else
                                this.errorCount++;
                        }
                        var last_value = this.clearErrors ? null : node.bindster.bind;
                        bind_data = this.DOMTestBind(finger_print, node, tags, bind_data);

                        if (node.bindster.controller) {
                            if (!bind_error && ((node.bindster.controller.needsRender && node.bindster.controller.needsRender()) || (last_value != bind_data)))
                            {
                                node.bindster.controller.set(bind_data);
                                node.bindster.bind =  bind_data;
                            }
                        }
                        else if (node.tagName == 'INPUT' && (node.type.toLowerCase() == 'text' || node.type.toLowerCase() == 'tel' || node.type.toLowerCase() == 'number' ||
                            node.type.toLowerCase() == 'password'  || node.type.toLowerCase() == 'input' ))
                        {
                            if (tags.onenter)
                                this.addEvent(tags, 'onenter', this.getBindAction(tags,   'target.value') + tags.onenter);

                            if (tags.when)
                                this.addEvent(tags, 'onkeyup',this.getBindAction(tags,   'target.value'), tags.when > 0 ? tags.when : true);

                            this.addEvent(tags, node.type.toLowerCase() == 'number' ? 'oninput' : 'onchange', this.getBindAction(tags,   'target.value'));
                            this.validateValue(tags, node.value, node);
                            this.setFocus(tags, node);
                            if (!bind_error && last_value !== bind_data)
                            {
                                node.value = bind_data;
                                node.bindster.bind =  bind_data;
                                this.sendToController(node.bindster);
                            }
                        }
                        else if (node.tagName == 'TEXTAREA')
                        {
                            this.addEvent(tags, 'onchange', this.getBindAction(tags,   'target.value'));
                            if (tags.when)
                                this.addEvent(tags, 'onkeyup', this.getBindAction(tags,   'target.value'), true);
                            this.validateValue(tags, node.value, node);
                            this.setFocus(tags, node);
                            if (!bind_error && last_value !== bind_data)
                            {
                                node.value = bind_data;
                                node.bindster.bind =  bind_data;
                                this.sendToController(node.bindster);
                            }
                        }
                        else if (node.tagName == 'INPUT' && node.type.toLowerCase() == 'checkbox')
                        {
                            this.addEvent(tags, 'onclick', 'if (target.checked) { ' + this.getBindAction(tags, tags.truevalue) + '}' + 'else { ' + this.getBindAction(tags, tags.falsevalue) + '}');
                            this.validateValue(tags, node.checked);
                            this.setFocus(tags, node);
                            if (!bind_error && last_value !== bind_data)
                            {
                                node.bindster.bind =  bind_data;
                                if (node.checked && bind_data == this.eval(tags.falsevalue, null, "invalid truevalue", node)) {
                                    node.checked = false;
                                    this.sendToController(node.bindster);
                                }
                                if (!node.checked && bind_data == this.eval(tags.truevalue, null, "invalid truevalue", node)) {
                                    node.checked = true;
                                    this.sendToController(node.bindster);
                                }
                            }
                        }
                        else if (node.tagName == 'INPUT' && node.type.toLowerCase() == 'radio')
                        {
                            var current_value = this.eval(tags.truevalue, null, "invalid truevalue", node) + "";
                            var resolve_value = "c.bindster.resolveRadioValue(target, '" + current_value + "')";
                            this.addEvent(tags, 'onclick', 'if (target.checked) { ' + this.getBindAction(tags, resolve_value) + '}');
                            this.validateValue(tags, bind_data);
                            this.setFocus(tags, node);

                            if (!bind_error && (last_value !== bind_data || this.radioButtonAlert))
                            {
                                node.bindster.bind =  bind_data;
                                if (node.checked && (bind_data + "") != current_value) {
                                    node.checked = false;
                                    this.sendToController(node.bindster);
                                }
                                var self = this;
                                if (!node.checked && (bind_data + "") == current_value)
                                    (function () {
                                        var closureNode = node;
                                        setTimeout(function () {
                                            closureNode.checked = true;
                                            self.sendToController(closureNode.bindster);

                                        },0);
                                    })()

                            }
                        }
                        else if (node.tagName == 'SELECT')
                        {
                            node.value;  // This is a fix to keep IE from "losing" the value
                            var resolve_value = "c.bindster.resolveSelectValue(target)";
                            this.addEvent(tags, 'onchange', this.getBindAction(tags, resolve_value));
                            do_render = false;
                            //this.setFocus(tags, node);
                            var selected = false;
                            this.setFocus(tags, node);
                            if (!bind_error && (node.bindster.forceRefresh ? true : last_value !== bind_data)) {
                                child = node.firstChild;
                                var pleaseSelect = tags.pleaseselect ? this.evalJSTag(tags.pleaseselect) : "Select ...";
                                while (child) {
                                    if (child.value == (bind_data + "") ||
                                        bind_data && bind_data.__id__ && child.value == bind_data.__id__) { // convert booleans & objs
                                        child.selected = true
                                        selected = true;
                                        node.bindster.bind = bind_data;
                                    }
                                    child = child.nextSibling;
                                }
                                // Add a please select ... item if no value matches and remove it if something selected
                                if (!selected) {
                                    var child = node.insertBefore(document.createElement('OPTION'), node.firstChild);
                                    child.value = bind_data !== null ? bind_data : ''; // Instead of setting a potential null value
                                    // which becomes the literal "null" when one uses node.value, use the empty string instead
                                    // which is a falsy
                                    child.text = pleaseSelect;
                                    child.selected = true;
                                    node.selectedIndex = 0;
                                } else {
                                    child = node.firstChild;
                                    while (child) {
                                        if (!child.selected && child.text == pleaseSelect)
                                            node.removeChild(child);
                                        child = child.nextSibling;
                                    }
                                }
                                this.sendToController(node.bindster);
                            }
                            this.validateValue(tags, (!node.value && bind_data === null) ? null : node.value, node);  // before validate would not see Please select ...
                        }
                        else {
                            if (!bind_error && (typeof(last_value) =='undefined') || (last_value != bind_data)) {
                                if (typeof(node.value) != 'undefined')
                                    node.value = bind_data
                                else if(typeof(node.textContent) != 'undefined')
                                    node.textContent = bind_data
                                else if(typeof(node.innerText) != 'undefined')
                                    node.innerText = bind_data;
                                node.bindster.bind =  bind_data;
                                this.sendToController(node.bindster);
                            }
                            do_render = false;
                        }
                        node.bindster.forceRefresh = false;
                    }
                    // Widget

                    if (tags.widget  && !skip)
                    {
                        if (typeof(node.widget_initialized) == 'undefined') {
                            tags.widget.obj.call(this, node, 'initialize', tags.widget.parameters);
                            node.widget_initialized = true;
                        }
                        tags.widget.obj.call(this, node, 'render', tags.widget.parameters);
                    }
                    // OnPaint

                    if (tags.onpaint && !skip)
                    {
                        for (var ix = 0; ix < tags.onpaint.length; ++ix) {
                            var onpaint = tags.onpaint[ix];
                            var changed = false;
                            if (onpaint.depends.length > 0)
                                for (var jx = 0; jx < onpaint.depends.length; ++jx)
                                {
                                    var onpaint_data = this.get(onpaint.depends[jx].value);
                                    if (onpaint_data != node.bindster['onpaint_' + onpaint.depends[jx].name]) {
                                        changed = true;
                                        node.bindster['onpaint_'+ onpaint.depends[jx].name] = String(onpaint_data);
                                    }
                                }
                            else
                                changed = true;
                            if (changed)
                                this.eval(onpaint.action, {prop: this.getPropAttrs(node, tags.bind)}, onpaint.tag ? onpaint.tag : 'onpaint', node);

                        }
                    }

                    this.processEvents(node, tags, context, cloned || node.bindster.cloned == 'yes', finger_print);

                    // render children
                    if (do_render && node.firstChild  && !skip) {
                        this.render(node.firstChild, context, finger_print, this.wrapStatus(node, wrapped_entity),
                            tags.map ? tags.map.attrs : mapAttrs, cloned || node.bindster.cloned == 'yes' || node.bindster.tags_updated == 'yes');
                        node.bindster.cloned =  "no";       // Once we process the node we don't consider it cloned
                        node.bindster.tags_updated =  "no"; // Once we process the node we don't consider it processed
                    }
                }
            }
        }

        // Get next sibling to render
        var nextSibling = node.nextSibling;
        if (do_kill)
            node.parentNode.removeChild(node);
        node = nextSibling;

        // For subordinate iterates we don't continue to render
        if (iterating_entity)
            break;
    }
    if (topLevel) {
        this.radioButtonAlert = Math.max(this.radioButtonAlert - 1, 0);
        this.hasErrors = this.errorCount > 0;
        this.clearErrors = false;
        this.set_focus = false;
        if (this.controller && typeof(this.controller.onrender) == "function")
            this.controller.onrender.call(this.controller);
        if (typeof(bindsterTestFrameworkRender) == "function")
            bindsterTestFrameworkRender();
        if (this.data && this.data.__stats) {
            this.data.__stats.last_render_time = Math.floor((new Date()).getTime() - this.start_render.getTime());
            this.data.__stats.total_render_time += this.data.__stats.last_render_time;
            this.data.__stats.renders ++;
        }
        if(!hasErrors && this.hasErrors || this.radioButtonAlert)
            this.render(topLevelNode, null, null, null, null, null, null, true);
        this.validate = false;
        this.DOMTestResolve("render");
    }

}
Bindster.prototype.sendToController = function (node_bindster) {
    if (typeof(this.controller.onrendervalue) == 'function')
        this.controller.onrendervalue(node_bindster.tags.bind, node_bindster.bind);
    if (typeof(bindsterTestFrameworkGet) == "function")
        bindsterTestFrameworkGet(node_bindster.tags.bind, node_bindster.bind);
}
Bindster.prototype.isPending = function(ref) {
    var ref = this.getBindErrorReference(ref);
    var data = this.eval(ref, null, "isError");
    return typeof(data) != 'undefined' && data == '__pending__';
}
Bindster.prototype.resolveSelectValue = function (target)
{
    if (target.bindster && target.bindster && target.bindster.tags.proptype) {
        if (target.bindster.tags.proptype.__objectTemplate__ &&
            target.bindster.tags.proptype.__objectTemplate__.getObject)

            return  target.bindster.tags.proptype.__objectTemplate__.getObject(target.value, target.bindster.tags.proptype);

        else if (target.bindster.tags.proptype && target.bindster.tags.proptype == Boolean)

            return target.value.match(/1|true|yes|on/) ? true : false;
    }
    return target.value;
}
Bindster.prototype.resolveRadioValue = function (target, value)
{
    if (target.bindster && target.bindster && target.bindster.tags.proptype) {
        if (target.bindster.tags.proptype.__objectTemplate__ &&
            target.bindster.tags.proptype.__objectTemplate__.getObject)

            return  target.bindster.tags.proptype.__objectTemplate__.getObject(value, target.bindster.tags.proptype);

        else if (target.bindster.tags.proptype && target.bindster.tags.proptype == Boolean)

            return value.match(/1|true|yes|on/) ? true : false;
    }
    return value;
}
Bindster.prototype.resolveValue = function (bind_ref, bind, node) {
    if (bind && this.getBindObjectReference(bind) && typeof(bind_ref) == 'function')
        return bind_ref.call(this.eval(this.getBindObjectReference(bind), null, "binderror", node));
    else
        return bind_ref
}
Bindster.prototype.setAttr = function (selector, attr, value)
{
    var str = "";
    // Each property becomes an attribute but must have arrays / functions converted
    if (typeof(attr) == "object" && !(attr instanceof Array)) {
        for (var key in attr)
            attr[key] = this.convertValue(attr[key]);
        value = attr;
    } else
        value = this.convertValue(value);
    this.attr.push({
        name: attr,
        value: value,
        regexp: this.createSelectorRegExp(selector)
    });
}
Bindster.prototype.getValueIterator = function (node, tags) {
    var fill_data = this.eval(this.resolveValue(tags.fill, tags.iterateon, node), null, "fill", node);
    var fill_using = this.eval(this.resolveValue(tags.using, tags.iterateon, node), null, "using", node);
    if (!fill_data)
        this.throwError(node, 'fill', 'cannot get data to fill' + tags.fill);
    var kv = this.getSelectKeyValues(fill_data, fill_using, tags, node);
    var keys = kv.keys;
    var values = kv.values;
    var iterator = [];
    for (var ix = 0; ix < keys.length; ++ ix)
        iterator.push({value: keys[ix], description: values[keys[ix]]});
    return iterator;
}
Bindster.prototype.getSelectKeyValues = function (fill_data, fill_using, tags, node) {

    // If an associative array (hash) create fill and using
    var do_sort = false;

    if (!(fill_data instanceof Array)) {
        var fill_using = fill_data
        fill_data = [];
        for (key in fill_using)
            fill_data.push(key);
        do_sort = true;
    }

    // Run through filter functions
    var keys = [];
    var values = {};

    for (var ix = 0; ix < fill_data.length; ++ix) {
        var key = tags.fillkey ?
            this.eval(tags.fillkey, {index: ix, value: fill_data[ix]}, "fillkey", node)
            : fill_data[ix];
        if (key != null) {
            var value = fill_using ? fill_using[key] : fill_data[ix];
            value = tags.fillvalue ?
                this.eval(tags.fillvalue, {key: key, value: value, index: ix}, "fillvalue", node)
                : value;
            if (value != null) {
                keys.push(key);
                values[key] = value;
            }
        }
    }

    if (do_sort && tags.sort !== 'none') {
        var sortorder = tags.sortorder === 'desc' ? -1 : 1;
        if (tags.sort === 'key') { //sort by key, not value
            keys.sort(function(a, b) {return (a > b) ? sortorder : -sortorder});
        }
        else if (tags.sort === 'keynumber') { //sort by key, assuming keys are numbers and not strings
            keys.sort(function(a, b) {return Number(a) > Number(b) ? sortorder : -sortorder});
        }
        else { //default - sort by value
            keys.sort(function(a, b) {return values[a] > values[b] ? sortorder : -sortorder});
        }
    }

    if (tags.nullselect) {
        keys.splice(0, 0, "null");
        values["null"] = tags.nullselect;
    }

    return {keys: keys, values: values};
}
Bindster.prototype.convertValue = function(value, obj, args)
{
    if (value instanceof Array) {
        var str = "";
        for (var ix = 0; ix < value.length; ++ix)
            str += this.convertValue(value[ix], obj, args);
        return str;
    } else if (typeof(value) == "function") {
        this.functions.push(value);
        var obj = obj || (this.controller ? this.instance + ".controller" : "");
        return (this.instance + ".functions[" + (this.functions.length - 1) + "].call(" + obj + (args ? ',' + args.join(',') : "") + ");");
    } else
        return value;
}
Bindster.prototype.setFocus = function(tags, node)
{
    if (!this.set_focus)
        return;
    var tags_focus = tags.focus;
    if (tags_focus)
        this.last_focus_priority = tags_focus;
    if (tags.bind) {
        var bind_error = this.get(this.getBindErrorReference(tags.bind));
        if (bind_error && bind_error != '__pending__')
            tags_focus = tags_focus ? tags_focus + 0.1 : this.last_focus_priority + 0.1;
    }
    if (tags_focus) {
        if (!document.activeElement)
            return;  // maybe weird browsers don't have this?
        if (!node.getAttribute("bindster_focus") || node.getAttribute("bindster_focus") != tags_focus)
            node.setAttribute("bindster_focus", tags_focus)
        var currentPriority = 	document.activeElement.getAttribute("bindster_focus");
        if (document.activeElement.tagName == "BODY" || tags_focus > currentPriority)
            node.focus();
    }
}
Bindster.prototype.isError = function(ref) {
    var ref = this.getBindErrorReference(ref);
    var data = this.eval(ref, null, "isError");
    return typeof(data) != 'undefined' && data != '__pending__';
}
// Execute the whole marshalling/filter/validation sequence to force errorsf
Bindster.prototype.validateValue = function(tags, value, node) {
    if (this.validate && tags.validate) {
        this.validate_value = value;
        this.eval(this.getBindAction(tags, "bindster.validate_value"), null, "validate", node);
    }
}
Bindster.prototype.setError = function(objRef, objProp, message)
{
    if (message instanceof Error) {
        this.displayError(null, message);
        return;
    }
    objRef[this.bindster_error_prefix + objProp] =  message;
    this.raiseError(objProp, message);
}
Bindster.prototype.clearError = function(objRef, objProp)
{
    if (typeof(objRef[this.bindster_error_prefix + objProp]) != 'undefined')
        delete objRef[this.bindster_error_prefix + objProp];
}
Bindster.prototype.getBindErrorData = function(node, bind_data, xtra_bind_data)
{
    var temp_bind_data = {};
    for (var prop in bind_data) {temp_bind_data[prop] = bind_data[prop]}
    if (xtra_bind_data) {
        xtra_bind_data = typeof(xtra_bind_data) == "object" ? xtra_bind_data : this.eval("bindster_temp=" + xtra_bind_data, null, "binderrordata", node);
        for (var prop in xtra_bind_data) {temp_bind_data[prop] = xtra_bind_data[prop]}
    }
    if (temp_bind_data.message || temp_bind_data.code) {
        if (this.messages[bind_data.code || bind_data.message]) {
            expression = (this.messages[bind_data.code || bind_data.message] || (bind_data.code || bind_data.message))
                .replace(/{(.*?)}/g, function (all, js) {
                    js = "(" + js + ")";
                    return '" + ' + js + ' + "';
                });
            bind_data = this.eval('"' + expression + '"', temp_bind_data, "binderror", node);
        } else
            bind_data = bind_data.text || bind_data.message;
        //throw this.throwError(node, 'binderror', "Missing message declaration for " + bind_data.message);
    } else
        throw this.throwError(node, 'binderror', bind_data);
    return bind_data;
}
Bindster.prototype.getBindErrorReference = function(bind)
{
    if (bind.match(/[^0-9a-zA-Z_$.\[\]\(\)]/))
        return null;

    if (bind.match(/(.*?)\.([^.]+)$/))
        return RegExp.$1 + "." + this.bindster_error_prefix + RegExp.$2;
    else
        return "this.data." + this.bindster_error_prefix + bind;
}
Bindster.prototype.getBindObjectReference = function(bind)
{
    if (bind.match(/[^0-9a-zA-Z_$.\[\]\(\)]/))
        return null;

    if (bind.match(/(.*?)\.([^.]+)$/))
        return RegExp.$1;
    else
        return "this.data";
}

Bindster.prototype.getBindErrorReferenceParts = function(bind)
{
    if (bind.match(/[^0-9a-zA-Z_$.\[\]\(\)]/))
        return {obj: null, prop: null};

    if (bind.match(/(.*?)\.([^.]+)$/))
        return {obj: RegExp.$1, prop: this.bindster_error_prefix + RegExp.$2};
    else
        return {obj: "this.data", prop: this.bindster_error_prefix + bind};
}
Bindster.prototype.getBindTempReference = function(bind)
{
    if (bind.match(/(.*?)\.([^.]+)$/))
        return RegExp.$1 + "." + this.bindster_error_prefix + RegExp.$2;
    else
    if (bind.match(/\"\'/))
        return null;
    else
        return "this.data." + this.bindster_error_prefix + bind;
}
// Clear the extra properties that represent the error message and temporary value
Bindster.prototype.clearBindError = function(bind, node)
{
    var reference = this.getBindErrorReference(bind);
    if (reference)
        this.eval("delete " + reference, null, "clearing error", node);
    var reference = this.getBindTempReference(bind);
    if (reference)
        this.eval("delete " + reference, null, "clearing error", node);
}
Bindster.prototype.getBindAction = function(tags, value)
{
    var bind_error = this.getBindErrorReference(tags.bind);
    var this_value = this.controller ? "self.controller.value" : "self.value";
    var this_previous_value = this.controller ? "this.controller.previous_value" : "this.previous_value";
    var controller_trigger = ((self.controller && typeof(self.controller.onchange) == "function") ?
    "if(!isValidating && node){self.controller.onchange(node.bindster.tags.bind," + this_value +")};" : "")
    var model_trigger = (tags.trigger ? (tags.trigger + "; ") : "");
    var trigger = model_trigger + controller_trigger;
    var asyncvalidate = tags.asyncvalidate ? this.convertValue(tags.asyncvalidate, this.getBindObjectReference(tags.bind), [this_value]) : null;

    // Bind to a temporary variable, perform validation and handle exceptions
    // where updated value is stored temporarily and error is recorded ready for error bind
    var x =    "try { " +
        "var self=this;" +
        "var isValidating=this.validate;" +
        "var bind_error_obj = " + this.getBindErrorReferenceParts(tags.bind).obj + ";" +
        "var bind_error_prop = '" + this.getBindErrorReferenceParts(tags.bind).prop + "';" +
        "var bindTags = '" + tags.bind + "';" +
        "if(target && target.bindster){target.bindster.bind = undefined}" +
        this_value + " = " + value +  ";" +
        ((typeof(bindsterTestFrameworkSet) == "function") ?
        "if(!isValidating && node){bindsterTestFrameworkSet(node.bindster.tags.bind," + this_value +")};" : "") +
        (tags.parse ? (this_value + " = " + tags.parse + "; ") : "") +
        (tags.validate ? (tags.validate + "; ") : "") +
        this_previous_value + " = " + tags.bind  + ";" +
        "if (" + bind_error +") {delete " + bind_error + "} " +
        "var return_value = " + this_value + ";" +  // Need value within this closure
        ((typeof(Q) != 'undefined' && asyncvalidate) ?
        bind_error + " = '__pending__';" + controller_trigger +
        'var bind_vresult = ' + asyncvalidate + ";self.syncwrap(bind_vresult," +
        "function() {(function(){if(bind_error_obj && bind_error_obj[bind_error_prop]){delete bind_error_obj[bind_error_prop]};" +
        (tags.bind + " = return_value;") + model_trigger + "}).call(self)}," +
        "function(e){(function(){c.bindster.raiseError(bindTags, e);bind_error_obj[bind_error_prop] = e;c.bindster.scheduleRender()}).call(self)})"
            : (tags.bind + " = return_value;") + trigger) +
        " } catch (e) {if(!e.constructor.toString().match(/Error/)){c.bindster.raiseError(bindTags, e);" +
        bind_error + " = e} else {c.bindster.displayError(null, e, 'validation, parse or format', node)}; " +
        "}";
    return x;
}
Bindster.prototype.syncwrap = function (val, good, bad) {
    if (val && val.then)
        return val.then(good, bad);
    else
        return good(val)
}

Bindster.prototype.raiseError = function (bind, error) {
    this.hasErrors = true;
    console.log("Error on " + bind + ":" + (error && error.message ? error.message : ""));
}
Bindster.prototype.getFirstChild = function(node)
{
    var firstChild = node.firstChild;
    while(firstChild && firstChild.nodeName == "#text")
        firstChild = firstChild.nextSibling;
    return firstChild;
}
Bindster.prototype.cleanNode = function(node) {
    while (node) {
        if (node.bindster)
            node.bindster = null;
        if (node.firstChild)
            this.cleanNode(node.firstChild);
        node = node.nextSibling;
    }
}
Bindster.prototype.initNode = function(node, force)
{
    if (!node.bindster || force)
        node.bindster = {id: this.next_id++}
}
Bindster.prototype.getWrap = function(finger_print)
{
    for (var ix in this.wraps)
    {
        if (finger_print.match(this.wraps[ix].regexp))
            return this.wraps[ix];
    }
    return null;
}
Bindster.prototype.wrapStatus = function(node, wrapped_entity)
{
    if (node.getAttribute("bindster_wrap") == 'wrapper')
        return true;
    if (node.getAttribute("bindster_wrap") == 'wrapped')
        return false;
    return wrapped_entity;
}
Bindster.prototype.addUserEvent = function(tags, event, action, defer, eval, originalAction) {
    this.addEvent(tags, event, action, defer, eval, originalAction, "user");
}
Bindster.prototype.addEvent = function(tags, event, action, defer, eval, originalAction, prefix)
{
    var key = event + (prefix = prefix || 'bindster');
    if (!tags.events[event])
        tags.events[event] = new Array();

    // Ensure no duplicates because events added every render
    var events = tags.events[event];
    for (var ix = 0; ix < events.length; ++ix)
        if (events[ix].key == key)
            events.splice(ix, 1);

    tags.events[event].push({key: key, action: action, originalAction: originalAction || action, defer: defer ? (defer > 0 ? defer * 1 : true) : false, eval: eval});
}
// Setup all events for the node
Bindster.prototype.processEvents = function(node, tags, context, cloned, finger_print)
{
    // Reset cloned nodes
    if (cloned) {
        node.bindster.events =  'no'
    }

    // Set up the context so it can be updated without updating events
    node.bindster.context =  context;
    context = "eval(node.bindster.context);"

    if (tags.events)
        this.DOMTestClick(finger_print, node, tags.events['onclick'])


    // If we already put events on this node ignore
    /*
     if (node.bindster.events == 'yes')
     return;
     TODO: Remove all the cloned logic now that we have proper caching
     */
    var declared_id = node.bindster.id;

    // Process each event
    var event_count = 0;
    for (var event_name in tags.events)
    {
        ++event_count;
        // Pull together the various actions assigned to the event
        var action = "";
        var defer = false;
        var modify_data = false;
        for (var jx = tags.events[event_name].length - 1; jx >= 0 ; -- jx) // make sure binds are first
        {
            var script = tags.events[event_name][jx].action;
            if (tags.events[event_name][jx].eval)
                script = this.eval(script, null, "evaluating evalon" + event_name, node);
            script = script.replace(/\'/g, "\\\'");
            action +=  (this.instance + ".eval('" + script + "',null,'" + event_name + "',node,ev,undefined,this);");
            if (tags.events[event_name][jx].defer)
                defer = tags.events[event_name][jx].defer;
            if (!script.match(/^addClass\(".*?"\)$/) && !script.match(/^removeClass\(".*?"\)$/))
                modify_data = true;
        }
        // For mouseover/mouseout we eliminate redundant fires
        var get_node = (event_name == 'onmouseover' || event_name == 'onmouseout') ?
        "var node = " + this.instance + ".processMouse(ev,'" + declared_id + "');" :
            "var node = ev.target ? ev.target : ev.srcElement; ";

        var set_focus = (event_name == 'onclick' || event_name == 'onenter') ? this.instance + ".set_focus = true;" : "";

        var schedule_render = modify_data ? this.instance + ".scheduleRender(" + defer + ");" : "";

        // IE does not like return false in on change events
        var do_return = (event_name == 'onclick' && node.tagName == 'A' && node.href && node.href.match(/#/) > 1) ? 'true' : 'false';
        var do_return ="return (ev && ev.srcElement && ev.srcElement.tagName && ev.srcElement.tagName == 'INPUT' ? true : " + do_return + ");";

        var payload = context + action + set_focus + schedule_render;
        if (event_name == "onenter") {
            event_name = "onkeydown";
            payload = "if (ev.keyCode == 13) {" + payload + "}";
            do_return = "return true";
        }

        var function_body = get_node + "if (node && node.bindster) { " + payload + " }" + do_return;
        function_body = "try{" + function_body + "}catch(e){" + this.instance + '.throwError(node, "' + event_name + '",e.message)}';
        try {
            node.bindster.event_log = node.bindster.event_log || {};
            if (node.bindster.event_log[event_name] != function_body)
                node[event_name] = new Function("ev", "ev = ev ? ev : event;" + function_body);
            node.bindster.event_log[event_name] = function_body;
        } catch (e) {
            this.displayError(function_body, e, 'event assignment for ...', node)
        }
        node.bindster.mouse_state =  'unknown';
        node.bindster.events =  'yes';

    }
    node.bindster.event_count =  event_count;
}
Bindster.prototype.processMouse = function(ev, declared_id)
{
    // Determine node that declared event
    var target = ev.target ? ev.target : ev.srcElement;
    if (!target.bindster)
        return false;
    var original_id = target.bindster.id;
    var declaredNode = target;
    while(declaredNode && declaredNode.bindster && declaredNode.bindster.id != declared_id)
        declaredNode = declaredNode.parentNode;

    if (ev.type != "mouseover" && ev.type != "mouseout")
        return declaredNode;

    // Mouse events where we came from or went to a target subordinate to the delcared node are ignored
    var relatedTarget = ev.relatedTarget ? ev.relatedTarget : (ev.type == 'mouseover' ? ev.fromElement : ev.toElement);
    var hit = relatedTarget;
    while(relatedTarget && (relatedTarget.nodeType == 1))
        if (relatedTarget.bindster && relatedTarget.bindster.id == declared_id) {
            //top.status = "ignoring " + declared_id;
            return false;
        } else {
            relatedTarget = relatedTarget.parentNode;
        }

    // If state change process event
    var old_mouse_state = declaredNode.bindster.mouse_state;
    var new_mouse_state = (ev.type == 'mouseover') ? 'over' : 'out';
    if (old_mouse_state == new_mouse_state)
        return false;
    declaredNode.bindster.mouse_state =  new_mouse_state;
    return declaredNode;
}
Bindster.prototype.scheduleRender = function(defer, prerender, prerender_error, prerender_node)
{
    if (prerender) {
        this.prerender_node = prerender_node;
        prerender = this.instance + ".eval('" + prerender + "', null, '" + prerender_error + "', " +
            this.instance + ".prerender_node);" + this.instance + ".prerender_node = null;";
    } else
        prerender = "";

    clearTimeout(this.timeout_token);

    defer = defer ? (defer < 50 ? 50 : defer) : 0;
    var renders = "";
    for (var ix = 0;ix < window['bindster_instance_count']; ++ix)
        renders += ("window['bindster_instances'][" + ix + "].render();");
    this.timeout_token = setTimeout(prerender + renders, defer)
}
Bindster.prototype.processRender = function()
{
    this.pendingRender = false;
    this.timeout_token = null;
}
Bindster.prototype.checkLocation = function(force)
{
    if (force || (document.location.href != this.current_location))
    {
        this.current_location = document.location.href;
        var path = document.location.pathname + document.location.hash;
        var hash = document.location.hash.replace(/#/, '');
        var hash = hash ? hash : (document.location.pathname.length > 1 ? "" : "__domstr_start__");
        for (var ix = 0; ix < this.bookmarks.length; ++ix)
            if (path.match(this.bookmarks[ix].hash) || hash.match(this.bookmarks[ix].hash)) {
                this.eval(this.bookmarks[ix].action, null, "onarrival for <a name='" + this.bookmarks[ix].hash + "'>");
                this.set_focus = true;
                this.DOMTestResolve("arrival");
                this.scheduleRender();
            }
    }
}
Bindster.prototype.getPropAttrs = function (node, bindRef)
{
    try {
        if (!bindRef || bindRef.match(/[^0-9a-zA-Z_$.\[\]()]/))
            return {}
        if (bindRef.match(/(.*?)\.([^.]+)$/)) {
            var obj = RegExp.$1;
            var prop = RegExp.$2;
        } else {
            var obj = "this.data";
            var prop = bindRef;
        }
        var tref = this.eval(obj + "['__props__']", null, "bind", node, null, true);
        var pref = this.eval(obj + "['__prop__']", null, "bind", node, null, true);
        if (typeof(pref) == 'function') {
            return this.eval(obj + "['__prop__']('" + prop + "')", null, "bind", node, null, true);
        } else if (typeof(tref) == 'function')
            return this.eval(obj + "['__props__'](" + obj + ")", null, "bind", node, null, true)[prop];
        else
            return {};
    } catch (e) {
        return {}
    }
}

Bindster.prototype.processRules = function(node, name, attrs)
{
    if (name instanceof Array)
        for (var ix = 0; ix < name.length; ++ix)
            this.processRules(node, name[ix], attrs);
    else
    if (this.rules[name])
        for (var attr in this.rules[name])
            if (!attrs[attr])
                attrs[attr] = this.convertValue(this.rules[name][attr]);
            else
            if (attr == "validate")
                attrs[attr] = attrs[attr] + ";" + this.convertValue(this.rules[name][attr]);
}
Bindster.prototype.isOurNode = function(node)
{
    if (node.scopeName && node.scopeName == this.namespace_prefix)
        return true;
    var str = node.tagName.toLowerCase();
    return str.substr(0, this.namespace_prefix.length + 1).toLowerCase() == (this.namespace_prefix + ":")
}
Bindster.prototype.isOurAttr = function(str)
{
    return str.substr(0, this.namespace_prefix.length + 1) == (this.namespace_prefix + ":") ||
        str.substr(0, 5) == 'bindster-';
}
Bindster.prototype.evalTags = function (tags, node)
{

    for (var tag in tags)
        if (tag.match(/^eval(.*)/)) {
            var realTag = RegExp.$1;
            var val = this.eval(tags[tag], null, "evaluating eval" + realTag + " tag", node);
            if (tags[tag] != val)  // When iterating and re-using old node be sure to regenerate event
                node.tags_updated = 'yes';
            tags[realTag] = val;
        }
    /*

     for (var tag in tags)
     if (tag.match(/^eval(.*)/))
     tags[RegExp.$1] = this.eval(tags[tag], null, "evaluating eval" + RegExp.$1 + " tag", node)

     */


}
Bindster.prototype.getTags = function (node, mapAttrs, finger_print)
{
    /*
     if (node.bindster && node.bindster.tags)
     return node.bindster.tags;
     */
    if (node.bindster && node.bindster.tags) {
        var cached_ok = true;
        var tags = node.bindster.tags;
        for (var tag in tags)
            if (tag.match(/^eval(.*)/)) {
                var realTag = RegExp.$1;
                var val = this.eval(tags[tag], null, "evaluating eval" + realTag + " tag", node);
                if (tags[tag] != val)
                    cached_ok = false;
            }
        if (cached_ok)
            return node.bindster.tags;
    }

    var tags = node.bindster.pushed_tags ? node.bindster.pushed_tags : {events: {}};
    var our_tag = this.isOurNode(node) ? node.tagName.toLowerCase().replace(/^.*:/, "") : "";
    var mapper = this.mappers[our_tag];
    var attrs = {};

    // Populate assocative array of our attributions
    for (var ix = 0; ix < node.attributes.length; ++ix) {

        // Get Name value pair
        attrName = node.attributes[ix].name.toLowerCase();
        var attrValue = node.attributes[ix].value;

        // Substitute mapper values
        if (mapAttrs) {
            var newAttrValue = attrValue.replace(/__[^_]+__/g, function(parameter) {
                var key = parameter.replace(/^__/, "").replace(/__$/, "");
                return mapAttrs[key] ? mapAttrs[key] : parameter;
            });
            if (newAttrValue != attrValue) {
                attrValue = newAttrValue;
                if (typeof(attrValue) != 'undefined')
                    node.setAttribute(attrName, attrValue);
            }
        }

        // Process only attributes that are ours and that they don't have unresolved mapper attributes
        if((our_tag.length > 0 || this.isOurAttr(attrName)) && (!mapAttrs || !attrValue.match(/__[^_]+__/)))
        {

            // clean up an normalize by removing bindster-, pre-pending our tag name and stripping -
            var attrName = attrName.replace(/^bindster-/, '').replace(/^.*:/, "").replace(/-/, '');
            if (attrValue.match(/\\/))
                attrValue = attrValue.replace(/\\\\(.)/g, "$1");  // use _\\_xx_\\_ to bypass escape mechanism

            // The attribute tag makes the whole tag into our tag
            if (our_tag.length == 0 && attrName == "tag") {
                our_tag = attrValue;
                mapper = this.mappers[attrValue];
            }

            // Record attribute value
            attrs[(mapper ? "" : our_tag) + attrName] = attrValue .replace(/^ +/, '').replace(/ +$/, '');

            // For data binding see if we need to pick up additional attributes from the model
            if ((attrName == 'bind' || attrName == 'evalbind' || attrName == 'on') && !mapper)
            {
                if (attrName == 'evalbind')
                    var pattrs = this.getPropAttrs(node, this.eval(attrValue, null, node, "evaluating evalbind="));
                else
                    var pattrs = this.getPropAttrs(node, attrValue);

                for (attr in pattrs)
                    if (attr.match(/validate|format|parse|rule|type|values|descriptions/))
                        attrs[attr.match(/type/) ? 'proptype' : attr.match(/validate/) ? 'asyncvalidate' : attr] =
                            (attr == 'rule' || attr == 'type') ? pattrs[attr] :
                                (attr.match(/values|descriptions|validate/) ? pattrs[attr] : this.convertValue(pattrs[attr]));

                // Add to the fingerprint to allow selectors to match
                finger_print += ("=" + (attrValue.match(/(.*?)\.([^.]+)$/) ? RegExp.$2 : attrValue) + ";");
            }
        }
    }

    // Add in attributes assigned by controller.attr()
    if (finger_print)
        for (var ix = 0; ix < this.attr.length; ++ix) {
            var attr = this.attr[ix];
            if (finger_print.match(attr.regexp))
                if (typeof(attr.name) == 'object')
                    for (var key in attr.name)
                        attrs[key] = attr.name[key];
                else
                    attrs[attr.name] = attr.value;
        }

    // If this is a mapper capture attributes but don't process
    if (our_tag.length > 0 && mapper) {
        node.bindster.tags = {map: {name: our_tag,	attrs: attrs}};
        return node.bindster.tags;
    }

    // Process rule tag which defines attributes to be applied
    if (our_tag == "rule") {
        if (!attr["name"])
            this.throwError(node, attr, "missing name attribute on rule")
        else {
            rule = this.rules[attr] || {};
            for (attr in attrs)
                if (attr != "name")
                    rule[attr] = this.convertValue(attrs[attr]);
            this.rules[attr] = rule;
        }
    }

    // Add attributes for a rule
    if (attrs["rule"]) {
        var name = attrs["rule"];
        this.processRules(node, name, attrs);
    }

    // process attributes to build tags associative array
    for (attr in attrs) {
        var value = attrs[attr]

        switch(attr.toLowerCase().replace(/-/g, ''))
        {
            case "rule":
                break;

            case "iterateevalon":
                tags.iterateid = (node.getAttribute && node.getAttribute("bindster_iterateid")) ? node.getAttribute("bindster_iterateid") : this.iterate_id++;
                tags['evaliterateon'] = value;
                break;
            case "evaliterateon":
            case "iterateon":
                tags.iterateid = (node.getAttribute && node.getAttribute("bindster_iterateid")) ? node.getAttribute("bindster_iterateid") : this.iterate_id++;
            case "iteratewith":
            case "iterateindex":
            case "iteratecounter":
            case "iterateloopindex":
            case "iteratefilter":
            case "fill":
            case "evalfill":
            case "fillkey":
            case "fillvalue":
            case "pleaseselect":
            case "nullselect":
            case "using":
            case "evalusing":
            case "bind":
            case "evalbind":
            case "parse":
            case "evalparse":
            case "format":
            case "evalformat":
            case "truevalue":
            case "falsevalue":
            case "when":
            case "focus":
            case "binderror":
            case "evalbinderror":
            case "binderrordata":
            case "validate":
            case "asyncvalidate":
            case "evalvalidate":
            case "trigger":
            case "evaltrigger":
            case "rule":
            case "mappertag":
            case "wrappername":
            case "controller":
            case "controllerdata":
            case "onarrival":
            case "match":
            case "onenter" :
            case "onhide" :
            case "onshow" :
            case "includeinsert":
            case "includewhenloaded":
            case "includeifloaded":
            case "includeurl":
            case "proptype":
            case "sort":
            case "sortorder":
                tags[attr] = value;
                break;

            case "hide":
            case "ifhide":
                if (value.match(/visibility|display|offscreen|remove/))
                    tags['hide'] = value;
                else
                    this.throwError(node, attr, "hide must be visibility, display, offscreen or remove");
                break;

            case "includeasync":
                if (value.match(/^yes|no$/i))
                    tags['includeaysync'] = (value == "yes");
                else
                    this.throwError(node, attr, "include-async must be yes or no");
                break;

            case  "showif":
                tags['test'] = value;
                tags['hide'] = tags['hide'] ? tags['hide'] : 'display';
                break;

            case  "evalshowif":
                tags['evaltest'] = value;
                tags['hide'] = tags['hide'] ? tags['hide'] : 'display';
                break;

            case  "visibleif":
                tags['test'] = value;
                tags['hide'] = 'visibility';
                break;

            case  "evalvisibleif":
                tags['evaltest'] = value;
                tags['hide'] = 'visibility';
                break;

            case "iftest":
            case "test":
                tags['test'] = value;
                break;

            case "ifevaltest":
            case "evaltest":
                tags['evaltest'] = value;
                break;

            case "values":
                tags['fill'] = value;
                break;

            case "descriptions":
                tags['using'] = value;
                break;

            case "messagevalue":
                if (attrs["messagename"])
                    this.messages[attrs["messagename"]] = value;
                else
                    this.throwError(node, attr, "missing name attribute");
                break;


            case "errortext":
                if (attrs["errorname"])
                    this.error[attrs["errorname"]] = value;
                else
                    this.throwError(node, attr, "missing name attribute");
                break;

            case "onpaint":
                if (value.match(/^(.*?) *{(.*)}$/)) {
                    var depends = [];
                    var depends_raw = RegExp.$1.split(",");
                    var action = RegExp.$2;
                    for (var ix = 0; ix < depends_raw.length; ++ix)
                        depends.push({name: depends_raw[ix].replace(/[^\w]/g,'_').replace(/ /g, ''),
                            value: depends_raw[ix].replace(/ /g, '')});
                    if (!tags.onpaint)
                        tags.onpaint = [];
                    tags.onpaint.push({depends: depends, action: action});
                } else
                    this.throwError(node, attr);
                break;

                tags[attr] = value;
                break;

            case "widget":
                if (value.match(/^(\S*) (.*)$/)) {
                    var function_obj = window['widget_' + RegExp.$1];
                    if (!function_obj)
                        this.alert(name + " widget not found - did you include widget_" + RegExp.$1 + ".js?");
                    else
                        tags['widget'] = {parameters: RegExp.$2 ? eval("p = " + RegExp.$2) : null, obj: function_obj};
                } else
                    this.throwError(node, attr);
                break;

            case "wrapwith":
                var wrapper = value;
                var trigger = attrs['wrapselector'];
                var expression = this.createSelectorRegExp(trigger);
                this.wraps[trigger] = {trigger: trigger, outer: this.wrappers[wrapper], regexp: expression};
                break;

            default:
                var listener1 = ";if (typeof(onevent) == 'function'){onevent('" + attr + "','" + value.replace(/\'/g, "") + "');}";
                var listener2 = (typeof(bindsterTestFrameworkEvent) == 'function' ?
                ";bindsterTestFrameworkEvent('" + attr + "','" + value.replace(/\'/g, "") + "', node);" : "");
                if (attr.match(/^(on\S*)$/))
                    this.addUserEvent(tags, RegExp.$1, "{" + listener1 + value + listener2 + "}", null, null, value.replace(/\'/g, ""));
                else if (attr.match(/^(evalon\S*)$/))
                    this.addUserEvent(tags, RegExp.$1.substr(4), "{" + listener1 + value + listener2 +"}", null, true);
                else if (our_tag.length == 0) {
                    if (!tags.onpaint)
                        tags.onpaint = [];
                    if (attr == 'style') {
                        var styles = value.split(";");
                        for (var jx = 0; jx < styles.length; ++jx) {
                            if (styles[jx].length > 0) {
                                var style_details = styles[jx].replace(/:/, "_::_").split("_::_");
                                if (style_details.length != 2)
                                    this.throwError(node, "style", "style attribute missing a colon in " + styles[jx]);
                                var style_tag = style_details[0].replace(/ $/g, '').replace(/^ /g, '')
                                    .replace(/(-[a-z])/g, function(x){return x.substr(1).toUpperCase()});
                                tags.onpaint.push(this.getOnPaint("style." + style_tag, style_details[1].replace(/ $/g, '').replace(/^ /g, '')));
                            }
                        }
                    } else
                        tags.onpaint.push(this.getOnPaint(this.attrToProp[attr] || attr, value));
                }
        }
    }
    tags.canPrune = our_tag.length > 0;
    node.bindster.tags = tags;
    return tags;
}
Bindster.prototype.createSelectorRegExp = function(selector)
{
    var expression = "";
    var selector_groups = selector.split(",")
    for (var ix = 0; ix < selector_groups.length; ++ix)	{
        var selector_group = selector_groups[ix];
        var selectors = selector_group.replace(/^ */, "").split(" ");
        for (var jx = 0; jx < selectors.length; ++jx) {
            var selector = selectors[jx];
            if (selector.substr(0,1) == '#' || selector.substr(0,1) == '=')
                expression += selector;
            else if (selector.substr(0,1) == '.')
                expression += selector.replace(/\./,'\\.');
            else
                expression += (' ' + selector.toUpperCase());
            if (jx == (selectors.length - 1))
                expression += ';[^/]*$';
            else
                expression += ';.*?'
        }
        if (ix < (selector_groups.length - 1))
            expression += '|';
    }
    return expression;
}
Bindster.prototype.getOnPaint = function(element, expression)
{
    var depends = [];
    expression = (expression + "").replace(/{([^}]*)}/g, function (all, js) {
        js = "(" + js + ")";
        depends.push({name: escape(js).replace(/[\%\*\@\-\+\.]/g, function(c)
        {return c == '%' ? '_pct_' : c == '+' ? '_plus_' : c == '*' ? '_star_' :
            c == '@' ? '_at_'  : c == '-' ? '_minus' : c == '.' ? '_dot_'  : c}),
            value: js})
        return '" + ' + js + ' + "';
    });
    var test = expression.match(/^" \+ (.*) \+ "$/) ? RegExp.$1 : 'true';
    //return {depends: depends, action: 'target.' + element + ' = "' + expression + '";', tag: element};
    return {depends: depends, action: 'if(typeof(' + test +') != "undefined"){target.' + element + ' = "' + expression + '"};', tag: element};

}
Bindster.prototype.evalJSTag = function(tag, node)
{
    tag = tag.replace(/{([^}]*)}/g, function (all, js) {
        return this.eval(js, null, 'error evaluating {}', node);
    }.bind(this));
    return tag;
}
Bindster.prototype.getText = function(node)
{
    try {
        return node.innerText ? node.innerText : node.textContent;
    } catch(e) {
        return false;
    }
}
Bindster.prototype.evalWithValue = function(js, value, error_message, node, ev)
{
    if (this.controller)
        this.controller.value = value;
    else
        window['bindster_value'] = value;
    return this.eval(js, {value: value}, error_message, node, ev);

}
Bindster.prototype.eval = function(__js__, data, error_message, node, ev, rethrow, bindTarget)
{
    var srcElement = node;
    var target = node;
    try {
        if (this.controller && data)
            with(this.data) {with (this.controller) {with (data) {return eval (__js__); }}}
        else if (this.controller && !data)
            with(this.data) {with (this.controller) {return eval (__js__); }}
        else if (!this.controller && data)
            with(this.data) {with (data) {return eval (__js__); }}
        else
            with (this.data) {return eval (__js__); }
    } catch(e) {
        if (rethrow)
            throw e;
        this.displayError(__js__, e, error_message, node);
        return "";
    }

}
Bindster.prototype.displayError = function (js, e, error_message, node)
{
    message = e.message;
    if (e.lineNumber)
        message += ("\n\n\rline: " + e.lineNumber)
    if (js)
        message += ("\n\n\rscript: " + js)
    if (error_message)
        message += ("\n\n\rprocessing: " + error_message)
    if (node && node.outerHTML)
        message += ("\n\n\rnear: " + node.outerHTML.substr(0, 250));
    if (e.stack && typeof(e.stack) == "string") {
        message += "\n\n";
        var stack = e.stack.split("\n");
        for (var ix = 0; ix < stack.length; ++ix)
            if (!stack[ix].match(/bindster.*js/))
                message += (stack[ix] + "\n");
    }
    if (this.alertCount++ < 2)
        this.alert(message);
}
Bindster.prototype.throwError = function(node, tag, message)
{
    var html = (node && node.outerHTML) ? node.outerHTML : "";
    message = message ? " (" + message + ")" : ""
    if (this.alertCount++ < 2)
        this.alert("Error processing " + tag + message + "\n\nin ...\n\n" + html.substr(0, 200));
    if(console)
        console.log("BINDSter Processing Error " + tag + message + "\n\nin ...\n\n" + html.substr(0, 200));
}

Bindster.prototype.get = function(__element__, withdata)
{
    try {
        if (this.controller)
            with (this.controller) {with (withdata ? withdata : this.data) {return eval (__element__); }}
        else
            with (withdata ? withdata : this.data) {return eval (__element__); }
    } catch(e) {
        return false;
    }
}
Bindster.prototype.set = function(__element__, __value__)
{
    try {
        if (this.controller && false)
            with (this.controller) {with (this.data) {eval (__element__ + "=" + __value__)}}
        else
            with (this.data) {eval (this.instance + ".data." + __element__ + "=" + __value__)};
    } catch(e) {}
}
Bindster.prototype.removeElement = function(parent)
{
    var child = parent.firstChild;
    var previous_cut_id =  parent.getAttribute("bindster_cut_id");
    if (child) {
        if (!previous_cut_id) {
            var cut_id = this.cuts_id++;
            this.cuts[cut_id] = document.createElement("DIV");
            parent.setAttribute("bindster_cut_id", cut_id);
        }
        while (child) {
            var nextChild = child.nextSibling;
            if (!previous_cut_id)
                this.cuts[cut_id].appendChild(parent.removeChild(child));
            else
                parent.removeChild(child);
            child = nextChild;
        }
        parent.bindster.cloned = "yes";
    }
}
Bindster.prototype.insertElement = function(parent)
{
    if (!parent.firstChild) {
        var cut_id = parent.getAttribute("bindster_cut_id");
        if (!cut_id)
            this.alert("internal errror on if statement");
        var child = this.cuts[cut_id].firstChild;
        while (child) {
            var nextChild = child.nextSibling;
            parent.appendChild(child.cloneNode(true));
            child = nextChild;
        }

    }
}
Bindster.prototype.insertElements = function(parent, node)
{
    while(node) {
        var nextSibling = node.nextSibling;
        parent.insertBefore(node, null);
        node = nextSibling;
    }
}
Bindster.prototype.insertElementsBefore = function(parent, node, before)
{
    while (node) {
        var start = node;
        node = node.nextSibling;
    }
    var node = start;
    while(node) {
        var previousSibling = node.previousSibling;
        before = parent.insertBefore(node, before);
        node = previousSibling;
    }
}
Bindster.prototype.hideElement = function(node, hide_tag)
{
    switch (hide_tag || "display") {
        case "visibility":
            node.style.visibility = "hidden";
            break;

        case "display":
            if (!node.style.display || node.style.display != 'none')
                node.setAttribute("style_display", node.style.display);
            node.style.display = 'none';
            break;

        case "offscreen":
            if (node.style.top != "-32767px")
                node.setAttribute("style_offscreen", node.style.position + "," + node.style.top);
            node.style.position = 'absolute';
            node.style.top = "-32767px";
            break;
    }
}
Bindster.prototype.restoreElement = function(node)
{
    if (node.nodeType == 1) {
        if (node.style.visibility == "hidden") {
            node.style.visibility = "visible";
        }
        if (node.style.display == "none")
        {
            var old_display = node.getAttribute("style_display");
            if (old_display != null)
                node.style.display = old_display;
        }
        if (node.style.top == "-32767px") {
            var old_display = node.getAttribute("style_offscreen");
            if (old_display != null) {
                var args = old_display.split(",");
                node.style.position = args[0].length > 0 ? args[0] : 'static';
                node.style.top = args[1].length > 0 ? args[1] : '0px';
            }
        }
    }
}
Bindster.prototype.attachEvent = function(element, event, action)
{
    if (element.attachEvent)
        element.attachEvent("on" + event, action);
    else if (element.addEventListener)
        element.addEventListener(event, action, false);
    else
        element["on" + event] = action;
}
Bindster.prototype.detachEvent = function(element, event, action)
{
    if (element.detachEvent)
        element.detachEvent("on" + event, action);
    else if (element.removeEventListener)
        element.removeEventListener(event, action, false);
    else
        element["on" + event] = null;
}
Bindster.prototype.createDelegate = function(obj, func)
{
    var outer_arguments = arguments;
    return function () {
        var innerparams = [];
        for (var ix = 0; ix < arguments.length; ++ix)
            innerparams.push(arguments[ix]);
        for (var ix = 2; ix < outer_arguments.length; ++ix)
            innerparams.push(outer_arguments[ix]);
        return func.apply(obj, innerparams)
    }
}
Bindster.prototype.includeComment = function (file, node) {
    this.fetchFile(file, node, false, this.includeCommentSuccess, this.includeCommentFailure);
}
Bindster.prototype.includeNode = function (file, node, async, then) {
    this.fetchFile(file, node, async,
        function (request, node, async) {
            this.includeNodeSuccess(request, node, async);
            if (then)
                then.call(this);
        }, this.includeNodeFailure);
}
Bindster.prototype.fetchFile = function (file, node, async, success, failure) {
    var request = this.getXHR();
    if (!file.match(/\?/) && this.urlSuffix)
        file = file + this.urlSuffix;
    request.open('GET', file, async ? true : false);
    request.onreadystatechange = this.createDelegate(this, this.processFetchResponse, request,
        this.createDelegate(this, success, node, async), this.createDelegate(this, failure, file, node));
    try {
        request.send(null);
    } catch (e) {
        if (e.code && e.code == 101)
            this.throwError(node, "requesting " + file, e.message + " (same origin policy violated.  If running locally with Chrome start it with  --allow-file-access-from-files)");
        else
            this.throwError(node, "requesting " + file, e.message);
    }
}
Bindster.prototype.processFetchResponse = function (p1, p2, p3, p4)
{
    var request = p4 ? p2 : p1;
    var success = p4 ? p3 : p2;
    var failure = p4 ? p4 : p3;

    if (request.readyState != 4)
        return;

    try {
        var status = request.status;
        var statusText = request.statusText;
    } catch (e) {
        var status = 666;
        var statusText = 'unknown';
    }
    if (status == 200 || status == 0)
        success.call(this, request)
    else
        failure.call(this, statusText);
}
Bindster.prototype.includeCommentSuccess = function (request, node, async) {
    node.data="";
    var div = document.createElement("DIV");
    div.innerHTML = request.responseText;
    this.insertElementsBefore(node.parentNode, div.firstChild, node.nextSibling);
    if (async)
        this.scheduleRender();
}
Bindster.prototype.includeCommentFailure = function (error, file, node) {
    node.data="";
    this.throwError(node, "include of " + file, error);
}
Bindster.prototype.includeNodeSuccess = function (request, node, async) {
    node.innerHTML = request.responseText;
    if (async)
        this.scheduleRender();
}
Bindster.prototype.includeNodeFailure = function (error, file, node) {
    this.throwError(node, "include of " + file, error);
}
Bindster.prototype.getXHR = function()
{
    try {
        return new XMLHttpRequest();
    } catch (e) {
        try {
            return new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e2) {
            try {
                return new ActiveXObject("Microsoft.XMLHTTP");
            } catch (e3) {
                this.controller.alertEvent('No support for XMLHTTP');
            }
        }
    }
}

//------------------------- Factory functions ----------------------------------

Bindster.fromPOJO = function (json, type) {
    var props = type.__props__ ? type.__types__() : null;
    type.toString().match(/function (.*)\(/);
    type = RegExp.$1

    // For primitiva props just return them
    if (type.match(/String|Number|Boolean/))
        return json;
    if (type == "Date")
        return Date.fromJSON ? (new Date()).fromJSON(json) : new Date(json);

    // Instantiate non-primitive props
    var obj = eval("new " + type + "()");

    // Copy any missing properties
    for (prop in json)
        if (!props || !props[prop])
            obj[prop] = json[prop]

    // If they have binding data then ensure we instantiate all properties correctly
    var props = obj.__props__ ? obj.__props__() : null;
    if (props)
        for (var prop in props) {
            var type = props[prop].type;
            if (type)
            // Instantiate Arrays as [] or [json values]
                if (type == Array) {
                    obj[prop] = [];
                    if (json[prop])
                        for (var ix = 0; ix < json[prop].length; ++ix)
                            obj[prop].push(fromJSON(json[prop][ix], props[prop].of));
                    // Everything else passed back to fromJSON which will sort out primitive props
                } else
                    obj[prop] = Bindster.fromPOJO(json[prop] || props[prop].value || null, type)
        }
    return obj;
}
Bindster.bind = function (model, view, controller) {
    return new Bindster(model, view, controller)
}
/*
 Test Interface allows bindster applications to be driven by an API with no need to
 assign unique IDs to elements.  Elements are looked up by selector and data binding
 information.  This facilitates (in the future) the ability to record user activity
 and to play it back.

 DOMGet/DOMSet expect a request object which contains:
 bind - the expression used in the bind attribute
 context - an optional context that must be true (used for iteration)  NOT IMPLEMENTED AT PRESENT
 selector - an optional selector to qualify the node in question
 defer - an optional defer indication which may be:
 'page' - wait for a bookmark (onarrival) to fire
 'ajax' - wait for an ajax request to complete NOT IMPLEMENTED AT PRESENT
 when present a promise is returned which will be resolved once the event above completes
 value - in the case of DOMSet, the value to be set

 DOMClick find an onclick event or anchor and fire it along with event which expects an option containing:
 text - the text (innerHMTL) used to identify
 action - the action string used to identify
 sequence - the n'th time the node is found
 context - an optional context that must be true (used for iteration)  NOT IMPLEMENTED AT PRESENT
 selector - an optional selector to qualify the node in question

 */


Bindster.prototype.DOMGet = function(request) {
    return this.DOMSet(request);
}
Bindster.prototype.DOMSet = function (request)
{
    this.DOMTestRequestData = request;
    this.DOMTestRequestData.status = "Pending";
    this.render();
    if (this.DOMTestRequestData.status && this.DOMTestRequestData.status == "OK") {
        var value = this.DOMTestRequestData.value;
        this.DOMTestRequestData = null;
        this.render();  // Re-render
        return value;
    } else {
        this.DOMTestRequestData = null;
        throw "Cannot process DOMTestRequest" + JSON.stringify(request);
    }
},
    Bindster.prototype.DOMFind = function (request)
    {
        this.DOMTestRequestSearch = request;
        this.DOMTestRequestSearch.status = "Pending";
        this.DOMTestRequestSearch.sequence = 0;
        this.render();
        if (this.DOMTestRequestSearch.status && this.DOMTestRequestSearch.status == "OK") {
            this.DOMTestRequestSearch = null;
            return true;
        } else {
            this.DOMTestRequestSearch = null;
            return false;
        }
    },
    Bindster.prototype.DOMGetSequence = function (request)
    {
        this.DOMTestRequestAction = request;
        this.DOMTestRequestAction.status = "Pending";
        this.DOMTestRequestAction.sequenceTracker = {};
        this.render();
        return this.DOMTestRequestAction.value || 0;
    },
    Bindster.prototype.DOMClick = function (request)
    {
        this.DOMTestRequestAction = request;
        this.DOMTestRequestAction.status = "Pending";
        this.render();  // May cause defer to be reset to null
        if (this.DOMTestRequestAction.status == "OK") {
            this.DOMTestRequestAction.value.click();
            return true;
        } else {
            this.DOMTestRequestAction = null;
            throw "Cannot process DOMTestRequest" + JSON.stringify(request);
        }
    },

    /*
     Handlers for test interface which catch data binding and event handling as well as render and
     ajax calls for resolving promises.
     */

// Called on bind operations.  Has the opportunity to change the bind value (DOMSet) and
// retrieve data (DOMGet).  Uses getBindAction to ensure validation and filtering occur.
// For radio and checkboxes data is taken directly to/from model
    Bindster.prototype.DOMTestBind = function(finger_print, node, tags, bind_data)
    {
        if (this.DOMTestRequestData && this.DOMTestRequestData.bind && this.DOMTestRequestData.status == "Pending" &&
            (!this.DOMTestRequestData.selector || finger_print.match(this.DOMTestRequestData.selector)) &&
            this.DOMTestRequestData.bind == tags.bind)
        {
            if (typeof(this.DOMTestRequestData.value) != 'undefined') {
                if ((node.tagName && node.tagName.match(/INPUT|SELECT|TEXTAREA/)) || node.bindster.controller)
                {
                    this.eval(this.getBindAction(tags, "bindster.DOMTestRequestData.value"), null, "DOMTestBind", node);
                    this.DOMTestRequestData.status = "OK";
                    bind_data = this.DOMTestRequestData.value;
                }
            } else
            {
                if (typeof(this.DOMTestRequestData.sequence) == 'undefined' || this.DOMTestRequestData.sequence-- == 0) {
                    this.DOMTestRequestData.value = bind_data;
                    this.DOMTestRequestData.status = "OK";
                }
            }
        }
        return bind_data;
    }

// Called on attachment of events to find both onclick events and anchors that need to be fired
Bindster.prototype.DOMTestClick = function(finger_print, node, events) {

    // Determine a unique sequence number for each action
    if (events)
        for (var ix = 0; ix < events.length; ++ix) {
            var event = events[ix];
            if (event.originalAction) {
                if (typeof(this.originalActionSequenceTracker[event.originalAction]) == 'undefined')
                    this.originalActionSequenceTracker[event.originalAction] = 0;
                else
                    this.originalActionSequenceTracker[event.originalAction]++;
                node.bindster.actionSequence = this.originalActionSequenceTracker[event.originalAction]
            }
        }

    if (events && this.DOMTestRequestAction && this.DOMTestRequestAction.status == "Pending")
    {
        for (var ix = 0; ix < events.length; ++ix) {
            var event = events[ix];
            if ((!this.DOMTestRequestAction.selector || finger_print.match(this.DOMTestRequestAction.selector)) &&
                ((this.DOMTestRequestAction.action && event.originalAction == this.DOMTestRequestAction.action) ||
                (this.DOMTestRequestAction.id && node.id && node.id == this.DOMTestRequestAction.id) ||
                (this.DOMTestRequestAction.text && node.innerText && node.innerText == this.DOMTestRequestAction.text &&
                (!this.DOMTestRequestAction.type || this.DOMTestRequestAction.type.toLowerCase() == node.tagName.toLowerCase())))) {
                if (typeof(this.DOMTestRequestAction.sequence) == 'undefined' || this.DOMTestRequestAction.sequence-- == 0) {
                    this.DOMTestRequestAction.value = node;
                    this.DOMTestRequestAction.status = "OK"
                }
            }
        }
    }
    if (!events && node.href && this.DOMTestRequestAction && this.DOMTestRequestAction.status == "Pending") {
        var href=node.href.replace(/.*#/, '#');
        if ((!this.DOMTestRequestAction.selector || finger_print.match(this.DOMTestRequestAction.selector)) &&
            ((this.DOMTestRequestAction.href && href == this.DOMTestRequestAction.href) ||
            (this.DOMTestRequestAction.text && node.innerText && node.innerText == this.DOMTestRequestAction.text)))
        {
            document.location.href=node.href;
            this.DOMTestRequestAction.status = "OK"
        }
    }
    if (!events && this.DOMTestRequestSearch && this.DOMTestRequestSearch.text && this.DOMTestRequestSearch.status == "Pending") {
        if (!this.DOMTestRequestSearch.selector || finger_print.match(this.DOMTestRequestSearch.selector)) {
            var text = node.innerText;
            if (text && text == this.DOMTestRequestSearch.text)
                this.DOMTestRequestSearch.status = "OK"
        }
    }

}

// Called on render and onarrival events to resolve promises returned from DOMGet
Bindster.prototype.DOMTestResolve = function (type) {
    if (this.DOMTestRequestAction && this.DOMTestRequestAction.status == "Deferred") {
        if (this.DOMTestRequestAction.defer == "page" && type == "arrival")
            this.DOMTestRequestAction.defer = "render";
        else if (this.DOMTestRequestAction.defer == "remote" && type == "ajax")
            this.DOMTestRequestAction.defer = "render"
        else if (this.DOMTestRequestAction.defer == "render" && type == "render") {
            this.DOMTestRequestAction.status = "OK";
            this.DOMTestRequestAction.deferred.resolve(true);
        }
    } else if (this.DOMTestRequestAction && this.DOMTestRequestAction.status == "Pending") {
        if (this.DOMTestRequestAction.defer == "page" && type == "arrival")
            this.DOMTestRequestAction.defer = null;
    }
}
// -------------------------- Bindster Controller ------------------------------

function BindsterControllerInterface(bindster, node, parameters) {
    this.bindster = bindster;
    this.parameterString = parameters ? parameters : null;
    this.node = node;
    this.evaluateParameters();
}
BindsterControllerInterface.prototype.evaluateParameters = function() {
    if (this.parameterString)
        this.parameters = this.bindster.eval("bindster_temp=" + this.parameterString, null, "b:controller attribute", this.node);
    else
        this.parameters = {};
}
BindsterControllerInterface.prototype.set = function(value, defer, onchange) {
    eval(this.node.bindster.context);
    var tags = this.bindster.getTags(this.node);
    this.bindster.eval(tags.bind + " = this_value", {this_value: value}, "bind", this.node);
    this.bindster.scheduleRender(50, onchange, "onchange", this.node);
}
BindsterControllerInterface.prototype.parameter = function (name, default_value) {
    var value=  this.node.getAttribute('Bindster_parameter_' + name);
    return value != null ? value : default_value;
}
BindsterControllerInterface.prototype.attachEvent = function(node, event_name, obj, member, render) {
    var event = this.createEvent(node, event_name, obj, member, render);
    this.bindster.attachEvent(node, event_name, event);
    return event;
}
BindsterControllerInterface.prototype.detachEvent = function(node, event_name, event) {
    this.bindster.detachEvent(node, event_name, event);
}
BindsterControllerInterface.prototype.registerEvent = function(node, event_name, obj, member, render) {
    node["on" + event_name] = this.createEvent(node, event_name, obj, member, render);
}
BindsterControllerInterface.prototype.createEvent = function(node, event_name, obj, member, render) {

    this.bindster.initNode(node);
    node.bindster.controller = obj;
    var action = "node.bindster.controller['" + member + "'].call(node.bindster.controller, ev)";
    var declared_id = node.bindster.id;
    var get_node = (true || event_name == 'mouseover' || event_name == 'mouseout') ?
    "var node = " + this.bindster.instance + ".processMouse(ev,'" + declared_id + "');" :
        "var node = ev.target ? ev.target : ev.srcElement; ";

    var schedule_render = render ? this.bindster.instance + ".scheduleRender(" + render + ");" : "";

    // IE does not like return false in on change events
    var do_return = (event_name == 'onclick' && node.tagName == 'A' && node.href && node.href.match(/#/) > 1) ? 'true' : 'false';
    var do_return ="return (ev && ev.srcElement && ev.srcElement.tagName && ev.srcElement.tagName == 'INPUT' ? true : " + do_return + ");";

    var function_body = get_node + "if (node) { " + action + schedule_render + " }" + do_return;
    function_body = "try{" + function_body + "}catch(e){" + this.bindster.instance + '.throwError(node, "' + event_name + '",e.message)}';

    node.bindster.mouse_state =  'unknown';
    return new Function("ev", "ev = ev ? ev : event;" + function_body);
}
