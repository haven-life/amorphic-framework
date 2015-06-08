## 0.1.35
* createCopy() now prevents calling init on cloned objects
## 0.1.34
* Fixes to createCopy()
## 0.1.33
* Added createCopy() to intelligently clone a portion of an object graph
## 0.1.30
* Handling of __transient__ for semotus
## 0.1.29
* When de-serializing include __version__ if present in pojo
## 0.1.28
* Added some additional error detail
* Support for encoding toServer/toClient properties for the benefit of semotus
## 0.1.27
* Added an id qualifier from .fromJSON so as not to have id conflicts when restoring "copies" of objects
## 0.1.26
* Don't call init when an object is created that already has an id since init was at some point called
## 0.1.22
* !! Naming convention changed such that collection:name is replaced by just name
## 1.13
Added ObjectTemplate.getTemplateByName(name)