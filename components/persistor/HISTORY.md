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



