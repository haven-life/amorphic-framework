export type PropertyChanges = { name: string, originalValue: string, newValue: string, columnName: string } | {};
export type ObjectChanges = { table: string, primaryKey: string, action: string, properties: PropertyChanges[] } | {};
export type ChangeTracking = { [name: string]: ObjectChanges[] };
export type Objects = { [obj: string]: any };