import DoLog from "../Logging/DoLog.js";
import Model3D from "../3DStuff/Model3D.js";
import OBJParser from "./OBJParser.js";

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

    /**
     * Loads a 3D object from a .obj file.
     * 
     * @param {string} object_path - Path to the .obj file.
     * @param {WebGL2RenderingContext} gl - The WebGL2RenderingContext object.
     * @param {WebGLProgram} program - The WebGLProgram object.
     * @param {Object} configs - (Optional) Configurations for the object processing. If it is not provided, the default values will be used. The properties accepted are:
     * @param {boolean} configs.generate_normals - If true, the normals will be generated for the object even if they are present in the file. Default is false.
     * @returns {Model3D} - The 3D model.
     */
    async load3DObject(object_path, gl, program, configs = null) {
        const response = await fetch(object_path);

        if (!response.ok) {
            this.LOG('Failed to load object file: ' + object_path, 'error');
            throw new Error('Failed to load file ' + object_path + ':' + response.status + ' - ' + response.statusText);
        }

        const text = await response.text();

        const obj_parser = new OBJParser();
        const parsed_obj_data = obj_parser.parseOBJ(text);
        // Adding configs to the parsed data
        parsed_obj_data['configs'] = this.#processConfigs(configs);

        // Processing materials
        const path_prefix = './objs/kit/';
        const obj_materials_src = [];
        for (let i = 0; i < parsed_obj_data.materialLibs.length; i++) {
            const material_path = path_prefix + parsed_obj_data.materialLibs[i];

            const response = await fetch(material_path);

            if (!response.ok) {
                this.LOG('Failed to load material file: ' + material_path, 'error');
                throw new Error('Failed to load file ' + material_path + ':' + response.status + ' - ' + response.statusText);
            }

            const text = await response.text();
            obj_materials_src.push(text);
        }

        const parsed_materials = obj_parser.parseMTL(obj_materials_src.join('\n'));

        const model_name = this.#getFileNameFromPath(object_path);

        const model = new Model3D(model_name, object_path, parsed_obj_data, parsed_materials, gl, program);

        return model;
    }

    #getFileNameFromPath(path) {
        return path.split('\\').pop().split('/').pop().split('.')[0];
    }

    /**
     * Receives the configurations object and processes it, returning a new object with the default values set for the missing properties.
     * @param {Object} configs - The configurations object.
     * @returns {Object} - The processed configurations object.
     */
    #processConfigs(configs) {
        // Setup default values
        let generate_normals = false;

        if (configs) {
            if (configs.generate_normals) {
                generate_normals = configs.generate_normals;
            }
        }

        // Return the processed configurations
        return {
            generate_normals: generate_normals
        };
    }
}