export interface StatsdClientInterface {
    timing(statsKey: string, timer: number | Date, tags?: object): void,
    counter(statsKey: string, num: number, tags?: object): void
}