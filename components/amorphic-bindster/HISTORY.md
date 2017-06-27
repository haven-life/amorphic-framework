## 2.0.1
* Typescript typings
## 2.0.0
* Updaed dependency on supertype and other lint-related changes.
## 1.3.10
* Firefox selects which can end up with "null" as value
## 1.3.9
* Temporary fix to deal with IE select bug
## 1.3.8
* Changed data- prefix to bindster-
## 1.3.7
* Don't update selects when they have not changed
## 1.3.6
* Prevent __xxx__ props from being suppressed outside of mappers (revised)
## 1.3.5
* Parse results were not being fed into trigger
## 1.3.4
* Prevent node is not defined error
## 1.3.3
* Prevent __xxx__ props from being suppressed outside of mappers
## 1.3.2
* Made property lookup not throw errors
* Made value setting not dependent on controller in event handling
## 1.3.1
* Fixed broken event handler
* Added support for b:pleaseselect to have {} JS expression
## 1.3.0
* Asynchronous validation
* Remove support for xxxGet and xxxSet
## 1.1.0
* Added handling for value/descriptions in types plumbing through to selects
* Added the ability to iterate on scalar with values property in which case it iterates the values
* Added call-out to material_select to deal with materialize selects
## 1.0.3
* Make 1.0.2 work with IE
## 1.0.2
* PR for sort order
* fixed problem with not putting events on empty iterates
## 1.0.1
* No change
## 1.0.0-beta.2
* Fixed accidental typo
## 1.0.0-beta.1
* Going to semver convention
## 0.1.58
* __pending__ error not cleared with deferred set functions inside iterated blocks
## 0.1.57
* Radio buttons with null value would end up not repainting after iteration (clones)
## 0.1.56
* Make sure there are no duplicate events for subtle changes in event action
## 0.1.54
* Added wild card route
## 0.1.52
* Added support for single and mult-page hybrid apps using encoding of the paths
## 0.1.51
* Stop double-encoding URLS to prevent funny looking URLs
## 0.1.50
* Router updates urls for nested routes (e.g. popups) and restores them
* This allowed fixing a bug where sometimes a route would not be entered if it was already in the address bar
## 0.1.49
* Allow bindSet to be called when using controller level validation
* bindster_amorphic - don't override bindster or controller if already present
## 0.1.48
* Further fix to radio button cloning
* added controller.render for partial renders
## 0.1.46
* Added controller.isPending to determine whether a validation operation is pending server action
## 0.1.45
* Added controller.setIncludeURLSuffix to allow a suffix for URLs on include files to fix cache problems
## 0.1.42
* Offer ability to but don't enforce not refreshing if no new changes from server
## 0.1.42
* Don't refresh if no new changes from server
## 0.1.41
* Skip over field in "pending" state
## 0.1.40
* DOMSet did not work on radio buttons with false value
## 0.1.39
* Added focus setting for radio and checkbox
* Fixed problem introduced by 0.1.37
## 0.1.37
* Log errors
## 0.1.36
* Iterating groups of radio buttons caused them to get unchecked
## 0.1.35
* Allow changes to select text without disturbing what is selected
## 0.1.34
* Correction for bindster test framework
* Upgraded bindster test framework to make faster and more reliable
## 0.1.33
* Fixed a bug with Drop downs so that they display "Select..." as a list item
## 0.1.32
* Added bindster test framework
* Added loopiterate on iterate to get the ordinal of the filtered list
## 0.1.29
* Handling of radio buttons with variables as true value and validation for radio buttons for null values
## 0.1.28
* refresh to show the online loading message if implemented
## 0.1.27
* router.js  -Don't process lower level enter's if you route while processing a higher level enter
* bindster.js - Don't consider fields that are awaiting defered status to be errors for SetFocus purposes
## 0.1.25
* Added amorphic status
## 0.1.24
* Don't crush ver
## 0.1.23
* You can specify a node reference or id in controller.validate()
## 0.1.18
* Triggers were not being called for checkboxes
## 0.1.18
* Triggers were not being consistently called
## 0.1.16
* Included support for routing by id
## 0.1.14
* The user defined properties surfacing in the route passed to enter/exit no longer have a prefix of __
* nested: true is now available as a route property that specifies that the route is nested and does
not cause the current route to be exited (calling exit).  You can use router.popRoute() to restore 
the previous route
* You can pass parameters in the route function which are passed along to the enter function

## 0.1.13
* Fixed a problem where routes could not be re-initialized
* Added tests

