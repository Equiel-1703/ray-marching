import GraphicsMath from './GraphicsMath.js';

export default class Vec4 {
    constructor(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    static createZeroPoint() {
        return new Vec4(0, 0, 0, 1);
    }

    static xAxis() {
        return new Vec4(1, 0, 0, 1);
    }

    static yAxis() {
        return new Vec4(0, 1, 0, 1);
    }

    static zAxis() {
        return new Vec4(0, 0, 1, 1);
    }

    /**
     * Computes the cross product of this vector and another vector B.
     * The cross product is a vector that is perpendicular to both input vectors.
     * 
     * @param {Vec4} B - The vector to compute the cross product with.
     * @returns {Vec4} - The resulting vector from the cross product.
     */
    crossProduct(B) {
        let result = Vec4.createZeroPoint();

        result.x = this.y * B.z - this.z * B.y;
        result.y = this.z * B.x - this.x * B.z;
        result.z = this.x * B.y - this.y * B.x;
        result.w = 0; // Cross product is a vector, so w is 0

        return result;
    }

    /**
     * Computes the dot product of this vector and another vector B.
     * The dot product is a scalar value that is the result of multiplying the corresponding components of the two vectors and summing the results.
     * 
     * @param {Vec4} B - The vector to compute the dot product with.
     * @returns {number} - The resulting scalar value from the dot product.
     */
    dotProduct(B) {
        return this.x * B.x + this.y * B.y + this.z * B.z;
    }

    /**
     * Adds another vector B to this vector.
     * 
     * @param {Vec4} B - The vector to add to this vector.
     * @returns {Vec4} - The resulting vector from the addition.
     */
    add(B) {
        let result = Vec4.createZeroPoint();

        result.x = this.x + B.x;
        result.y = this.y + B.y;
        result.z = this.z + B.z;
        result.w = this.w + B.w;

        result.w = result.w > 1 ? 1 : result.w; // Clamp w to 1

        return result;
    }

    subtract(B) {
        let result = Vec4.createZeroPoint();

        result.x = this.x - B.x;
        result.y = this.y - B.y;
        result.z = this.z - B.z;

        // w is not subtracted, we will keep the w value of this vector
        result.w = this.w;

        return result;
    }

    /**
     * Multiplies this vector by a scalar value.
     * 
     * @param {number} scalar - The scalar value to multiply the vector by.
     * @returns {Vec4} - The resulting vector from the multiplication.
     */
    scale(scalar) {
        let result = Vec4.createZeroPoint();

        result.x = this.x * scalar;
        result.y = this.y * scalar;
        result.z = this.z * scalar;
        result.w = this.w;

        return result;
    }

    /**
     * Computes the length of the vector.
     * 
     * @returns {number} - The length of the vector.
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /**
     * Normalizes the vector.
     * 
     * @returns {Vec4} - The normalized vector.
     */
    normalize() {
        let result = Vec4.createZeroPoint();

        const length = this.length();

        if (length > 0) {
            result.x = this.x / length;
            result.y = this.y / length;
            result.z = this.z / length;
        }

        result.w = 0; // Normalized vector is a vector, so w is 0}

        return result;
    }

    /**
     * Applies a transformation matrix to the vector.
     * 
     * @param {Float32Array} matrix - 4x4 Matrix in column major order
     * @returns {Vec4} - Transformed vector
     */
    applyTransformationMatrix(matrix) {
        const rm_matrix = GraphicsMath.transposeMatrix(matrix); // Convert to row major order
        let result = Vec4.createZeroPoint();

        let row = 0;
        result.x = this.x * rm_matrix[row] + this.y * rm_matrix[row + 1] + this.z * rm_matrix[row + 2] + this.w * rm_matrix[row + 3];

        row = 4;
        result.y = this.x * rm_matrix[row] + this.y * rm_matrix[row + 1] + this.z * rm_matrix[row + 2] + this.w * rm_matrix[row + 3];

        row = 8;
        result.z = this.x * rm_matrix[row] + this.y * rm_matrix[row + 1] + this.z * rm_matrix[row + 2] + this.w * rm_matrix[row + 3];

        result.w = this.w; // We can apply the transformation matrix to a point, so w remains the same

        return result;
    }

    toArray() {
        return [this.x, this.y, this.z, this.w];
    }
}