## 0.2.53
* Nested dirty sets were not working
## 0.2.52
* Fixed some flaws in 2.50
* Added support for PersistObjectTemplate.objectMap = {} to prevent object __id__ values from changing when refetched
* Fixed refresh
## 0.2.50
* self-referential entities not getting a persistor (still needs to be addressed in amorphic)
* changed the way recursive fetches protects against infinite recursion so fetch specs fully honored
## 0.2.49
* Remove from dirty list objects deleted in a transaction with object.persistDelete
* Implemented pruneOrphans to ensure orphans in a one-to-many relationship disappear
## 0.2.48
* Added support for filtered collections
## 0.2.47
* SetDirty defaults to not cascade
## 0.2.45
* You must set PersistObjectTemplate.enableOrphanHookups to set dangling parent pointers
* Optimize not reprocessing duplicately fetched entities
*** Note that this feature means you have to replicate fetch specs for all paths to an object
* Correct touching of top object only for changed objects
## 0.2.40
* object.cascadeSave
## 0.2.39
* Handling of null values
* Automatically index foreign keys
## 0.2.35
* Fixed cascading saves on dirty
* Fixed subclass properties on query 
* Transaction support in delete
## 0.2.34
* Superclasses now to fetch all columns
## 0.2.32
* Support for native joins
## 0.2.30
* Added alias to native knex support
* Added limited regex support
## 0.2.29
* Added native knex support
## 0.2.28
* Fixed $nin conversion
## 0.2.27
* Fixed change tracking
## 0.2.25
* Changed default table inheritence
## 0.2.24
* Numerous changes around dirty tracking and foreign key handling
## 0.2.23
* support for query objects using subsetOf in schema
* clean up parent pointers on cascade save for the benefit of data conversions
## 0.2.22
* Inherit collection and table for subclasses with a schema
## 0.2.21
* Use __table__ rather than __schema__ in knex to allow schema to be dual-purposed
## 0.2.20
* Updated boolean handling
## 0.2.18
* was attempting to join relations in local references
## 0.2.17
* More fixes to cascade save
## 0.2.16
* Fixes to cascade save
## 0.2.14
* fixes to fetch
## 0.2.13
* removed saved from object which was conflicting with application data
* fixes to deleteFromPersistWithQuery
* fixes to fetch
## 0.2.12
* Added an isKnex method to template
* Allow table to override forcing subclasses into parent tables
## 0.2.11
* Fixed cascade save option 
## 0.2.09
* Changed from string to text for column types
* Allow column to be overridden in sub-class
## 0.2.08
* Fixed error message when missing schema entries during table sync
* Increased size of schema entry
## 0.2.07
* Cleaned up dependencies
## 0.2.06
* Added support for getPOJOFromQuery
## 0.2.05
* Further updates for knex support
## 0.2.00
* Alpha support for knex
## 0.1.79
* Add actual template name to the id of an object to allow for different classes reading an object
## 0.1.78
* Fixed problem introduced in 1.77
## 0.1.77
* Allow get/fetch by forcing queryOptions in model
## 0.1.75
* Update conflicts were resetting the version number meaning that the second time they would succeed
## 0.1.74
* Alias feature to allow duplicate templates for same collection
* Fixes to getFromPersistWithQuery for subdocuments
## 0.1.73
* Don't create persistors for schemaless templates
## 0.1.72
* When creating transient objects don't reset transient flag for fetchProperty
## 0.1.71
* When creating persistor properties preserve toClient/toServer settings from original property
## 0.1.69
* Fixed 0.1.64 fix
## 0.1.65
* Added logging for orphaned sub-documents
## 0.1.64
* Patch for sorting and also making cascades work properly for sub-doc queries
## 0.1.63
* Throw Update Conflict errors
## 0.1.62
* Saving other than top object would fail if parent pointer was not first property
## 0.1.61
* Optimization to not do duplicate processing
## 0.1.60
* Revamped sub-doc handling such that sub-doc fetches in same doc happen only with crossDocument: true on  the
  children: and parent: schema properties
* Added transient parameter to queries for the benefit of semotus
## 0.1.56
* Problem referencing one-to-many of cross-document sub-documents to documents 
## 0.1.55
* Allow query options and querys in .fetch call 
## 0.1.53
* Case of cross-document references could lead to two separate objects of the same id
## 0.1.52
* Make sure duplicate peristors are not injected
## 0.1.51
* Fixed propFetch() to honor fetch parameters
* made cascade fetch pass through one-to-many relationships
* fixed more subdocument cases
## 0.1.49
* Fixed subdocument case that was broken in 0.1.46
## 0.1.46
* Added tests to ensure that init is not called on fetch
## 0.1.44
* Fixed a problem where sub-documents would not be found if multiple paths to them
## 0.1.43
* Fixed problem with closure introduce in 0.1.42 for sub-doc refs
## 0.1.42
* Treat sub-documents more transparently by allowing cross-collection links of sub-documents and direct query of them
## 0.1.33
* !! Changed the format of schemas (see persist_banking.js)
## 0.1.26
* Added error for saving an untemplated object

## 0.1.25
* Was not handling case where references in same collection were not sub-documents because they had a schema children reference

## 0.1.23
* Persistor object changes were not being synchronized resulting in extra callse to propFetch methods

## 0.1.22
* Made code not dependent on order of properties
* Make sure data retrieved with older version accounts for changes in the way template names are now



