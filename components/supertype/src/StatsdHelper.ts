import { SupertypeSession } from './index';

// format for hrtime
// https://nodejs.org/api/process.html#process_process_hrtime_time
type hrTime = [number, number];

/**
 * mostly static utility functions to assist supertype in handling statsd operations
 */
export class StatsdHelper {

    /**
     * convert node time format hrtime to milliseconds
     * @param {hrTime} hrTime
     * @returns {number}
     */
    public static convertHRTimeToMilliseconds(hrTime: hrTime): number {
        return hrTime[0] * 1000 + hrTime[1] / 1000000;
    }

    /**
     * given a start time and a key, record the total amount of time and send stat info.
     * @param {hrTime} hrTimeStart
     * @param {string} statsKey
     * @param tags
     */
    public static computeTimingAndSend(hrTimeStart: hrTime, statsKey: string, tags?): void {
        const statsdClient = SupertypeSession.statsdClient;

        if(statsdClient
            && statsdClient.timing
            && typeof statsdClient.timing === 'function') {

            const timerEndTime = process.hrtime(hrTimeStart);
            const totalTimeInMilliseconds = this.convertHRTimeToMilliseconds(timerEndTime);
            statsdClient.timing(statsKey, totalTimeInMilliseconds, tags);
        }
    }
}