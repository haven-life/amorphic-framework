export let resultsBoth = [
    '{"client-Controller-1":{"karen":[null,"server-CustomerB-3"],"sam":[null,"server-CustomerA-2"],"ashling":[null,"server-Customer-4"]},"server-CustomerA-2":{"firstName":["Sam","Sam"],"middleName":["M","M"],"lastName":["Elsamman","Elsamman"],"roles":[["server-Role-13","server-Role-15"],["server-Role-13","server-Role-15"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-AddressA-5","server-AddressA-6"],["server-AddressA-5","server-AddressA-6"]],"referrers":[["server-Customer-4","server-CustomerB-3"],["server-Customer-4","server-CustomerB-3"]]},"server-Customer-4":{"firstName":["Ashling","Ashling"],"middleName":["",""],"lastName":["Burke","Burke"],"roles":[["server-Role-17"],["server-Role-17"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-Address-11"],["server-Address-11"]],"referredBy":["server-CustomerA-2","server-CustomerA-2"]},"server-CustomerB-3":{"firstName":["Karen","Karen"],"middleName":["M","M"],"lastName":["Burke","Burke"],"roles":[["server-Role-16"],["server-Role-16"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-AddressBFirstStage-7","server-AddressBFirstStage-8","server-AddressBSecondStage-9","server-AddressBSecondStage-10"],["server-AddressBFirstStage-7","server-AddressBFirstStage-8","server-AddressBSecondStage-9","server-AddressBSecondStage-10"]],"referredBy":["server-CustomerA-2","server-CustomerA-2"]},"server-AddressA-5":{"lines":[["500 East 83d","Apt 1E"],["500 East 83d","Apt 1E"]],"city":["New York","New York"],"state":["NY","NY"],"customer":["server-CustomerA-2","server-CustomerA-2"],"account":["server-Account-12","server-Account-12"]},"server-Account-12":{"transactions":[["server-Credit-18","server-Debit-19","server-Xfer-21"],["server-Credit-18","server-Debit-19","server-Xfer-21"]],"fromAccountTransactions":[["server-Xfer-22"],["server-Xfer-22"]],"roles":[["server-Role-13"],["server-Role-13"]],"address":["server-AddressA-5","server-AddressA-5"],"number":["1234","1234"],"title":[["Sam Elsamman"],["Sam Elsamman"]]},"server-AddressA-6":{"lines":[["38 Haggerty Hill Rd",null],["38 Haggerty Hill Rd",null]],"city":["Rhinebeck","Rhinebeck"],"state":["NY","NY"],"customer":["server-CustomerA-2","server-CustomerA-2"]},"server-Role-13":{"relationship":["primary","primary"],"customer":["server-CustomerA-2","server-CustomerA-2"],"account":["server-Account-12","server-Account-12"]},"server-Role-15":{"relationship":["primary","primary"],"customer":["server-CustomerA-2","server-CustomerA-2"],"account":["server-Account-14","server-Account-14"]},"server-Account-14":{"transactions":[["server-Credit-20","server-Xfer-22","server-Debit-23"],["server-Credit-20","server-Xfer-22","server-Debit-23"]],"fromAccountTransactions":[["server-Xfer-21"],["server-Xfer-21"]],"roles":[["server-Role-15","server-Role-16","server-Role-17"],["server-Role-15","server-Role-16","server-Role-17"]],"address":["server-AddressBFirstStage-7","server-AddressBFirstStage-7"],"number":["123","123"],"title":[["Sam Elsamman","Karen Burke","Ashling Burke"],["Sam Elsamman","Karen Burke","Ashling Burke"]]},"server-AddressBFirstStage-7":{"lines":[["500 East 83d","Apt 1E"],["500 East 83d","Apt 1E"]],"city":["New York","New York"],"state":["NY","NY"],"customer":["server-CustomerB-3","server-CustomerB-3"],"account":["server-Account-14","server-Account-14"]},"server-Address-11":{"lines":[["End of the Road",null],["End of the Road",null]],"city":["Lexington","Lexington"],"state":["KY","KY"],"customer":["server-Customer-4","server-Customer-4"]},"server-Role-17":{"relationship":["joint","joint"],"customer":["server-Customer-4","server-Customer-4"],"account":["server-Account-14","server-Account-14"]},"server-AddressBFirstStage-8":{"lines":[["38 Haggerty Hill Rd"],["38 Haggerty Hill Rd"]],"city":["Rhinebeck","Rhinebeck"],"state":["NY","NY"],"customer":["server-CustomerB-3","server-CustomerB-3"]},"server-AddressBSecondStage-9":{"lines":[["SomeRandom Address here"],["SomeRandom Address here"]],"city":["Town","Town"],"state":["HI","HI"],"customer":["server-CustomerB-3","server-CustomerB-3"]},"server-AddressBSecondStage-10":{"lines":[["Another random Address"],["Another random Address"]],"city":["Second","Second"],"state":["Hola","Hola"],"customer":["server-CustomerB-3","server-CustomerB-3"]},"server-Role-16":{"relationship":["joint","joint"],"customer":["server-CustomerB-3","server-CustomerB-3"],"account":["server-Account-14","server-Account-14"]}}',
    '{"client-Controller-1":{"karen":["server-CustomerB-3","server-CustomerB-25"],"sam":["server-CustomerA-2","server-CustomerA-24"],"ashling":["server-Customer-4","server-Customer-26"]},"server-CustomerA-24":{"firstName":["Sam","Sam"],"middleName":["M","M"],"lastName":["Elsamman","Elsamman"],"roles":[["server-Role-35","server-Role-37"],["server-Role-35","server-Role-37"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-AddressA-27","server-AddressA-28"],["server-AddressA-27","server-AddressA-28"]],"referrers":[["server-Customer-26","server-CustomerB-25"],["server-Customer-26","server-CustomerB-25"]]},"server-Customer-26":{"firstName":["Ashling","Ashling"],"middleName":["",""],"lastName":["Burke","Burke"],"roles":[["server-Role-39"],["server-Role-39"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-Address-33"],["server-Address-33"]],"referredBy":["server-CustomerA-24","server-CustomerA-24"]},"server-CustomerB-25":{"firstName":["Karen","Karen"],"middleName":["M","M"],"lastName":["Burke","Burke"],"roles":[["server-Role-38"],["server-Role-38"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-AddressBFirstStage-29","server-AddressBFirstStage-30","server-AddressBSecondStage-31","server-AddressBSecondStage-32"],["server-AddressBFirstStage-29","server-AddressBFirstStage-30","server-AddressBSecondStage-31","server-AddressBSecondStage-32"]],"referredBy":["server-CustomerA-24","server-CustomerA-24"]},"server-AddressA-27":{"lines":[["500 East 83d","Apt 1E"],["500 East 83d","Apt 1E"]],"city":["New York","New York"],"state":["NY","NY"],"customer":["server-CustomerA-24","server-CustomerA-24"],"account":["server-Account-34","server-Account-34"]},"server-Account-34":{"transactions":[["server-Credit-40","server-Debit-41","server-Xfer-43"],["server-Credit-40","server-Debit-41","server-Xfer-43"]],"fromAccountTransactions":[["server-Xfer-44"],["server-Xfer-44"]],"roles":[["server-Role-35"],["server-Role-35"]],"address":["server-AddressA-27","server-AddressA-27"],"number":["1234","1234"],"title":[["Sam Elsamman"],["Sam Elsamman"]]},"server-AddressA-28":{"lines":[["38 Haggerty Hill Rd",null],["38 Haggerty Hill Rd",null]],"city":["Rhinebeck","Rhinebeck"],"state":["NY","NY"],"customer":["server-CustomerA-24","server-CustomerA-24"]},"server-Role-35":{"relationship":["primary","primary"],"customer":["server-CustomerA-24","server-CustomerA-24"],"account":["server-Account-34","server-Account-34"]},"server-Role-37":{"relationship":["primary","primary"],"customer":["server-CustomerA-24","server-CustomerA-24"],"account":["server-Account-36","server-Account-36"]},"server-Account-36":{"transactions":[["server-Credit-42","server-Xfer-44","server-Debit-45"],["server-Credit-42","server-Xfer-44","server-Debit-45"]],"fromAccountTransactions":[["server-Xfer-43"],["server-Xfer-43"]],"roles":[["server-Role-37","server-Role-38","server-Role-39"],["server-Role-37","server-Role-38","server-Role-39"]],"address":["server-AddressBFirstStage-29","server-AddressBFirstStage-29"],"number":["123","123"],"title":[["Sam Elsamman","Karen Burke","Ashling Burke"],["Sam Elsamman","Karen Burke","Ashling Burke"]]},"server-AddressBFirstStage-29":{"lines":[["500 East 83d","Apt 1E"],["500 East 83d","Apt 1E"]],"city":["New York","New York"],"state":["NY","NY"],"customer":["server-CustomerB-25","server-CustomerB-25"],"account":["server-Account-36","server-Account-36"]},"server-Address-33":{"lines":[["End of the Road",null],["End of the Road",null]],"city":["Lexington","Lexington"],"state":["KY","KY"],"customer":["server-Customer-26","server-Customer-26"]},"server-Role-39":{"relationship":["joint","joint"],"customer":["server-Customer-26","server-Customer-26"],"account":["server-Account-36","server-Account-36"]},"server-AddressBFirstStage-30":{"lines":[["38 Haggerty Hill Rd"],["38 Haggerty Hill Rd"]],"city":["Rhinebeck","Rhinebeck"],"state":["NY","NY"],"customer":["server-CustomerB-25","server-CustomerB-25"]},"server-AddressBSecondStage-31":{"lines":[["SomeRandom Address here"],["SomeRandom Address here"]],"city":["Town","Town"],"state":["HI","HI"],"customer":["server-CustomerB-25","server-CustomerB-25"]},"server-AddressBSecondStage-32":{"lines":[["Another random Address"],["Another random Address"]],"city":["Second","Second"],"state":["Hola","Hola"],"customer":["server-CustomerB-25","server-CustomerB-25"]},"server-Role-38":{"relationship":["joint","joint"],"customer":["server-CustomerB-25","server-CustomerB-25"],"account":["server-Account-36","server-Account-36"]}}'
]

export let resultsAppB = [
    '{"client-Controller-1":{"karen":[null,"server-CustomerB-3"],"sam":[null,"server-CustomerA-2"],"ashling":[null,"server-Customer-4"]},"server-Customer-4":{"firstName":["Ashling","Ashling"],"middleName":["",""],"lastName":["Burke","Burke"],"roles":[["server-Role-17"],["server-Role-17"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-Address-11"],["server-Address-11"]],"referredBy":["server-CustomerA-2","server-CustomerA-2"]},"server-CustomerB-3":{"firstName":["Karen","Karen"],"middleName":["M","M"],"lastName":["Burke","Burke"],"roles":[["server-Role-16"],["server-Role-16"]],"type":["primary","primary"],"secondaryReferrers":[[],[]],"addresses":[["server-AddressBFirstStage-7","server-AddressBFirstStage-8","server-AddressBSecondStage-9","server-AddressBSecondStage-10"],["server-AddressBFirstStage-7","server-AddressBFirstStage-8","server-AddressBSecondStage-9","server-AddressBSecondStage-10"]],"referredBy":["server-CustomerA-2","server-CustomerA-2"]},"server-Address-11":{"lines":[["End of the Road",null],["End of the Road",null]],"city":["Lexington","Lexington"],"state":["KY","KY"],"customer":["server-Customer-4","server-Customer-4"]},"server-Role-17":{"relationship":["joint","joint"],"customer":["server-Customer-4","server-Customer-4"],"account":["server-Account-14","server-Account-14"]},"server-Account-14":{"transactions":[["server-Credit-20","server-Xfer-22","server-Debit-23"],["server-Credit-20","server-Xfer-22","server-Debit-23"]],"fromAccountTransactions":[["server-Xfer-21"],["server-Xfer-21"]],"roles":[["server-Role-15","server-Role-16","server-Role-17"],["server-Role-15","server-Role-16","server-Role-17"]],"address":["server-AddressBFirstStage-7","server-AddressBFirstStage-7"],"number":["123","123"],"title":[["Sam Elsamman","Karen Burke","Ashling Burke"],["Sam Elsamman","Karen Burke","Ashling Burke"]]},"server-AddressBFirstStage-7":{"lines":[["500 East 83d","Apt 1E"],["500 East 83d","Apt 1E"]],"city":["New York","New York"],"state":["NY","NY"],"customer":["server-CustomerB-3","server-CustomerB-3"],"account":["server-Account-14","server-Account-14"]},"server-AddressBFirstStage-8":{"lines":[["38 Haggerty Hill Rd"],["38 Haggerty Hill Rd"]],"city":["Rhinebeck","Rhinebeck"],"state":["NY","NY"],"customer":["server-CustomerB-3","server-CustomerB-3"]},"server-AddressBSecondStage-9":{"lines":[["SomeRandom Address here"],["SomeRandom Address here"]],"city":["Town","Town"],"state":["HI","HI"],"customer":["server-CustomerB-3","server-CustomerB-3"]},"server-AddressBSecondStage-10":{"lines":[["Another random Address"],["Another random Address"]],"city":["Second","Second"],"state":["Hola","Hola"],"customer":["server-CustomerB-3","server-CustomerB-3"]},"server-Role-16":{"relationship":["joint","joint"],"customer":["server-CustomerB-3","server-CustomerB-3"],"account":["server-Account-14","server-Account-14"]}}',
    '{"client-Controller-1":{"karen":[null,"server-CustomerB-4"],"sam":[null,"server-CustomerA-3"],"ashling":[null,"server-Customer-5"]},"server-CustomerB-4":{"firstName":[null,"Karen"],"middleName":[null,"M"],"lastName":[null,"Burke"],"roles":[null,["server-Role-17"]],"type":[null,"primary"],"secondaryReferrers":[null,[]],"addresses":[null,["server-AddressBFirstStage-8","server-AddressBFirstStage-9","server-AddressBSecondStage-10","server-AddressBSecondStage-11"]],"referredBy":[null,"server-CustomerA-3"]},"server-Customer-5":{"firstName":[null,"Ashling"],"middleName":[null,""],"lastName":[null,"Burke"],"roles":[null,["server-Role-18"]],"type":[null,"primary"],"secondaryReferrers":[null,[]],"addresses":[null,["server-Address-12"]],"referredBy":[null,"server-CustomerA-3"]},"server-AddressBSecondStage-10":{"lines":[null,["SomeRandom Address here"]],"city":[null,"Town"],"state":[null,"HI"],"customer":[null,"server-CustomerB-4"]},"server-AddressBSecondStage-11":{"lines":[null,["Another random Address"]],"city":[null,"Second"],"state":[null,"Hola"],"customer":[null,"server-CustomerB-4"]},"server-Address-12":{"lines":[null,["End of the Road",null]],"city":[null,"Lexington"],"state":[null,"KY"],"customer":[null,"server-Customer-5"]},"server-Account-13":{"transactions":[null,["server-Credit-19","server-Debit-20","server-Xfer-22"]],"fromAccountTransactions":[null,["server-Xfer-23"]],"roles":[null,["server-Role-14"]],"address":[null,"server-AddressA-6"],"number":[null,"1234"],"title":[null,["Sam Elsamman"]]},"server-Role-14":{"relationship":[null,"primary"],"customer":[null,"server-CustomerA-3"],"account":[null,"server-Account-13"]},"server-Account-15":{"transactions":[null,["server-Credit-21","server-Xfer-23","server-Debit-24"]],"fromAccountTransactions":[null,["server-Xfer-22"]],"roles":[null,["server-Role-16","server-Role-17","server-Role-18"]],"address":[null,"server-AddressBFirstStage-8"],"number":[null,"123"],"title":[null,["Sam Elsamman","Karen Burke","Ashling Burke"]]},"server-Role-16":{"relationship":[null,"primary"],"customer":[null,"server-CustomerA-3"],"account":[null,"server-Account-15"]},"server-Role-17":{"relationship":[null,"joint"],"customer":[null,"server-CustomerB-4"],"account":[null,"server-Account-15"]},"server-Role-18":{"relationship":[null,"joint"],"customer":[null,"server-Customer-5"],"account":[null,"server-Account-15"]},"server-Credit-19":{"account":[null,"server-Account-13"],"type":[null,"credit"],"amount":[null,"100"]},"server-Debit-20":{"account":[null,"server-Account-13"],"type":[null,"debit"],"amount":[null,"50"]},"server-Credit-21":{"account":[null,"server-Account-15"],"type":[null,"credit"],"amount":[null,"200"]},"server-Xfer-22":{"account":[null,"server-Account-13"],"type":[null,"xfer"],"amount":[null,"100"],"fromAccount":[null,"server-Account-15"]},"server-Xfer-23":{"account":[null,"server-Account-15"],"type":[null,"xfer"],"amount":[null,"50"],"fromAccount":[null,"server-Account-13"]},"server-Debit-24":{"account":[null,"server-Account-15"],"type":[null,"debit"],"amount":[null,"25"]}}'
]

