/**
 * A factory class for creating Vertex Array Objects (VAOs) in WebGL2.
 * 
 * This class provides static methods to build and configure VAOs based on a given configuration.
 * It supports setting up vertex attributes and index buffers.
 */
export default class VAOFactory {
    /**
     * The key for the index buffer in the VAO configuration.
     * 
     * @type {string}
     * @static
     */
    static INDEX_BUFFER_KEY = 'index_buffer';

    /**
     * Creates a VAO from the given VAO configuration object. An VAO configuration object is an object in
     * which each key is the name of an attribute in the shader program and the value is an object containing the configuration for
     * that attribute. For example:
     * 'a_position': {
     *    data: geometry_data.position,
     *    components_per_attr: 3,
     *    data_type: gl.FLOAT,
     *    normalize: false,
     *    stride: 0,
     *    offset: 0
     * }
     * 
     * @param {Object} config - The configuration of the VAO.
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     * @param {WebGLProgram} program - The WebGL program.
     * @returns {WebGLVertexArrayObject} The VAO.
     * @static
     */
    static buildVAO(config, gl, program) {
        let vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        for (let key in config) {
            if (key === this.INDEX_BUFFER_KEY) {
                this.#configureIndexBuffer(gl, config[key]);
            } else {
                this.#configureVertexAttribute(gl, program, key, config[key]);
            }
        }

        // Unbind VAO to avoid accidental changes
        gl.bindVertexArray(null);
        // Unbind index buffer AFTER unbinding the VAO to avoid unbinding the index buffer from the VAO
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        return vao;
    }

    /**
     * Configures a vertex attribute.
     * 
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     * @param {WebGLProgram} program - The WebGL program.
     * @param {String} attribute_name - The name of the attribute.
     * @param {Object} attribute_config - The configuration of the attribute.
     * @static
     */
    static #configureVertexAttribute(gl, program, attribute_name, attribute_config) {
        // Get the attribute location
        const attrib_location = gl.getAttribLocation(program, attribute_name);

        if (attrib_location === -1) {
            console.warn('Attribute not found: ' + attribute_name) + '. Skipping configuration.';
            return;
        }

        // Create buffer for the attribute
        const buffer = gl.createBuffer();

        // Bind and fill the buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, attribute_config.data, gl.STATIC_DRAW);

        // Enable the attribute
        gl.enableVertexAttribArray(attrib_location);

        // Set the attribute layout (current ARRAY_BUFFER will be used for this attribute)
        gl.vertexAttribPointer(
            attrib_location,                        // Attribute location
            attribute_config.components_per_attr,   // Number of components per attribute
            attribute_config.data_type,             // Data type
            attribute_config.normalize,             // Normalize
            attribute_config.stride,                // Stride
            attribute_config.offset                 // Offset
        );

        // Unbind buffer to avoid accidental changes
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Configures the index buffer.
     * 
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     * @param {Uint16Array} index_data - The index data.
     * @returns {WebGLBuffer} The index buffer.
     * @static
     */
    static #configureIndexBuffer(gl, index_data) {
        const index_buffer = gl.createBuffer();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index_data, gl.STATIC_DRAW);

        // We don't unbind the index buffer here because the VAO saves the last bound index buffer
        return index_buffer;
    }
}