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
    #right;

    #animation_path = [];
    #number_of_paths = 0;

    constructor(location = Vec4.createZeroPoint()) {
        this.#location = location;

        // Camera will be looking in the positive Z direction by default
        this.#target = Vec4.zAxis();
        this.#up = Vec4.yAxis();
        this.#right = Vec4.xAxis();
    }

    get location() {
        return this.#location;
    }

    get target() {
        return this.#target;
    }

    get up_vector() {
        return this.#up;
    }

    get number_of_paths() {
        return this.#number_of_paths;
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

    setTarget(x, y, z) {
        this.#target.x = x;
        this.#target.y = y;
        this.#target.z = z;

        this.#target = this.#target.normalize();

        // Recalculate the up vector to be perpendicular to the target vector
        const up = Vec4.yAxis();
        const right = this.#target.crossProduct(up).normalize();
        this.#up = right.crossProduct(this.#target).normalize();
        this.#right = right;
    }

    logCameraStats(log) {
        log.log('Camera> Location: ' + this.#location.x + ', ' + this.#location.y + ', ' + this.#location.z);
        log.log('Camera> Target: ' + this.#target.x + ', ' + this.#target.y + ', ' + this.#target.z);
        log.log('Camera> Up vector: ' + this.#up.x + ', ' + this.#up.y + ', ' + this.#up.z);
        log.log('Camera> Right vector: ' + this.#right.x + ', ' + this.#right.y + ', ' + this.#right.z);
        log.log('Camera> Rotation: ' + 'X: ' + this.#angle_x + ', Y: ' + this.#angle_y);
    }

    // Cubic Bezier interpolation between points
    #cubicBezier(p0, p1, p2, p3, t) {
        return p0
            .scale((1 - t) ** 3)
            .add(p1.scale(3 * (1 - t) ** 2 * t))
            .add(p2.scale(3 * (1 - t) * t ** 2))
            .add(p3.scale(t ** 3));
    }

    
    setAnimationPath(path) {
        this.#animation_path = path;
        this.#number_of_paths = path.length - 3; // For Catmull-Rom we need at least 4 points
        
        if (this.#number_of_paths < 1) {
            throw new Error('Number of paths must be at least 4.');
        }
    }

    // Convert Catmull-Rom to Bezier control points
    #getBezierControlPoints(segment) {
        // Get the 4 Catmull-Rom points for this segment
        const p0 = this.#animation_path[segment].position;
        const p1 = this.#animation_path[segment + 1].position;
        const p2 = this.#animation_path[segment + 2].position;
        const p3 = this.#animation_path[segment + 3].position;
        
        // The Bezier control points that match Catmull-Rom spline
        const b0 = p1;
        const b1 = p1.add(p2.subtract(p0).scale(1/6));
        const b2 = p2.subtract(p3.subtract(p1).scale(1/6));
        const b3 = p2;
        
        return [b0, b1, b2, b3];
    }

    // Similarly for target points
    #getBezierControlPointsForTarget(segment) {
        const p0 = this.#animation_path[segment].target;
        const p1 = this.#animation_path[segment + 1].target;
        const p2 = this.#animation_path[segment + 2].target;
        const p3 = this.#animation_path[segment + 3].target;
        
        const b0 = p1;
        const b1 = p1.add(p2.subtract(p0).scale(1/6));
        const b2 = p2.subtract(p3.subtract(p1).scale(1/6));
        const b3 = p2;
        
        return [b0, b1, b2, b3];
    }

    getCameraAnimatedPosition(progress) {
        // Clamp progress between 0 and number_of_paths - 1
        progress = Math.max(0, Math.min(progress, this.#number_of_paths - 0.0001));
        
        const segment = Math.floor(progress);
        const localProgress = progress - segment;
        
        const [b0, b1, b2, b3] = this.#getBezierControlPoints(segment);
        return this.#cubicBezier(b0, b1, b2, b3, localProgress);
    }

    getCameraAnimatedTarget(progress) {
        progress = Math.max(0, Math.min(progress, this.#number_of_paths - 0.0001));
        
        const segment = Math.floor(progress);
        const localProgress = progress - segment;
        
        const [b0, b1, b2, b3] = this.#getBezierControlPointsForTarget(segment);
        return this.#cubicBezier(b0, b1, b2, b3, localProgress);
    }
}