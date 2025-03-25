import Object3D from './Object3D.js';
import GraphicsMath from './GraphicsMath.js';
import { Color } from './WebGLUtils.js';

/**
 * This class represents a Model3D.
 * A model can be made out of multiple Object3D.
 * 
 * This class is responsible for creating the objects that make up a model.
 * 
 * @class
 * 
 * @property {string} name - The name of the model. Must be unique.
 * @property {string} model_path - The path to the model file.
 * @property {Image} model_texture_image - The texture image of the model.
 * @property {string} model_texture_id - The id of the texture image of the model.
 * @property {Color} global_color - The global color of the model.
 * @property {WebGL2Texture} model_texture - The WebGL2 texture of the model.
 * @property {Object} transformation_dict - A transformation dictionary with the properties: translation, rotation, and scale.
 * @property {Object3D[]} objects - The objects that make up the model.
 * 
 * @static @property {Object} models_duplicates_mapping - A mapping of models that have duplicates. The key is the model path and the value is an array of model names.
 */
export default class Model3D {
    /** @type {string} */
    #name = '';
    /** @type {string} */
    #model_path = '';
    /** @type {Image} */
    #model_texture_image = null;
    /** @type {string} */
    #model_texture_id = '';
    /** @type {Color} */
    #global_color = new Color(0, 0, 0, 0); // Default color is transparent black
    /** @type {WebGL2Texture} */
    #model_texture = null;

    /**  @type {Object} */
    #transformation_dict = {
        translation: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
    };
    /** @type {Float32Array} */
    #transformation_matrix = GraphicsMath.createIdentityMatrix();

    /** @type {Object3D[]} */
    static #models_duplicates_mapping = {};

    /**
     * Creates a new Model3D.
     * 
     * @param {string} name - The name of the model.
     * @param {string} model_path - The path to the model file (obj).
     * @param {Object} parsed_obj_data - The parsed object data containing 'geometries', 'materialLibs', and 'configs'.
     * @param {Object} parsed_materials - The parsed materials.
     * @param {WebGL2RenderingContext} gl - The WebGL2 context in which the model will be rendered.
     * @param {WebGLProgram} program - The WebGL program.
     */
    constructor(name, model_path, parsed_obj_data, parsed_materials, gl, program) {
        // Set the name of the model
        this.#name = name;
        // Set the path to the model file
        this.#model_path = model_path;

        // The objects that make up the model
        this.objects = [];

        if (parsed_obj_data && parsed_materials) {
            this.#createObjects(parsed_obj_data, parsed_materials, gl, program);
        }
    }

    /**
     * Creates the objects that make up the model.
     * 
     * @param {Object} parsed_obj_data - The parsed object data. Contains 'geometries', 'materialLibs' and 'configs'.
     * @param {Object} parsed_materials - The parsed materials.
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     * @param {WebGLProgram} program - The WebGL program.
     * 
     * @private
     */
    #createObjects(parsed_obj_data, parsed_materials, gl, program) {
        const geometries = parsed_obj_data.geometries;
        const configs = parsed_obj_data.configs;

        for (let g in geometries) {
            // 'geometries' is an array of 'geometry'. This is a geometry object:
            // geometry = {
            //     object,
            //     groups,
            //     material,
            //     data: {
            //       position,
            //       texcoord,
            //       normal,
            //       color,
            //     },

            const data = geometries[g].data;
            const material = parsed_materials[geometries[g].material];
            const obj = new Object3D(data, material, configs, gl, program);
            
            this.objects.push(obj);
        }
    }

    /**
     * Get the transformation matrix of the model.
     * 
     * @returns {Float32Array} The transformation matrix in column major order.
     */
    getTransformationMatrix() {
        return this.#transformation_matrix;
    }

    /**
     * Get the transformation dictionary of the model.
     * 
     * @returns {Object} The transformation dictionary with the properties: translation, rotation, and scale.
     */
    getTransformationDict() {
        return this.#transformation_dict;
    }

    /**
     * Receives a dictionary to set the transformation matrix of the model.
     * 
     * @param {Object} dictionary - The dictionary with the transformation matrix properties: translation, rotation, and scale.
     */
    setTransformation(dictionary) {
        const t = dictionary.translation;
        const r = dictionary.rotation;
        const s = dictionary.scale;

        const t_m = GraphicsMath.createTranslationMatrix(t.x, t.y, t.z);

        const r_x_m = GraphicsMath.createRotationMatrix(r.x, 'x');
        const r_y_m = GraphicsMath.createRotationMatrix(r.y, 'y');
        const r_z_m = GraphicsMath.createRotationMatrix(r.z, 'z');
        const r_xy_m = GraphicsMath.multiplyMatrices(r_x_m, r_y_m);
        const r_xyz_m = GraphicsMath.multiplyMatrices(r_xy_m, r_z_m);

        const s_m = GraphicsMath.createScaleMatrix(s.x, s.y, s.z);

        const s_r = GraphicsMath.multiplyMatrices(r_xyz_m, s_m);
        const s_r_p = GraphicsMath.multiplyMatrices(t_m, s_r);

        this.#transformation_matrix = s_r_p;
        this.#transformation_dict = dictionary;
    }

    /**
     * Get the texture settings of the model.
     * 
     * @returns {Object} The texture settings of the model.
     */
    getTextureProperties() {
        return {
            image_id: this.#model_texture_id,
            image_path: this.#model_texture_image !== null ? this.#model_texture_image.src : null,
            color: this.#global_color
        };
    }

    /**
     * Set the texture image of the model.
     * 
     * @param {string} texture_img_path - The path to the texture image.
     * @param {string} texture_img_id - The identifier of the texture image.
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     * 
     * @returns {Promise} A promise that resolves when the texture is loaded successfully and rejects if there is an error loading the texture image.
     */
    async setTexture(texture_img_path, texture_img_id, gl) {
        const return_promise = new Promise((resolve, reject) => {
            // Revoke the object URL of the previous texture if it had one
            if (this.#model_texture_image !== null) {
                URL.revokeObjectURL(this.#model_texture_image.src);

                gl.deleteTexture(this.#model_texture);
            }

            // Set the new texture image id
            this.#model_texture_id = texture_img_id;

            // Create a new texture
            this.#model_texture_image = new Image();
            this.#model_texture = gl.createTexture();

            // Bind the texture to the active texture unit at bind point TEXTURE_2D
            gl.bindTexture(gl.TEXTURE_2D, this.#model_texture);

            // Set the parameters so we can render any size image.
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Upload the image into the texture only after it has loaded
            this.#model_texture_image.onload = () => {
                var mipLevel = 0;               // the largest mip
                var internalFormat = gl.RGBA;   // format we want in the texture
                var srcFormat = gl.RGBA;        // format of data we are supplying
                var srcType = gl.UNSIGNED_BYTE  // type of data we are supplying
                gl.texImage2D(gl.TEXTURE_2D,
                    mipLevel,
                    internalFormat,
                    srcFormat,
                    srcType,
                    this.#model_texture_image);

                // After the image has been uploaded, we have resolved the promise
                resolve('Texture loaded successfully');
            };

            // If there is an error loading the texture image, reject the promise
            this.#model_texture_image.onerror = () => reject('Error loading texture image');

            // Set the image source
            this.#model_texture_image.src = texture_img_path;
        });

        return return_promise;
    }

    /**
     * Clear the texture of the model.
     * 
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     */
    clearTexture(gl) {
        // Revoke the object URL of the previous texture if it had one
        if (this.#model_texture_image !== null) {
            URL.revokeObjectURL(this.#model_texture_image.src);

            gl.deleteTexture(this.#model_texture);
        }

        // Remove all references to the previous texture
        this.#model_texture_image = null;
        this.#model_texture_id = '';
        this.#model_texture = null;
    }

    /**
     * Enable the texture of the model for renderering.
     * 
     * @param {WebGL2RenderingContext} gl - The WebGL2 context in which the model will be rendered.
     */
    enableTexture(gl) {
        if (this.#model_texture !== null) {
            // Bind the texture to the active texture unit at bind point TEXTURE_2D
            gl.bindTexture(gl.TEXTURE_2D, this.#model_texture);
        }
    }

    /**
     * Get the texture image of the model.
     * 
     * @returns {HTMLImageElement} The texture image.
     */
    getTextureImage() {
        return this.#model_texture_image;
    }

    /**
     * Check if the model has a texture.
     * 
     * @returns {boolean} True if the model has a texture, false otherwise.
     */
    hasTexture() {
        return this.#model_texture !== null;
    }

    /**
     * Set the global color of the model.
     * 
     * @param {Color} color - The color.
     */
    setGlobalColor(color) {
        this.#global_color = color;
    }

    /**
     * Get the global color of the model.
     * 
     * @returns {Color} The color.
     */
    getGlobalColor() {
        return this.#global_color;
    }

    /**
     * Get the renderable objects of the model.
     * 
     * @returns {Object3D[]} The renderable objects of the model.
     */
    getRenderableObjects() {
        return this.objects;
    }

    /**
     * Returns the name of the model.
     * 
     * @returns {string} The name of the model.
     */
    getModelName() {
        return this.#name;
    }

    /**
     * Returns the path to the model file (obj).
     * 
     * @returns {string} The path to the model file.
     */
    getModelPath() {
        return this.#model_path;
    }

    /**
     * Rename the model. Updates the static mapping of duplicates if necessary.
     * 
     * @param {string} new_name - The new name of the model.
     */
    renameModel(new_name) {
        // Update the static mapping (if the model is or have any duplicates)
        if (Model3D.checkIfModelHasDuplicates(this.#model_path)) {
            // Find the model in the duplicates mapping and update it
            const index = Model3D.#models_duplicates_mapping[this.#model_path].indexOf(this.#name);

            // Update the name in the mapping
            Model3D.#models_duplicates_mapping[this.#model_path][index] = new_name;
        }

        // Now we can update the model name in the current object
        this.#name = new_name;
    }

    /**
     * This method iterates over all objects in the model and call deleteObject on each one, if the object doesn't have any duplicate in use.
     * This should trigger the garbage collector to free up GPU memory. The internal objects array is also emptied after this and the texture is cleared (if any).
     * 
     * @param {WebGL2RenderingContext} gl - The WebGL2 context.
     */
    deleteModel(gl) {
        // Check if the model has duplicates
        if (Model3D.checkIfModelHasDuplicates(this.#model_path)) {
            // Get the duplicates of the current model
            const duplicates = Model3D.#models_duplicates_mapping[this.#model_path];

            // Remove the current model from the mapping
            const index = duplicates.indexOf(this.#name);
            duplicates.splice(index, 1);

            // Clear the texture
            this.clearTexture(gl);

            // Check if after removing the current model from the mapping, we still have duplicates
            if (duplicates.length > 0) {
                // If we still have duplicates, we can't delete the entire model yet. Just return.
                return;
            } else {
                // If not, delete the key from the mapping and we'll proceed to delete the entire model
                delete Model3D.#models_duplicates_mapping[this.#model_path];
            }
        }

        // Delete all objects in the model
        for (let i = 0; i < this.objects.length; i++) {
            this.objects[i].deleteObject(gl);
        }

        // And empty the objects array
        this.objects = [];
    }

    /**
     * This method creates a new model with the same objects and transformation matrix as the current model.
     * The transformation matrix of the new model is a copy of the current model's transformation matrix, not a reference.
     * The objects, although, are references to the same objects as the current model. This was done to save memory.
     * 
     * Each time a Model3D is duplicated, the name of the current model and of the new model is stored in a static mapping.
     * This is done to prevent deleting the model while there are still references using it's Objects.
     * 
     * @returns {Model3D} The new model.
     */
    duplicateModel() {
        const new_model = new Model3D(this.#name, this.#model_path, null, null, null, null);

        // Set new model's objects to the same objects as the current model
        new_model.objects = this.getRenderableObjects();

        // Add entries to the static mapping of duplicates if necessary
        if (!Model3D.checkIfModelHasDuplicates(this.#model_path)) {
            Model3D.#models_duplicates_mapping[this.#model_path] = [];
        }

        // Add entrie for the 'original' model if it's not already there
        if (!(Model3D.#models_duplicates_mapping[this.#model_path].includes(this.#name))) {
            Model3D.#models_duplicates_mapping[this.#model_path].push(this.#name);
        }

        // Add entrie for the new model
        Model3D.#models_duplicates_mapping[new_model.#model_path].push(new_model.#name);

        return new_model;
    }

    /**
     * Check if a model has duplicates.
     * 
     * @param {string} model_path - The path to the model file.
     * @returns {boolean} True if the model has duplicates, false otherwise.
     */
    static checkIfModelHasDuplicates(model_path) {
        return model_path in Model3D.#models_duplicates_mapping;
    }

    /**
     * Get the duplicates mapping.
     * This mapping maps the model path to an array of model names that are duplicates of this model path.
     * 
     * @returns {Object} The duplicates mapping.
     */
    static getDuplicatesMapping() {
        return Model3D.#models_duplicates_mapping;
    }
}