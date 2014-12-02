## 0.1.30
* Added bindster test framework
* Added loopiterate on iterate to get the ordinal of the filtered list
## 0.1.29
* Handling of radio buttons with variables as true value and validation for radio buttons for null values
## 0.1.28
* refresh to show the online loading message if implemented
## 0.1.27
* router.js  -Don't process lower level enter's if you route while processing a higher level enter
* bindster.js - Don't consider fields that are awaiting defered status to be errors for SetFocus purposes
## 0.1.25
* Added amorphic status
## 0.1.24
* Don't crush ver
## 0.1.23
* You can specify a node reference or id in controller.validate()
## 0.1.18
* Triggers were not being called for checkboxes
## 0.1.18
* Triggers were not being consistently called
## 0.1.16
* Included support for routing by id
## 0.1.14
* The user defined properties surfacing in the route passed to enter/exit no longer have a prefix of __
* nested: true is now available as a route property that specifies that the route is nested and does
not cause the current route to be exited (calling exit).  You can use router.popRoute() to restore 
the previous route
* You can pass parameters in the route function which are passed along to the enter function

## 0.1.13
* Fixed a problem where routes could not be re-initialized
* Added tests

