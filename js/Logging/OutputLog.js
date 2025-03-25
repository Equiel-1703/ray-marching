export default class OutputLog {
    constructor(log_div) {
        this.log_div = log_div;
    }

    log(message) {
        const new_p = document.createElement('p');
        new_p.textContent = message;
        this.log_div.appendChild(new_p);
    }

    error_log(message) {
        const new_p = document.createElement('p');
        new_p.textContent = message;
        new_p.style.color = 'red';
        this.log_div.appendChild(new_p);
    }

    success_log(message) {
        const new_p = document.createElement('p');
        new_p.textContent = message;
        new_p.style.color = 'green';
        this.log_div.appendChild(new_p);
    }

    warning_log(message) {
        const new_p = document.createElement('p');
        new_p.textContent = message;
        new_p.style.color = 'orange';
        this.log_div.appendChild(new_p);
    }
}