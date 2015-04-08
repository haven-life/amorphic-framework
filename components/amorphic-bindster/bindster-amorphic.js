var __ver = __ver || 0;

if (typeof(controller) == 'undefined')
    var controller = null;

if (typeof(bindster) == 'undefined')
    var bindster =  null;

// Bind bindster to semotus
amorphic.establishClientSession(

    "Controller", __ver,

    // Establish a new session whether first time or because of expiry / server restart
    function (newController, sessionExpiration) {

        if (controller && typeof(controller.shutdown) == "function")
            controller.shutdown();
        controller = newController;

        console.log("creating bindster binding");

        if (!bindster) {
            bindster = new Bindster(controller, null, controller, null, true);
            bindster.alert = function (msg) {
                //controller.serverLog(msg);
                alert(msg);
            }
            if (typeof(controller.clientInit) == "function")
                controller.clientInit(sessionExpiration);
            bindster.start();
        } else {
            bindster.setModel(controller)
            bindster.setController(controller);
            if (typeof(controller.clientInit) == "function")
                controller.clientInit(sessionExpiration);
            controller.refresh(1);
        }
    },

    // Rerender after xhr request received
    function (hadChanges) {
        controller.refresh(1, hadChanges);
    },



    // When a new version is detected pop up "about to be refreshed" and
    // then reload the document after 5 seconds.
    function () {
        controller.amorphicStatus = 'reloading';
        controller.refresh(1);
        setTimeout(function () {document.location.reload(true)}, 3000);
    },

    // If communication lost pop up dialog
    function () {
        controller.amorphicStatus = 'offline';

    }

);
