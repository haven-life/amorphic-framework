## 0.1.45
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



