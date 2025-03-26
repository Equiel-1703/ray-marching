#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 o_frag_color;

uniform vec3 u_camera_position;
uniform vec3 u_camera_target;
uniform vec3 u_camera_up;

uniform vec2 u_image_resolution;

// Utility stuff
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1f, 311.7f, 74.7f))) * 43758.5453f);
}

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec3(1, 0, 0));
    float c = hash(i + vec3(0, 1, 0));
    float d = hash(i + vec3(1, 1, 0));

    float e = hash(i + vec3(0, 0, 1));
    float f1 = hash(i + vec3(1, 0, 1));
    float g = hash(i + vec3(0, 1, 1));
    float h = hash(i + vec3(1, 1, 1));

    vec3 u = f * f * (3.0f - 2.0f * f);

    return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f1, u.x), mix(g, h, u.x), u.y), u.z);
}

float turbulence(vec3 p) {
    float sum = 0.0;
    float scale = 1.0;
    float weight = 1.0;

    for (int i = 0; i < 4; i++) {  // 4 octaves of noise
        sum += abs(noise(p * scale)) * weight;
        scale *= 2.0;
        weight *= 0.5;
    }

    return sum;
}

// Defining objects structs
struct Sphere {
    vec3 position;
    float radius;
    vec4 color;
};

struct Quadrangle {
    vec3 position;
    vec3 size;
    vec4 color;
};

float SDF_Sphere(vec3 point, Sphere sphere) {
    return length(sphere.position - point) - sphere.radius;
}

float SDF_Quadrangle(vec3 point, Quadrangle cube) {
    vec3 d = abs(point - cube.position) - cube.size;
    return length(max(d, 0.0f)) + min(max(d.x, max(d.y, d.z)), 0.0f);
}

/**
 * Return the normalized direction to march in from the camera to a single pixel.
 * 
 * fieldOfView: vertical field of view in degrees
 * size: resolution of the output image
 * fragCoord: the x,y coordinate of the pixel in the output image
 */
vec3 ray_direction(float fieldOfView, vec2 size, vec2 fragCoord) {
    // This is taking the fragCoord (which goes from 0 to size)
    // and converting its to a coordinate range [-size/2, size/2]
    vec2 xy = fragCoord - size / 2.0f;

    // Calculate distance from the camera to the near plane
    // This uses a trigonometric trick to calculate the distance
    float z = size.y / tan(radians(fieldOfView) / 2.0f);

    // Return the normalized direction vector
    return normalize(vec3(xy, z));
}

/**
 * Return a transform matrix that will transform a ray from view space
 * to world coordinates, given the camera location, the camera target, and an up vector.
 *
 * This assumes that the camera is looking at the positive z direction.
 */
mat3 view_to_world_matrix(vec3 cam_location, vec3 target, vec3 up) {
    vec3 f = normalize(target); // Forward vector
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat3(s, u, f);
}

// RAY MARCH CONSTANTS

// The proximity threshold is the distance at which we consider the ray to be close to the surface
const float PROXIMITY_THRESHOLD = 0.01f;
// The MAX_STEPS constant is the maximum number of steps we will take before giving up on finding a surface
const int MAX_STEPS = 100;

// Return structure
struct RayHit {
    float distance;
    vec4 color;
};

// ------------------------- SCENE DEFINITION -------------------------

// This function returns the distance and color of the nearest surface in the scene
// It is called from the ray_march function
RayHit scene(vec3 point) {
    Sphere moon;
    Quadrangle q1;

    // Define a sphere
    moon.position = vec3(0.0f, 1.0f, 5.0f);
    moon.radius = 1.0f;
    moon.color = vec4(1.0f, 0.0f, 0.0f, 1.0f); // Red
    float moon_dist_amount = 0.2f;

    // Define a cube
    q1.position = vec3(0.0f, -1.0f, 5.0f);
    q1.size = vec3(1.0f, 1.0f, 1.0f);
    q1.color = vec4(0.0f, 1.0f, 0.0f, 1.0f); // Green

    // Calculate the distance to the moon
    float d1 = SDF_Sphere(point, moon) + moon_dist_amount * turbulence(point * 1.0f);

    // Calculate the distance to the cube
    float d2 = SDF_Quadrangle(point, q1);

    float dist = min(d1, d2);
    vec4 color = max(moon.color, q1.color);

    return RayHit(dist, color);
}

// ------------------------- RAY MARCHING -------------------------

/**
 * Finds the nearest surface along a ray within a specified maximum distance.
 *
 * ray_origin: The starting point of the ray in world space.
 * ray_direction: The direction of the ray in world space.
 * max_distance: The maximum distance to search for a surface.
 *
 * Returns a RayHit structure containing the distance to the nearest surface and its color.
 * If nothing is found, the distance will be set to max_distance and the color will be black.
 */
RayHit ray_march(vec3 ray_origin, vec3 ray_direction, float max_distance) {
    float distance = 0.0f;
    vec4 color = vec4(0.0f);

    // March along the ray
    for(int i = 0; i < MAX_STEPS; i++) {
        // Calculate the current point along the ray
        vec3 point = ray_origin + ray_direction * distance;

        // Check distance to the sphere
        RayHit hit = scene(point);
        if(hit.distance <= PROXIMITY_THRESHOLD) {
            return RayHit(distance + hit.distance, hit.color);
        }

        // Move to the next point along the ray
        distance += hit.distance;

        // Check if we are too far away
        if(distance > max_distance) {
            break;
        }
    }

    return RayHit(distance, color);
}

void main() {
    // Use uv to calculate the pixel coordinate (in view space)
    // The pixel coordinate is in the range [0, u_image_resolution]
    vec2 pixel_coord = v_uv * u_image_resolution;

    // Create matrix to transform from view space to world space
    mat3 view_to_world = view_to_world_matrix(u_camera_position, u_camera_target, u_camera_up);

    // Calculate the ray direction in view space
    vec3 ray_direction = ray_direction(60.0f, u_image_resolution, pixel_coord);
    // Transform the ray direction to world space
    ray_direction = view_to_world * ray_direction; // ray_direction is now in world space

    // Let's set the maximum distance to search for a surface
    const float MAX_DISTANCE = 100.0f;

    // Let's get the closest surface from the camera for the current pixel
    RayHit hit = ray_march(u_camera_position, ray_direction, MAX_DISTANCE);

    if(hit.distance < MAX_DISTANCE) {
        // If we hit something, set the fragment color to the hit color darkened by the distance
        o_frag_color = vec4(hit.color.rgb * (1.0f - (hit.distance * 5.0f / MAX_DISTANCE)), 1.0f);
    } else {
        // If we didn't hit anything, just set to the default non-hit color
        o_frag_color = vec4(0.07f, 0.07f, 0.07f, 1.0f);
    }
}