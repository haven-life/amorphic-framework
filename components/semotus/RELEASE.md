## 1.0.0-rc.1
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