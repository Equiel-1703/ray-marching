import GraphicsMath from './GraphicsMath.js';
import Vec4 from './Vec4.js';

/**
 * Represents a Camera in 3D space.
 * @class
 */
export default class Camera {
    #location = Vec4.createZeroPoint();

    #angle_x = 0;
    #angle_y = 0;
    #camera_rotation_matrix = GraphicsMath.createIdentityMatrix();

    constructor(location = Vec4.createZeroPoint()) {
        this.#location = location;
    }

    get location() {
        return this.#location;
    }

    move(direction, speed) {
        const move = this.transformMovement(direction, -this.#angle_y, this.#angle_x);

        // Little adjustment to include the dpads y value
        move.y += direction.y;

        this.#location = this.#location.add(move.scale(speed));
    }

    transformMovement(input, yawRad, pitchRad) {
        // Compute forward vector
        let forwardX = Math.cos(pitchRad) * Math.sin(yawRad);
        let forwardY = Math.sin(pitchRad);
        let forwardZ = Math.cos(pitchRad) * Math.cos(yawRad);

        // Compute right vector
        let rightX = Math.cos(yawRad);
        let rightY = 0; // No Y in the right vector
        let rightZ = -Math.sin(yawRad);

        // Transform movement input
        let finalX = input.x * rightX + input.z * forwardX;
        let finalY = input.z * forwardY; // Only affected by forward direction
        let finalZ = input.x * rightZ + input.z * forwardZ;

        return new Vec4(finalX, finalY, finalZ, 1);
    }

    rotate(angle, axis) {
        if (axis === 'x') {
            this.#angle_x += angle;
        } else if (axis === 'y') {
            this.#angle_y += angle;
        }

        const rotation_x = GraphicsMath.createRotationMatrix(this.#angle_x, 'x');
        const rotation_y = GraphicsMath.createRotationMatrix(this.#angle_y, 'y');

        // Update the camera rotation matrix
        this.#camera_rotation_matrix = GraphicsMath.multiplyMatrices(rotation_x, rotation_y);
    }

    getCameraMatrix() {
        const camera_translation = GraphicsMath.createTranslationMatrix(-this.#location.x, -this.#location.y, -this.#location.z);

        const camera_matrix = GraphicsMath.multiplyMatrices(this.#camera_rotation_matrix, camera_translation);

        return camera_matrix;
    }

    logCameraStats(log) {
        log.log('Camera> Location: ' + this.#location.x + ', ' + this.#location.y + ', ' + this.#location.z);
        log.log('Camera> Rotation: ' + 'X: ' + this.#angle_x + ', Y: ' + this.#angle_y);
    }
}