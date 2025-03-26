import GraphicsMath from './GraphicsMath.js';
import Vec4 from './Vec4.js';

/**
 * Represents a Camera in 3D space.
 * @class
 */
export default class Camera {
    #location = Vec4.createZeroPoint();

    // Rotation angles in radians
    #angle_x = 0;
    #angle_y = 0;

    // Front and up vectors
    #target;
    #up;

    constructor(location = Vec4.createZeroPoint()) {
        this.#location = location;

        // Camera will be looking in the positive Z direction by default
        this.#target = Vec4.zAxis();
        this.#up = Vec4.yAxis();
    }

    get location() {
        return this.#location;
    }

    get front_vector() {
        return this.#target;
    }

    get up_vector() {
        return this.#up;
    }
    
    static #last_x_angle = 0;
    setRotationX(angle) {
        // check if the angle is the same
        if (angle == Camera.#last_x_angle) {
            return;
        }

        const axis = Vec4.xAxis();

        this.#angle_x = angle - Camera.#last_x_angle;
        this.#target = this.#target.rotateAroundAxis(axis, this.#angle_x).normalize();
        this.#up = this.#up.rotateAroundAxis(axis, this.#angle_x).normalize();

        Camera.#last_x_angle = angle;
    }

    static #last_y_angle = 0;
    setRotationY(angle) {
        // check if the angle is the same
        if (angle == Camera.#last_y_angle) {
            return;
        }

        const axis = Vec4.yAxis();

        this.#angle_y = angle - Camera.#last_y_angle;
        this.#target = this.#target.rotateAroundAxis(axis, this.#angle_y).normalize();
        this.#up = this.#up.rotateAroundAxis(axis, this.#angle_y).normalize();

        Camera.#last_y_angle = angle;
    }

    setPosition(x, y, z) {
        this.#location.x = x;
        this.#location.y = y;
        this.#location.z = z;
    }

    logCameraStats(log) {
        log.log('Camera> Location: ' + this.#location.x + ', ' + this.#location.y + ', ' + this.#location.z);
        log.log('Camera> Front vector: ' + this.#target.x + ', ' + this.#target.y + ', ' + this.#target.z);
        log.log('Camera> Up vector: ' + this.#up.x + ', ' + this.#up.y + ', ' + this.#up.z);
        log.log('Camera> Rotation: ' + 'X: ' + this.#angle_x + ', Y: ' + this.#angle_y);
    }
}