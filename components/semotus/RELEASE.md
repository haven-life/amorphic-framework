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