/**
 * Logger enums
 */
export namespace Enums {
    export enum Category {
        security = 'security',
        availability = 'availability',
        request = 'request',
        milestone = 'milestone'
    }

    export enum PiiLevelEnum {
        's1' = 's1',
        's2' = 's2',
        'nonPII' = 'non-pii'
    }

    export const enum GlobalHeader {
        HT_GLOBAL_ID = 'HT-Global-Id',
        HT_GLOBAL_SOURCE = 'HT-Global-Source'
    }
    
    export type GlobalHeaderType = {
        [key in GlobalHeader]?: string;
    }

    export const enum ServerType {
        express = 'express',
        restify = 'restify'
    }
}