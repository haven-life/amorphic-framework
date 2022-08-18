## 7.0.0
* update semotus to use client passed logger.
## 6.0.1
* bump nconf version due to security vulnerability.
## 6.0.0
* Upgraded to node 16
* Bumped dependencies to major versions
## 5.0.0
* Updated knex and pg versions for node 14 upgrade.
## 4.1.1
* Fixing a bug in semotus where checking to see if `public: true` would fail if the remote object instance did not exist within the session
## 4.1.0
* Added Semotus changes for `public: true` tag in remote decorator to help define public facing routes
* Added ability for amorphic to pass in the request and response objects into semotus so it can pass them into the preserver and postServercall
## 4.0.0
* Adding Sync State feature to limit object synchronization at stages in a session. See documentation in SyncStates.md
## 3.3.0
* Changed default reject handling behavior to always trigger handleRemoteError on any remote call error if it exists
## 3.2.1
* Updated packages with npm audit for developer dependenceis (istanbul and mocha)
## 3.2.0
* Updated some packages (using npm audit)
* Added an async postServerErrorHandler callback on the controller for verifying errors on remote functions parameters are the errorType (sync, response, error), the remoteCall Id, the object instance for the function that's called the function name, the call context, and the list of changes for the object (same format as postServerCall's changes), in that order.
## 3.1.0
* Cleaned up a lot of files with better error logging and formatting
* Added server validator function for remote functions. Within the remote decorator add another parameter for `serverValidation`, which takes an async function as a callback whose parameters are the controller and all other argument parameters for the remote function in the order that they are defined in the remote function's definition.
## 3.0.0
* Moving the targeted npm repository to @havenlife/semotus
* Made Supertype a peerDependency, indicating that it is the consuming application's responsibility to install semotus
## 2.5.2
* Fixed a bug where callIfValid still called the remote function if it wasn't valid
## 2.5.1
* only allow on server functions to be called directly from the client
## 2.5.0
* Adding the string of all the changes performed in a server call as parameter in the postServerCall callback
## 2.4.1
* Upgraded to Supertype 3.1.0
## 2.4.0
* Upgraded to Supertype 3.0.0 
## 2.3.15
* Quick fix for id collision/reuse issue on refresh of page
## 2.3.14
* No need to check session.objects[objId].__template__.__name__  when serializing and deserializing. 
* instanceof check should take care of this verification. has a dependency with Persistor@2.3.16.
## 2.3.13
* IE11 does not support for.. in loops with `const` or `let`. Changed those for loops to `var`.
## 2.3.12
* Support toClient and toServer filters on the properties
## 2.3.11
* removed unused function `injectIntoObject` and added a `package-lock.json`
## 2.3.10
* Fixed a `const` inside `_setupFunction` that was being reassigned.
## 2.3.9
* Enabled javascript's strict mode and changed all variable declarations to use let and const.
## 2.3.8
* Added error handling when the function to be called by callIfValid is not valid.
## 2.3.7
* Any validation failure now results in a session resyncronization.
## 2.3.6
* Fix to not set __changed__ flag for the objects when restoring the controller from the session
* if the controller expired in the cache
## 2.3.5
* Further fix (started in 2.3.2) to ensure array references for existing non-transient objects are recorded
* Fix to avoid accumulating \__referencedObjects\__ for transient objects to avoid serialization errors.
## 2.3.4
* Fixed issue where changes received in browser inadvertently turned around to server
## 2.3.3
* Detect changes from undefined -> [] for arrays
* Logging for serializeAndGarbageCollect
## 2.3.2
* Fix for transient values.
## 2.3.1
* Fix several issues with session handling.
## 2.3.0
* Support for TypeScript.
## 2.2.0
* For use with 2.2.0 of Amorphic that creates memSession in objectTemplate for blocking calls detection
## 2.1.1
* Fix for `getPendingCallCount` that was blocking zombie mode from activating.
## 2.1.0
* Include 2.1.0 supertype
## 2.0.1
* Fixed bug where __changed__ would be set for objects modified while __changeTracking__ off
## 2.0.0
* Noop refactor
## 1.4.1
* Include 1.4 supertype
## 1.4.0
* Compatibility change with not having templates available on client
## 1.3.2
* isVirtual Properties
## 1.2.8
* Enable data logging of data transmitted to the server
## 1.2.7
* Force __changed__ on objects when incoming arrays change
## 1.2.6
* Support for clearing pending calls
## 1.2.0
* Logging
## 1.1.0
## 1.0.3
* Added wrapper for disabling change tracking
## 1.0.2
* underscore missing
## 1.0.1
* No change
## 1.0.0-beta.3
* Fix in toServer, toClient handling
## 1.0.0-beta.1
* Garbage collection and template level toServer toClient attributes
## 0.2.16
* Allow values in extended classes to override base class
## 0.2.15
* Fix for blocking code to make it work with session serialization
## 0.2.14
* Delay on return of update conflicts and reduce count to 3.
## 0.2.13
* Ability to prevent overlapping calls when running with amorphic
## 0.2.12
* Added logging of response time and app level extra id info
## 0.2.11
* Added api to flag objects with __changed__ for referenced arrays that changed
## 0.2.09
* Data sync recovery was allowing two server requests to be processed simaltaneously
## 0.2.08
* Arrays not triggering changes
## 0.2.07
* Fixed __transient leak
* Pass an extra parameter to onPreServerCall to indicate a refresh should be done.
## 0.2.06
* Changes to set __changed__ when setters fire
## 0.2.05
* Don't pass in transaction to setDirty
## 0.1.33
* Temporary removed object stringify comparison on change detection as this is a breaking change that should be 2.x
## 0.2.04 (also released as 1.32)
* Fixed the error handling to permit recovery by client.js
## 0.2.03
* Added more tests and improved support for transactions in Amorphic
## 0.1.31 Beta
* Support for transactions
## 0.1.29
* Fix made in 0.1.28 caused entries to be deleted from the sesion.  Original problem fixed in persistor
## 0.1.28
* Transient objects were generating errors if an equivalent non-transient was in the session
## 0.1.27
* Added deleteSession
## 0.1.26
* Make sure receiving new objects does not cause extra changes to turn around to the server
## 0.1.25
* Fixed template mixup error
## 0.1.24
* Added security validators
## 0.1.23
* Fixed issue in array of objects
## 0.1.22
* Fixed issue in synchronization of new objects
## 0.1.21
* Fixed critical bugs in array syncronization
* Added support for Arrays of strings and other non-templated objects
## 0.1.20
* Don't track referenced arrays when _toClient/_toServer indicates that object not to be transmitted
## 0.1.19
* Return whether message processing actually has changes
## 0.1.18
* Supports preServerCall and postServerCall in controller
## 0.1.17
* Now synchronize objects whether referenced or not to avoid problems with ignored objects getting updated later.
* Support for transient objects which don't transmit to client
* Support for {toClient: true/false, toServer: true/false, name: template-name} in lieu of name on template.create
## 0.1.16
* Proper handling of boolean null values
* Proper handling of promises for server calls (could not have chained thens before)
## 0.1.13
* Did not handle case of setting an array to [] and then repopulating it with the identical results
