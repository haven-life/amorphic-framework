## 0.1.27
* Added an id qualifier from .fromJSON so as not to have id conflicts when restoring "copies" of objects
## 0.1.26
* Don't call init when an object is created that already has an id since init was at some point called
## 0.1.22
* !! Naming convention changed such that collection:name is replaced by just name
## 1.13
Added ObjectTemplate.getTemplateByName(name)