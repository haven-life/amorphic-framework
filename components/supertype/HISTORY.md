## 1.0.4
* Abstract function for semotus
## 1.0.3
* __toClient__ __toServer__ now setup correctly on browser as well
## 1.0.2
* Added objectTemplate.templateInterceptor("extend"/"create"/"mixin", name, properties);
## 1.0.1
* No change
## 1.0.0-beta.1
* Better support for excluding from the browse
## 0.1.46
* Allow functions for __isLocal__ on templates
## 0.1.45
* Handle overriding of values in extended classes
## 0.1.44
* Allow pojo to be passed into creator callback
## 0.1.43
* Was converting null to init value when reconstituting objects
## 0.1.42
* Don't copy __version__ on copyObject to avoid update conflicts
## 0.1.41
* fixed a problem where getters were getting called as templates were being defined
## 0.1.40
* support for getters and setters
## 0.1.39
* restore __changed__ internal property
## 0.1.38
* Allow replacer in toJSONSTring
## 0.1.37
* Allow mixin to override properties
## 0.1.36
* fromJSON string was not handling references properly when using an id prefix
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