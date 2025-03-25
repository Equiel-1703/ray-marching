import OutputLog from "../Logging/OutputLog.js";
import FileLoader from "../FileProcessing/FileLoader.js";

import { Color, WebGLUtils } from "../3DStuff/WebGLUtils.js";
import GraphicsMath from "../3DStuff/GraphicsMath.js";
import Vec4 from "../3DStuff/Vec4.js";
import Camera from "../3DStuff/Camera.js";

function initializeLog() {
    // Initializing log
    const log_div = document.getElementById('log_output');
    const log = new OutputLog(log_div);

    return log;
}

// ----------- GLOBAL PARAMETERS --------------
const FPS = 60;
const FPS_LIMIT = 1000 / FPS;
const CAMERA_SPEED = 6; // Camera speed (pixels per second)

const CLEAR_COLOR = new Color(0.4, 0.4, 0.4, 1.0); // Clear color (60% gray)

/** @type {OutputLog} */
let log = null;

/** @type {FileLoader} */
let file_loader = null;

/** @type {WebGLRenderingContext} */
let gl = null;

/** @type {WebGLUtils} */
let wgl_utils = null;

let program = null;
let camera = null;

// ----------- MAIN FUNCTION --------------
async function main() {
    log = initializeLog();

    // Initialize WebGL utils
    wgl_utils = new WebGLUtils(log);

    // WebGL initialization
    const canvas = document.getElementById('glcanvas');
    gl = wgl_utils.initializeWebGLContext(canvas);

    // Initializing FileLoader
    file_loader = new FileLoader(log);

    // Loading shaders code
    const v_shader = await file_loader.loadShader('shaders/VertexShader.glsl');
    const f_shader = await file_loader.loadShader('shaders/FragmentShader.glsl');

    log.success_log('main> Shaders code loaded.');

    // Creating shaders
    const vertex_shader = wgl_utils.createShader(gl.VERTEX_SHADER, v_shader);
    const fragment_shader = wgl_utils.createShader(gl.FRAGMENT_SHADER, f_shader);

    if (!vertex_shader || !fragment_shader) {
        throw new Error('Failed to create shaders.');
    }

    log.success_log('main> WebGL shaders created.');

    // Creating program
    program = wgl_utils.createProgram(vertex_shader, fragment_shader);

    if (!program) {
        throw new Error('Failed to create program.');
    }
    gl.useProgram(program);

    log.success_log('main> Program created.');

    // Creating perspective matrix
    const fov = 30;
    const aspect_ratio = canvas.width / canvas.height;
    const near = 0.1;
    const far = 1000;
    // TODO: Check if we need a projection matrix

    // Creating camera
    camera = new Camera(new Vec4(0, 0, -10, 1)); // By default, the camera is looking in the positive Z direction

    // Here I set that if the user presses the space bar, the camera stats will be logged
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            camera.logCameraStats(log);
        }
    });

    // ------------- Rendering -------------
    requestAnimationFrame(renderCallBack);
}

// ---------------------------------- RENDER SETUP ----------------------------------
function setupRender() {
    // I will create a square to fill the canvas
    // This will trigger the fragment shader for each pixel
    square_vertices = new Float32Array([
        -1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        1.0, 1.0, 0.0
    ]);

    // Set up the buffer
    const square_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, square_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, square_vertices, gl.STATIC_DRAW);

    const position_location = gl.getAttribLocation(program, 'a_position');
    gl.vertexAttribPointer(position_location, 3, gl.FLOAT, false, 0, 0);

    // Set image resolution
    gl.uniform2f(u_image_resolution, gl.canvas.width, gl.canvas.height);
}

// ---------------------------------- RENDER CALLBACK ----------------------------------
async function renderCallBack(s_time) {
    const u_camera_matrix = gl.getUniformLocation(program, 'u_camera_matrix');
    const u_image_resolution = gl.getUniformLocation(program, 'u_image_resolution');

    // Set camera matrix
    const camera_matrix = camera.getCameraMatrix();
    gl.uniformMatrix4fv(u_camera_matrix, false, camera_matrix);

    wgl_utils.clearCanvas(CLEAR_COLOR, gl);

    // Render the scene
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const end = performance.now();
    const elapsed = end - s_time;

    const diff = FPS_LIMIT - elapsed;

    // Update FPS counter in HTML
    document.getElementById('fps_counter').innerText = `FPS: ${Math.round(1000 / (elapsed + Math.abs(diff)))}`;

    const callback = () => {
        requestAnimationFrame(renderCallBack);
    }

    if (diff > 0) {
        setTimeout(callback, diff);
    } else {
        callback();
    }
}

main();