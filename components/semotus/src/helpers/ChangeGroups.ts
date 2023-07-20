import { ArrayGroup, ArrayTypes, ChangeGroup, Semotus } from './Types';
import * as Subscriptions from './Subscriptions';
export const Change = 'change';

export function get(type: 'change' | ArrayTypes, subscriptionId, semotus: Semotus): ChangeGroup | ArrayGroup {
    const subscription = Subscriptions.getSubscription(semotus, subscriptionId);
    return subscription.log[type];
}

/**
 * Gets Property change groups (non-array)
 *
 * @param subscriptionId
 * @param semotus
 */
export function getPropChangeGroup(subscriptionId, semotus: Semotus): ChangeGroup {
    return get(Change, subscriptionId, semotus) as ChangeGroup;
}

/**
 * Gets Array Change Groups
 *
 * @param type
 * @param subscriptionId
 * @param semotus
 */
export function getArrayChangeGroup(type: ArrayTypes, subscriptionId, semotus: Semotus): ArrayGroup {
    return get(type, subscriptionId, semotus) as ArrayGroup;
}


/**
 * Remove a change group from a subscription
 *
 * @param type
 * @param subscriptionId unknown
 * @param semotus
 */
export function remove(type: string, subscriptionId, semotus: Semotus) {
    Subscriptions.getSubscription(semotus, subscriptionId).log[type] = {};
}


/**
 * Remove all change groups from a subscription with given type
 * @param type
 * @param semotus
 *
 * @private
 */
export function removeAll(type: string, semotus: Semotus) {
    for (const subscription in Subscriptions.getSubscriptions(semotus)) {
        remove(type, subscription, semotus);
    }
}