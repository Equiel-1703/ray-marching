import DoLog from '../Logging/DoLog.js';

import FileLoader from '../FileProcessing/FileLoader.js';

import { Color, WebGLUtils } from './WebGLUtils.js';
import GraphicsMath from './GraphicsMath.js';
import Camera from './Camera.js';
import Vec4 from './Vec4.js';


export default class PreviewCanvas extends DoLog {
	#canvasID = '';
	#canvas = null;

	#gl = null;
	#program = null;
	#wgl_utils = null;
	#camera = null;

	#file_loader = null;
	/** @type {Model3D} */
	#model = null;

	#render_enabled = false;

	static debug_log = true;

	static #clearColor = new Color(1.0, 1.0, 1.0, 1.0); // White
	static #STARTING_CAMERA_LOCATION = new Vec4(0, 0, -10, 1);
	static #FPS = 30;
	static #fps_limit = 1000 / PreviewCanvas.#FPS;
	static #fps_frame_counter = 0;
	static #ROTATION_AMOUNT = GraphicsMath.degToRad(-1); // 1 degree per frame

	constructor(canvasID, vs, fs, log) {
		super(log, canvasID + '> ');

		this.#canvasID = canvasID;
		this.#canvas = document.getElementById(canvasID);

		this.#wgl_utils = new WebGLUtils(log);
		this.#file_loader = new FileLoader(log);

		this.#gl = this.#wgl_utils.initializeWebGLContext(this.#canvas);

		const vertex_shader = this.#wgl_utils.createShader(this.#gl.VERTEX_SHADER, vs);
		const fragment_shader = this.#wgl_utils.createShader(this.#gl.FRAGMENT_SHADER, fs);

		if (!vertex_shader || !fragment_shader) {
			throw new Error('Failed to create shaders.');
		}

		const program = this.#wgl_utils.createProgram(vertex_shader, fragment_shader);

		if (!program) {
			throw new Error('Failed to create program.');
		}
		this.#gl.useProgram(program);
		this.#program = program;

		// Creating camera
		this.#camera = new Camera(PreviewCanvas.#STARTING_CAMERA_LOCATION);

		const camera_uniform = this.#gl.getUniformLocation(program, 'u_camera_matrix');
		const camera_matrix = this.#camera.getCameraMatrix();
		this.#gl.uniformMatrix4fv(camera_uniform, false, camera_matrix);

		// Creating projection matrix
		const fov = 30;
		const aspect_ratio = this.#canvas.width / this.#canvas.height;
		const near = 0.1;
		const far = 100;
		const projection_matrix = GraphicsMath.createProjectionMatrix(fov, aspect_ratio, near, far);

		const projection_uniform = this.#gl.getUniformLocation(program, 'u_perspective_projection');
		const enable_texture_uniform = this.#gl.getUniformLocation(this.#program, 'u_enable_texture');
		const enable_lighting_uniform = this.#gl.getUniformLocation(this.#program, 'u_enable_lighting');

		// Set projection matrix (all preview canvases have the same projection matrix)
		this.#gl.uniformMatrix4fv(projection_uniform, false, projection_matrix);
		// Disable texture (preview models don't have textures)
		this.#gl.uniform1i(enable_texture_uniform, false);
		// Disable lighting (preview models don't have lighting)
		this.#gl.uniform1i(enable_lighting_uniform, false);

		// Enable depth test and culling
		this.#gl.enable(this.#gl.DEPTH_TEST);
		this.#gl.enable(this.#gl.CULL_FACE);
		this.#gl.cullFace(this.#gl.FRONT);

		if (log === null) {
			PreviewCanvas.debug_log = false;
		}
	}

	async setModel(model_path) {
		if (this.#model !== null) {
			this.disableRender();
			this.#model.deleteModel(this.#gl);
		}

		if (!model_path) {
			this.LOG('Model path is empty. Rendering disabled.', 'warning');
			this.#model = null;
			this.disableRender();
			return;
		}

		this.#model = await this.#file_loader.load3DObject(model_path, this.#gl, this.#program);

		this.enableRender();
	}

	getCanvasElement() {
		return this.#canvas;
	}

	enableRender() {
		this.#render_enabled = true;
		requestAnimationFrame(this.renderLoop.bind(this));
	}

	disableRender() {
		this.#render_enabled = false;
		this.#wgl_utils.clearCanvas(PreviewCanvas.#clearColor, this.#gl);
	}

	renderLoop(s_time) {
		if (!this.#render_enabled) {
			return;
		}

		// Getting uniform locations
		const transformation_uniform = this.#gl.getUniformLocation(this.#program, 'u_model_matrix');
		const enable_v_color_uniform = this.#gl.getUniformLocation(this.#program, 'u_enable_vertex_color');
		const enable_m_color_uniform = this.#gl.getUniformLocation(this.#program, 'u_enable_material_color');
		const material_color_uniform = this.#gl.getUniformLocation(this.#program, 'u_material_color');

		// Set transformation of the model
		const transformation_dictionary = this.#model.getTransformationDict();
		transformation_dictionary.rotation.y += PreviewCanvas.#ROTATION_AMOUNT;
		this.#model.setTransformation(transformation_dictionary);

		this.#gl.uniformMatrix4fv(transformation_uniform, false, this.#model.getTransformationMatrix());

		// Clearing the canvas
		this.#wgl_utils.clearCanvas(PreviewCanvas.#clearColor, this.#gl);

		// Rendering the model
		const model_geometries = this.#model.getRenderableObjects();
		for (let i = 0; i < model_geometries.length; i++) {
			const geometry = model_geometries[i];

			const vao = geometry.getVAO();
			const material = geometry.getMaterial();

			// Enable material color, if it exists
			if ('diffuse' in material) {
				// Disable vertex color
				this.#gl.uniform1i(enable_v_color_uniform, false);
				// Enable material color
				this.#gl.uniform1i(enable_m_color_uniform, true);

				// Set material color
				this.#gl.uniform3fv(material_color_uniform, new Float32Array(material.diffuse));
			} else {
				// Disable material color
				this.#gl.uniform1i(enable_m_color_uniform, false);
				// Enable vertex color (it has random colors by default)
				this.#gl.uniform1i(enable_v_color_uniform, true);
			}

			this.#gl.bindVertexArray(vao);

			this.#gl.drawArrays(this.#gl.TRIANGLES, 0, geometry.getVertexCount());
		}

		const end_time = performance.now();
		const elapsed_time = end_time - s_time;
		const time_to_wait = PreviewCanvas.#fps_limit - elapsed_time;

		const callback = () => {
			requestAnimationFrame(this.renderLoop.bind(this));

			PreviewCanvas.#fps_frame_counter++;

			if (this.debug_log && PreviewCanvas.#fps_frame_counter >= PreviewCanvas.#FPS) {
				this.LOG(`FPS: ${Math.round(1000 / (elapsed_time + Math.abs(time_to_wait)))}`, 'info');
				PreviewCanvas.#fps_frame_counter = 0;
			}
		}

		if (time_to_wait > 0) {
			setTimeout(callback, time_to_wait);
		} else {
			callback();
		}
	}
}