export type ErrorType = 'error' | 'retry' | 'response';
export type ChangeString = { [key: string]: string };
export type PreServerCallChanges = { [key: string]: boolean };

export type ControllerResponse = {
    status: number;
    headers?: {
        location: string;
        'Content-Type'?: string;
    }
    body?: any;
};
export type CallContext = { retries: number; startTime: Date };


export type OldValue = string | null | undefined;
export type NewValue = string | null | undefined;
export type Values = [OldValue, NewValue];

/**
 * 
 * type of the list of changes coming from the client
 * 
 */
export type Changes = { [objId: string]: { [propertyName: string]: Values } }