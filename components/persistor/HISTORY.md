## 2.3.16
* getObjectId should only use template name when generating the object ids for the objects loaded from the database.
## 2.3.15
* clean up various files based on eslint rules
## 2.3.14
* removed unused function injectIntoObject
## 2.3.13
* setAsDeleted is exposed on persistable objects.
* pegged knex version.
* Fixed promise issues with adding comment logic.
## 2.3.12
* Including return to make promise calls to wait when adding comments.
## 2.3.11
* Fixed sync tables issue, should not synchronize query templates when schema contains entry to the real templates.
## 2.3.10
* Modified order parameter parsing logic in persistorFetchByQuery.
## 2.3.9
* Fixed change tracking issue for reference types.
## 2.3.8
* Added column name to the change tracking list.
* one-to-one relations also track the changes.
## 2.3.7
* append schema context issue fixed
## 2.3.6
* changetracking flag must be passed to subqueries.
* Promise issue fixed for process save and delete functions.
## 2.3.5
* Save should convert the object types properly.
* notifyChanges schema changes to accept null and undefined values.
## 2.3.4
* Change tracking cleanup.
## 2.3.3
* Modified changing tracking structure
* change tracking flag has been moved to the template level.
* Fixed date and object types comparison issues.
* Any changes to the transaction object from the change tracking
*   callback will be reprocessed.
## 2.3.2
* New feature to allow private modules to append the schema entries.
## 2.3.1
* Fixed error message to include the property name when changing the types.
* Fixed to check for Persistor property when looking for the status of the object in cache.
## 2.3.0
* Adding change tracking feature.
## 2.2.6
* Fixed fetch spec validation.
## 2.2.5
* Fixed fetch spec validation to consider the complete object hierarchy.
## 2.2.4
* Fix error that could lead to duplicate objects being created.
## 2.2.3
* Fixed object injections to get the right objectTemplate
## 2.2.2
* Fixes for syncronization of schema.
## 2.2.1
* Support for the most recent version of knex.
## 2.2.0
* Support for TypeScript.
## 2.1.1
* Pegged knex version because knex latest breaks us.
## 2.1.0
* Add support for Lazy Template Loading
## 2.0.0
* Added new API
* Refactor
## 1.4.3
* Create table comments in Postgres on new tables as well as modifications
## 1.4.2
* Don't crap if foreign key deleted
## 1.4.0
* Changes to be compatible with templateMode: auto
## 1.3.4
* Fixed column change notification
## 1.3.2
* Corrected problem with comments on mixed case tables
## 1.3.1
* Added schema comments for PG
## 1.2.2
* Filter queries no longer need unique types for all sub-ordinate objects
## 1.2.0
* New logging
## 1.1.1
## 1.1.0
* Changed version tracking pattern
## 1.0.8
* Added data logging
## 1.0.7
* Fixed problem where we were not always waiting for nested results
## 1.0.6
* Filtering on the _template property was failing
## 1.0.5
* Put change tracking reset in .finally()
* Don't using _template to drive class for subSetOf templates
## 1.0.4
* Tweaks for no database case
## 1.0.3
* Don't process schema when there is not one
## 1.0.2
* Eliminate duplicate indexing of schema
## 1.0.1
* (srksag pr) corrections to table sync
## 1.0.0-rc.1
* (srksag pr) index synchronization happens at the table level
* (srksag pr) DDL changes are part of transaction
* Refreshing while passing in a map ignored processing if object being refreshed was in the map
* Added nojoin as a parameter at the same level as fetch: in cascade fetch specs
## 1.0.0-beta-6
* Fixed serious bug where one-to-one relationships would get nulled out on refresh if the refresh made them point to a different object
## 1.0.0-beta-5
* Fixed issue converting types on filtered consolidation
## 1.0.0-beta.4
* Added consolidation of children that are in same table with different filter criteria
## 1.0.0-beta.3
* Added serialization of reads to avoid overruning pool
* Added consolidation of duplicate queries
## 1.0.0-beta.1
* moving to symver style of number for next round of changes
## 0.2.86
* Corrected synchrnonization of schema when properties added to extended templates
## 0.2.85
* Handling of setting null values
## 0.2.84
* Incorrect logging of errors on txn end
## 0.2.83
* minor logging changes
## 0.2.80
* minor logging changes
## 0.2.79
* Improved logging on end()
* Optimized index creation to only create indexes on one-to-many relationships
## 0.2.78
* Allow fetches specs in API specified as false to override.
## 0.2.77
* Syncrhonization broken on an empty database in previous release
## 0.2.76
* Don't fetch just because of an existing object relationship, fetches must be specified in spec
## 0.2.74
* Eliminate duplicate indexes
## 0.2.73
* Correction to schema management
## 0.2.72
* Handle deadlocks as update conflicts
## 0.2.71
* Merged pull request for table sync
## 0.2.70
* Defensive code against null elements in arrays
* Added call to MarkChangedArrayReferences when running with Semotus
* Changed default persistor to fetch: false
## 0.2.69
* Robust logging via objectTemplate.debugInfo = "io;api"
## 0.2.68
* Changed the id mapping works in a way that eliminates is dual function as an extra cache
## 0.2.66
* Fixed problem that broke Mongo
## 0.2.65
* Made persistor prop touching compatible with new semotus
* changed Number type to Double Precision
## 0.2.64
* Removed logging
## 0.2.63
* Fixed touch top object logic
## 0.2.62
* Improve boolean type conversion on Mongo
## 0.2.61
* Changed the updates to always fill in parent pointers for child relationships
## 0.2.59
* fully force refreshes
## 0.2.57
* More robust boolean handling in Mongo
* Support for enumurating persistor properties for amorphic
## 0.2.56
* Fixed situation where setting filter types could fail to write out
## 0.2.55
* Merge schema for subsets
## 0.2.54
* Preserve sort order which was broken
* Added limit and offset
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



