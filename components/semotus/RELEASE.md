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