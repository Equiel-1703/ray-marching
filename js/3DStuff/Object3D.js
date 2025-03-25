import GraphicsMath from "./GraphicsMath.js";
import VAOFactory from "./VAOFactory.js";
import Vec4 from "./Vec4.js";

/**
 * Represents a 3D object.
 * 
 * This object does not use indexed rendering, so the vertices are repeated for each face. This is because OBJs files are not properly indexed.
 * A single normal, color or texture coordinate can be shared between multiple vertices, turning impossible to use a single index buffer for all attributes of every vertex.
 * Therefore, it's easier to just repeat the attributes and use array rendering.
 * 
 * @class
 * 
 * @property {WebGLVertexArrayObject} vao - The Vertex Array Object for this object.
 * @property {Object} geometry_data - Processed geometry data containing position, texcoord, normal, and color. This is mostly used for debugging purposes.
 * @property {number} vertex_count - The number of vertices in this object.
 */
export default class Object3D {
    #material = null;
    #vao = null;
    #geometry_data = null;
    #vertex_count = 0;

    /**
     * Creates a new Object3D.
     * 
     * @param {Object} geometry_data - The geometry data containing position, texcoord, normal, and color attributes like this:
     * @param {number[]} geometry_data.position - The position of the vertices.
     * @param {number[]} geometry_data.texcoord - The texture coordinates of the vertices.
     * @param {number[]} geometry_data.normal - The normals of the vertices.
     * @param {number[]} geometry_data.color - The colors of the vertices.
     * @param {Object} material - The material of the object.
     * @param {number} material.shininess - The shininess of the material.
     * @param {number[]} material.ambient - The ambient color of the material.
     * @param {number[]} material.diffuse - The diffuse color of the material.
     * @param {number[]} material.specular - The specular color of the material.
     * @param {number[]} material.emissive - The emissive color of the material.
     * @param {number} material.opticalDensity - The optical density of the material.
     * @param {number} material.opacity - The opacity of the material.
     * @param {number} material.illum - The illumination model of the material.
     * @param {Object} configs - The configurations for the object processing. To check the available configurations, see {@link FileLoader#load3DObject}.
     * @param {WebGLRenderingContext} gl - The WebGL rendering context.
     * @param {WebGLProgram} program - The WebGL program.
     * 
     * @constructor
     */
    constructor(geometry_data, material, configs, gl, program) {
        this.#geometry_data = this.#processGeometryData(geometry_data, configs);
        this.#material = material;

        const vao_config = this.#createVAOConfig(this.#geometry_data, gl);

        this.#vao = VAOFactory.buildVAO(vao_config, gl, program);
        this.#vertex_count = this.#countVertices(geometry_data);
    }

    getMaterial() {
        return this.#material;
    }

    getVAO() {
        return this.#vao;
    }

    getVertexCount() {
        return this.#vertex_count;
    }

    /**
     * This is mostly used for debugging purposes.
     * 
     * @returns {Object} The geometry data containing position, texcoord, normal, and color attributes.
     */
    getGeometryData() {
        return this.#geometry_data;
    }

    /**
     * Deletes the VAO object from the GPU. This should trigger the garbage collector to free the memory.
     * 
     * @param {WebGLRenderingContext} gl - The WebGL rendering context.
     */
    deleteObject(gl) {
        gl.deleteVertexArray(this.#vao);
    }

    /**
     * Returns the number of vertices in the geometry data.
     * 
     * @param {Object} geometry_data - The geometry data containing position, texcoord, normal, and color attributes.
     * @returns {number} The number of vertices in the geometry data.
     * 
     * @private
     */
    #countVertices(geometry_data) {
        return geometry_data.position.length / 3;
    }

    /**
     * Creates a VAO (Vertex Array Object) configuration object for the given geometry data. An VAO configuration object is an object in
     * which each key is the name of an attribute in the shader program and the value is an object containing the configuration for
     * that attribute.
     *
     * @param {Object} geometry_data - The geometry data containing position, texcoord, normal, and color attributes.
     * @param {WebGLRenderingContext} gl - The WebGL rendering context.
     * @returns {Object} An object containing the configuration for each attribute (position, texcoord, normal, color).
     * 
     * @private
     */
    #createVAOConfig(geometry_data, gl) {
        const config = {
            'a_position': {
                data: geometry_data.position,
                components_per_attr: 3,
                data_type: gl.FLOAT,
                normalize: false,
                stride: 0,
                offset: 0
            },
            'a_uv': {
                data: geometry_data.texcoord,
                components_per_attr: 2,
                data_type: gl.FLOAT,
                normalize: false,
                stride: 0,
                offset: 0
            },
            'a_normal': {
                data: geometry_data.normal,
                components_per_attr: 3,
                data_type: gl.FLOAT,
                normalize: false,
                stride: 0,
                offset: 0
            },
            'a_color': {
                data: geometry_data.color,
                components_per_attr: 4,
                data_type: gl.FLOAT,
                normalize: false,
                stride: 0,
                offset: 0
            }
        }

        return config;
    }

    /**
     * Processes the geometry data preparing the proper arrays formats for each attribute according to the configurations provided.
     * 
     * @param {Object} geometry_data - The geometry data containing position, texcoord, normal and color attributes.
     * @param {Object} configs - The configurations for the object processing. To check the available configurations, see {@link FileLoader}.
     * @returns {Object} The geometry data with the proper arrays for each attribute.
     */
    #processGeometryData(geometry_data, configs) {
        const processed_data = {};

        // Prepare the correct array for positions
        const positions = new Float32Array(geometry_data.position);

        // Check if texcoord are present
        if (!('texcoord' in geometry_data)) {
            const texcoord_length = positions.length / 3 * 2; // Calculate the length of the texcoord array
            geometry_data.texcoord = new Array(texcoord_length).fill(0); // If not, create an array filled with zeros
        }

        // Check if we need to generate normals
        if (configs.generate_normals) {
            geometry_data.normal = this.#calculateNormals(positions); // If not, calculate the normals
        }
        // Check if normals are present
        else if (!('normal' in geometry_data)) {
            // If normals are not present and the user does not want to generate them, create an array filled with zeros.
            const normal_length = positions.length; // Calculate the length of the normal array
            geometry_data.normal = new Array(normal_length).fill(0); // Create an array filled with zeros
        }

        // Create the expected arrays format
        const texcoord = new Float32Array(geometry_data.texcoord);
        const normal = new Float32Array(geometry_data.normal);

        // Check if color is present
        let color;
        const color_expected_length = positions.length / 3 * 4; // Calculate the expected length of the color array

        // Processing color data
        if (!('color' in geometry_data) || geometry_data.color.length === 0) {
            // If not, create an array filled with random colors (just to have some color)
            color = new Float32Array(color_expected_length);

            for (let i = 0; i < color_expected_length / 4; i++) {
                color[i * 4] = Math.random();
                color[i * 4 + 1] = Math.random();
                color[i * 4 + 2] = Math.random();
                color[i * 4 + 3] = 1.0;
            }
        } else if (geometry_data.color.length < color_expected_length) {
            // This means that the color array is missing the alpha channel, let's add it with a value of 1.0
            color = new Float32Array(color_expected_length);

            for (let i = 0; i < color_expected_length / 4; i++) {
                color[i * 4] = geometry_data.color[i * 3];
                color[i * 4 + 1] = geometry_data.color[i * 3 + 1];
                color[i * 4 + 2] = geometry_data.color[i * 3 + 2];
                color[i * 4 + 3] = 1.0;
            }
        } else {
            // The color array has the correct length, so we can just create the Float32Array
            color = new Float32Array(geometry_data.color);
        }

        // Assign the processed data to the return object
        processed_data.position = positions;
        processed_data.texcoord = texcoord;
        processed_data.normal = normal;
        processed_data.color = color;

        return processed_data;
    }

    #calculateNormals(positions) {
        const normals = new Array(positions.length).fill(0);

        const vertexes_mapping = {}; // Mapping of vertexes ids to their vertex_info

        for (let i = 0; i < positions.length; i += 9) {
            const v1 = [positions[i], positions[i + 1], positions[i + 2]];
            const v2 = [positions[i + 3], positions[i + 4], positions[i + 5]];
            const v3 = [positions[i + 6], positions[i + 7], positions[i + 8]];

            const normal = GraphicsMath.calculateNormal(v1, v2, v3);

            const v1_id = v1.join(',');
            const v2_id = v2.join(',');
            const v3_id = v3.join(',');

            const normal_vec4 = new Vec4(normal[0], normal[1], normal[2], 0);
            for (let [id, k] of [[v1_id, i], [v2_id, i + 3], [v3_id, i + 6]]) {
                if (id in vertexes_mapping) {
                    vertexes_mapping[id].normal = vertexes_mapping[id].normal.add(normal_vec4);
                    vertexes_mapping[id].indexes.push(k);
                } else {
                    vertexes_mapping[id] = {
                        normal: normal_vec4,
                        indexes: [k],
                    };
                }
            }
        }

        // Normalize normals
        for (let v in vertexes_mapping) {
            const normal = vertexes_mapping[v].normal.normalize();
            for (let i of vertexes_mapping[v].indexes) {
                normals[i] = normal.x;
                normals[i + 1] = normal.y;
                normals[i + 2] = normal.z;
            }
        }

        return normals;
    }
}