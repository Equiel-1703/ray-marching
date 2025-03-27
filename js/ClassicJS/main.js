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
const FPS = 30;
const FRAME_RENDER_LIMIT = 1000 / FPS; // Frame render limit (in milliseconds)
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

/** @type {Camera} */
let camera = null;

/** @type {WebGLProgram} */
let program = null;

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
    // TODO: Check if we really need a projection matrix

    // Creating camera
    camera = new Camera(new Vec4(0, 0, -50, 1)); // By default, the camera is looking in the positive Z direction

    // Here I set that if the user presses the space bar, the camera stats will be logged
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            camera.logCameraStats(log);
        }
    });

    // ------------- Rendering -------------
    setupRender();
    requestAnimationFrame(renderCallBack);
}

// ---------------------------------- RENDER SETUP ----------------------------------
let camera_animation_path = [];

function setupRender() {
    // I will create a square to fill the canvas
    // This will trigger the fragment shader for each pixel
    const square_vertices = new Float32Array([
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0
    ]);

    // Set up the buffer
    const square_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, square_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, square_vertices, gl.STATIC_DRAW);

    // Set up the vertex attribute
    const position_location = gl.getAttribLocation(program, 'a_position');
    gl.vertexAttribPointer(position_location, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position_location);

    // Set image resolution
    const u_image_resolution = gl.getUniformLocation(program, 'u_image_resolution');
    gl.uniform2f(u_image_resolution, gl.canvas.width, gl.canvas.height);

    // Set camera path
    camera_animation_path = [
        { position: new Vec4(0, 50, -200, 1), target: new Vec4(0, -0.5, 1, 1) },
        { position: new Vec4(0, 50, -150, 1), target: new Vec4(0, -0.3, 1, 1) },
        { position: new Vec4(20, 50, -120, 1), target: new Vec4(0, -0.3, 1, 1) },
        { position: new Vec4(30, 50, -120, 1), target: new Vec4(0, -0.2, 1, 1) },

        { position: new Vec4(40, 50, -100, 1), target: new Vec4(0, -0.2, 1, 1) },
        { position: new Vec4(50, 50, -80, 1), target: new Vec4(0, -0.1, 1, 1) },
        { position: new Vec4(60, 50, -60, 1), target: new Vec4(0, -0.1, 1, 1) },
        { position: new Vec4(70, 50, -40, 1), target: new Vec4(0, -0.05, 1, 1) },

        { position: new Vec4(50, 50, -20, 1), target: new Vec4(0, -0.05, 1, 1) },
        { position: new Vec4(40, 50, -30, 1), target: new Vec4(0, -0.01, 1, 1) },
        { position: new Vec4(20, 50, -50, 1), target: new Vec4(0, -0.01, 0.5, 1) },
        { position: new Vec4(10, 50, -70, 1), target: new Vec4(0.5, -0.01, 1, 1) },

        { position: new Vec4(0, 50, -90, 1), target: new Vec4(0, -0.2, 1, 1) },
        { position: new Vec4(0, 50, -130, 1), target: new Vec4(0, -0.2, 1, 1) },
        { position: new Vec4(0, 50, -160, 1), target: new Vec4(0, -0.2, 1, 1) },
        { position: new Vec4(0, 50, -200, 1), target: new Vec4(0, -0.5, 1, 1) },

        { position: new Vec4(0, 50, -200, 1), target: new Vec4(0, -0.5, 1, 1) },
        { position: new Vec4(0, 50, -200, 1), target: new Vec4(0, -0.5, 1, 1) },
        { position: new Vec4(0, 50, -150, 1), target: new Vec4(0, -0.3, 1, 1) },
        { position: new Vec4(20, 50, -120, 1), target: new Vec4(0, -0.3, 1, 1) },
        { position: new Vec4(30, 50, -120, 1), target: new Vec4(0, -0.2, 1, 1) }

    

    ]

    camera.setAnimationPath(camera_animation_path);
}

// ---------------------------------- RENDER CALLBACK ----------------------------------

let last_time = null;
let animation_progress = 0.0;
let animation_speed = 1.0; // Speed of the animation
let progress_limit = 1.0; // Limit of the animation progress

async function renderCallBack(s_time) {
    if (last_time === null) {
        last_time = s_time;
        progress_limit = camera.number_of_paths - 1; // Set the limit to the number of paths
    }

    const delta_time = (s_time - last_time) / 1000; // Convert to seconds
    last_time = s_time;

    // Update animation progress if animating
    animation_progress += delta_time * animation_speed;
    if (animation_progress >= progress_limit) {
        animation_progress = 0.0;
    }

    const u_camera_position = gl.getUniformLocation(program, 'u_camera_position');
    const u_camera_target = gl.getUniformLocation(program, 'u_camera_target');
    const u_camera_up = gl.getUniformLocation(program, 'u_camera_up');

    // Get camera position and target
    const camera_position = camera.getCameraAnimatedPosition(animation_progress);
    const camera_target = camera.getCameraAnimatedTarget(animation_progress);

    // Setting camera position
    camera.setPosition(camera_position.x, camera_position.y, camera_position.z);
    camera.setTarget(camera_target.x, camera_target.y, camera_target.z);

    // Updating camera values
    gl.uniform3f(u_camera_position, camera.location.x, camera.location.y, camera.location.z);
    gl.uniform3f(u_camera_target, camera.target.x, camera.target.y, camera.target.z);
    gl.uniform3f(u_camera_up, camera.up_vector.x, camera.up_vector.y, camera.up_vector.z);

    wgl_utils.clearCanvas(CLEAR_COLOR, gl);

    // Render the scene
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const end = performance.now();
    const elapsed = end - s_time; // This is the time taken to render the frame (in milliseconds)
    const diff = FRAME_RENDER_LIMIT - elapsed; // This is the time we need to wait until the next frame (If we need to wait)

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