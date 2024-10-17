export class Logger {
    constructor(private silent: boolean) {}

    public log(message?: any, ...optionalParams: any[]): void {
        if (!this.silent) {
            if (optionalParams.length == 0) {
                console.log(message);
            } else {
                console.log(message, optionalParams);
            }
        }
    }
}
