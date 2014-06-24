## 0.1.14
* The user defined properties surfacing in the route passed to enter/exit no longer have a prefix of __
* nested: true is now available as a route property that specifies that the route is nested and does
not cause the current route to be exited (calling exit).  You can use router.popRoute() to restore 
the previous route
* You can pass parameters in the route function which are passed along to the enter function

## 0.1.13
* Fixed a problem where routes could not be re-initialized
* Added tests

