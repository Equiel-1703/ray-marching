#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 o_frag_color;

uniform vec3 u_camera_position;
uniform vec3 u_camera_target;
uniform vec3 u_camera_up;

uniform vec2 u_image_resolution;

// Defining objects structs
struct Sphere {
    vec3 position;
    float radius;
};

float s_distance_to_sphere(vec3 point, Sphere sphere) {
    return length(sphere.position - point) - sphere.radius;
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
    vec3 f = normalize(target);
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
RayHit find_nearest_surface(vec3 ray_origin, vec3 ray_direction, float max_distance)
{
    Sphere u_sphere;
    u_sphere.position = vec3(0.0f, 0.0f, 2.0f); // Sphere position in world space
    u_sphere.radius = 0.5f; // Sphere radius

    float distance = 0.0f;
    vec4 color = vec4(0.0f);

    // March along the ray
    for (int i = 0; i < MAX_STEPS; i++) {
        // Calculate the current point along the ray
        vec3 point = ray_origin + ray_direction * distance;

        // Check distance to the sphere
        float d = s_distance_to_sphere(point, u_sphere);
        if (d <= PROXIMITY_THRESHOLD) {
            color = vec4(0.1f, 0.45f, 0.67f, 1.0f);
            break;
        }

        // Move to the next point along the ray
        distance += d;

        // Check if we are too far away
        if (distance > max_distance) {
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
    RayHit hit = find_nearest_surface(u_camera_position, ray_direction, MAX_DISTANCE);

    if (hit.distance < MAX_DISTANCE) {
        // If we hit something, set the fragment color to the hit color darkened by the distance
        o_frag_color = vec4(hit.color.rgb * (1.0f - (hit.distance * 30.0f / MAX_DISTANCE)), 1.0f);
    } else {
        // If we didn't hit anything, just set to the default non-hit color
        o_frag_color = vec4(0.07f, 0.07f, 0.07f, 1.0f);
    }
}