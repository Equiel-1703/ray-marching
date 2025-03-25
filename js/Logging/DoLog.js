export default class DoLog {
    outputLog = null;
    #prefix = '';
    
    constructor(log, prefix) {
        this.outputLog = log;
        this.#prefix = prefix;
    }

    LOG(message, type = 'log') {
        if (!this.outputLog) {
            return;
        }

        switch (type) {
            case 'success':
                this.outputLog.success_log(this.#prefix + message);
                break;
            case 'warning':
                this.outputLog.warning_log(this.#prefix + message);
                break;
            case 'error':
                this.outputLog.error_log(this.#prefix + message);
                break;
            default:
                this.outputLog.log(this.#prefix + message);
        }
    }
}