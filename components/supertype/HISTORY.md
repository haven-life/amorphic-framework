## 3.3.1
* Npm audit for developer dependencies
## 3.3.0
* Moving Supertype to @havenlife/supertype in NPM
## 3.2.0
* Adding a statsd client property on base object template.
## 3.1.2
* Add amorphic context to the SupertypeLogger
## 3.1.1
* Making sure logging method can be customized
## 3.1.0
* Adding a public api to allow customization of supertype's logging functionality.
## 3.0.0
* Converted to typescript, added classes for Supertype, ObjectTemplate, added compilation step
* Added prepublish hook for compilation
* Updated Circle CI for tests
## 2.2.7
* Reverted cleanup for @supertypeClass({}) in index.js
## 2.2.6
* Removed unused function _injectIntoObject.
## 2.2.5
* Removed unused property __templateProps__.
## 2.2.4
* copyProperties function should be available on Supertype.
## 2.2.3
* Fix to controller name lookup to support minification.
## 2.2.2
* Fixed deserialization to preserve order of POJO
* Fixed injection issue
## 2.2.1
* Numerous fixes for typescript
* Added some missing typings like amorphicClass, amorphicClassName
* Updated several TypeScript tests.
* Support for minified code.
## 2.2.0
* Support for TypeScript.
## 2.1.2
* Added feature to allow `toClient` and `toServer` properties on an extended template.
## 2.1.1
* Fix to support IE with lazy template loading
## 2.1.0
* Support for lazy template loading.
## 2.0.1
* Fixed problem with multiple applications on toClient
## 2.0.0
* Noop refactor
## 1.5.1
* Fixed problem with list of app names for toClient rules
* Added objectTemplate.__usageMap__ for list of instantiated templates
## 1.5.0
* Fixed problem in clone where subtypes not being cloned properly
* Carry over toClient and toServer in intropected properties
## 1.4.9
* Reduced duplicate template names to warning rather than an error
## 1.4.8
* For new template scheme mixin duplicate extends or scream if they are different
* staticMixin capability
## 1.4.7
* Leave sourceTemplate on prototype[prop].templateSource and defineProperty[prop].sourceTemplate
## 1.4.6
* Support for mixing in templates
## 1.4.3
* Handle definitions of naked array values and undefined object types due to template files not being present in the browser (e.g. toClient: false)
* Bug in handling of toClientRuleSet
* Record __createProps__ in template for introspection purposes
* Record creation properties (.e.g. body, on, etc) for function definitions
## 1.4.2
* template.props was incorrect
## 1.4.1
* Fixed toClient setting which was incorrect
## 1.3.5
* Fixed clone to allow not cloning sclars and arrays
## 1.3.3
* Allow __values__ and __descriptions__ to be available in init functions
## 1.3.2
* Added isVirtual
## 1.3.0
* Added obj.__descriptions__ obj.__values__ and template.props
## 1.2.0
* Added bunyan style logging
## 1.1.0
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
