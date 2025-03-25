import DoLog from "../Logging/DoLog.js";

export default class FileLoader extends DoLog {
    constructor(log) {
        super(log, 'FileLoader> ');
    }

    async loadShader(shader_path) {
        const response = await fetch(shader_path);

        if (!response.ok) {
            this.LOG('Failed to load shader file: ' + shader_path, 'error');
            throw new Error('Failed to load file ' + shader_path + ':' + response.status + ' - ' + response.statusText);
        }

        const text = await response.text();

        return text;
    }
}