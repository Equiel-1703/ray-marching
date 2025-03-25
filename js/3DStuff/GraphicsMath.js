import Vec4 from "./Vec4.js";

/**
 * A class that provides utility functions for 3D graphics math.
 * 
 * @class
 */
export default class GraphicsMath {
    /**
     * Converts degrees to radians.
     *
     * @param {number} degrees - The angle in degrees.
     * @returns {number} The angle in radians.
     */
    static degToRad(degrees) {
        return degrees * (Math.PI / 180.0);
    }

    /**
     * Converts radians to degrees.
     *
     * @param {number} rad - The angle in radians.
     * @returns {number} The angle in degrees.
     */
    static radToDeg(rad) {
        return rad * (180.0 / Math.PI);
    }

    /**
     * Calculates the normal vector of a triangle given its vertices.
     * 
     * @param {Array<number>} v1 - The first vertex of the triangle.
     * @param {Array<number>} v2 - The second vertex of the triangle.
     * @param {Array<number>} v3 - The third vertex of the triangle.
     * @returns {Array<number>} The normal vector of the triangle.
     */
    static calculateNormal(v1, v2, v3) {
        const _v1 = new Vec4(v1[0], v1[1], v1[2], 0);
        const _v2 = new Vec4(v2[0], v2[1], v2[2], 0);
        const _v3 = new Vec4(v3[0], v3[1], v3[2], 0);

        const e1 = _v2.subtract(_v1);
        const e2 = _v3.subtract(_v1);
        let normal = e1.crossProduct(e2);
        normal = normal.normalize();

        return [normal.x, normal.y, normal.z];
    }

    /**
     * Creates and returns a 4x4 identity matrix.
     * 
     * An identity matrix is a square matrix with ones on the main diagonal and zeros elsewhere.
     * This function returns the identity matrix as a Float32Array.
     * 
     * @returns {Float32Array} A 4x4 identity matrix.
     */
    static createIdentityMatrix() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * Creates a rotation matrix for a given angle and axis.
     *
     * @param {number} angle - The angle of rotation in radians.
     * @param {string} axis - The axis of rotation ('x', 'y', or 'z').
     * @returns {Float32Array} A 4x4 rotation matrix in column major order.
     */
    static createRotationMatrix(angle, axis) {
        const c = Math.cos(angle);
        const s = Math.sin(angle);

        let matrix = GraphicsMath.createIdentityMatrix();

        if (axis === 'x') {
            matrix = new Float32Array([
                1, 0, 0, 0,
                0, c, -s, 0,
                0, s, c, 0,
                0, 0, 0, 1
            ]);
        } else if (axis === 'y') {
            matrix = new Float32Array([
                c, 0, s, 0,
                0, 1, 0, 0,
                -s, 0, c, 0,
                0, 0, 0, 1
            ]);
        } else if (axis === 'z') {
            matrix = new Float32Array([
                c, -s, 0, 0,
                s, c, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
        }

        return GraphicsMath.transposeMatrix(matrix);
    }

    /**
     * Creates a translation matrix for the given x, y, and z values.
     * 
     * @param {number} x - The x translation value.
     * @param {number} y - The y translation value.
     * @param {number} z - The z translation value.
     * @returns {Float32Array} A 4x4 translation matrix in column major order.
     */
    static createTranslationMatrix(x, y, z) {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]);
    }

    /**
     * Creates a scale matrix for the given x, y, and z values.
     * 
     * @param {number} x - The x scale value.
     * @param {number} y - The y scale value.
     * @param {number} z - The z scale value.
     * @returns {Float32Array} A 4x4 scale matrix in column major order.
     */
    static createScaleMatrix(x, y, z) {
        return new Float32Array([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * Multiplies two 4x4 matrices.
     *
     * @param {Float32Array} A - The first 4x4 matrix in column major order.
     * @param {Float32Array} B - The second 4x4 matrix in column major order.
     * @returns {Float32Array} The resulting 4x4 matrix after multiplying A x B. The result is in column major order as well.
     */
    static multiplyMatrices(A, B) {
        let result = new Float32Array(16);

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[j * 4 + i] = 0;

                for (let k = 0; k < 4; k++) {
                    result[j * 4 + i] += A[k * 4 + i] * B[j * 4 + k];
                }
            }
        }

        return result;
    }

    /**
     * Transposes a 4x4 matrix.
     *
     * @param {Float32Array} matrix - The 4x4 matrix to transpose.
     * @returns {Float32Array} The transposed 4x4 matrix.
     */
    static transposeMatrix(matrix) {
        let result = new Float32Array(16);

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] = matrix[j * 4 + i];
            }
        }

        return result;
    }

    /**
     * Translates a 4x4 matrix by the given x, y, and z values.
     * 
     * @param {Float32Array} matrix - The 4x4 matrix to translate in column major order.
     * @param {number} x - The x translation value.
     * @param {number} y - The y translation value.
     * @param {number} z - The z translation value.
     * @returns {Float32Array} The translated 4x4 matrix in column major order.
     */
    static translateMatrix(matrix, x, y, z) {
        let result = new Float32Array(matrix);

        result[12] += x;
        result[13] += y;
        result[14] += z;

        return result;
    }

    /**
     * Creates a projection matrix based on the given field of view, aspect ratio, and near/far clipping planes.
     *
     * @param {number} fov_angle - The field of view angle in degrees.
     * @param {number} aspect_ratio - The aspect ratio of the view (width/height).
     * @param {number} near_z - The distance to the near clipping plane.
     * @param {number} far_z - The distance to the far clipping plane.
     * @returns {Float32Array} A 4x4 projection matrix in column major order.
     */
    static createProjectionMatrix(fov_angle, aspect_ratio, near_z, far_z) {
        const fov = Math.tan(this.degToRad(fov_angle / 2.0));

        const A = (- far_z - near_z) / (near_z - far_z);
        const B = (2.0 * far_z * near_z) / (near_z - far_z);

        const proj_mat = new Float32Array([
            1.0 / (fov * aspect_ratio), 0, 0, 0,
            0, 1.0 / fov, 0, 0,
            0, 0, A, B,
            0, 0, 1.0, 0
        ]);

        return GraphicsMath.transposeMatrix(proj_mat);
    }
}