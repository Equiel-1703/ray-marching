import DoLog from "../Logging/DoLog.js";

export class Color {
    constructor(r, g, b, a = 1.0) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    getRGBA() {
        return new Float32Array([this.r, this.g, this.b, this.a]);
    }
}

export class WebGLUtils extends DoLog {
    #gl = null;

    static #WUtilsInstance = 0;

    constructor(log) {
        super(log, `WebGLUtils[${WebGLUtils.#WUtilsInstance++}]> `);
    }

    initializeWebGLContext(canvas) {
        let gl = canvas.getContext('webgl2');

        if (!gl) {
            this.LOG('WebGL2 not supported, falling back on experimental-webgl.', 'warning');
            gl = canvas.getContext('experimental-webgl');

            if (!gl) {
                this.LOG('Your browser does not support WebGL2.', 'error');
                throw new Error('WebGL2 not supported.');
            }
        }

        this.LOG('WebGL2 is supported and the context was created.', 'success');

        this.#gl = gl;
        return gl;
    }

    clearCanvas(color, gl = this.#gl) {
        gl.clearColor(color.r, color.g, color.b, color.a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    createShader(type, source, gl = this.#gl) {
        let shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            this.LOG('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader), 'error');
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createProgram(vertex_shader, fragment_shader, gl = this.#gl) {
        const prg = gl.createProgram();

        gl.attachShader(prg, vertex_shader);
        gl.attachShader(prg, fragment_shader);

        gl.linkProgram(prg);
        if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
            this.LOG('An error occurred linking the program: ' + gl.getProgramInfoLog(prg), 'error');
            gl.deleteProgram(prg);
            return null;
        }

        gl.validateProgram(prg);
        if (!gl.getProgramParameter(prg, gl.VALIDATE_STATUS)) {
            this.LOG('An error occurred validating the program: ' + gl.getProgramInfoLog(prg), 'error');
            gl.deleteProgram(prg);
            return null;
        }

        this.LOG('The program was successfully created, linked and validated.', 'success');

        // Now we can detach and delete the shaders to free up memory in the GPU
        gl.detachShader(prg, vertex_shader);
        gl.detachShader(prg, fragment_shader);
        gl.deleteShader(vertex_shader);
        gl.deleteShader(fragment_shader);

        return prg;
    }
}