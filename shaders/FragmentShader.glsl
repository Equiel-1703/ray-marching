#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 o_frag_color;

uniform vec3 u_camera_position;
uniform vec2 u_image_resolution;

const float THRESHOLD = 0.01f;
const int MAX_STEPS = 100;

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
 * to world coordinates, given the eye point, the camera target, and an up vector.
 *
 * This assumes that the camera is looking at the positive z direction.
 */
mat3 view_to_world_matrix(vec3 eye, vec3 center, vec3 up) {
    vec3 f = normalize(center - eye);
    vec3 s = normalize(cross(f, up));
    vec3 u = cross(s, f);
    return mat3(s, u, f);
}

void main() {
    Sphere u_sphere;
    u_sphere.position = vec3(0.0f, 0.0f, 10.0f); // Sphere position in world space
    u_sphere.radius = 0.5f; // Sphere radius

    // Create matrix to transform from view space to world space
    mat3 view_to_world = view_to_world_matrix(u_camera_position, vec3(0.0f, 0.0f, 1.0f), vec3(0.0f, 1.0f, 0.0f));

    // Use uv to calculate the pixel coordinate (in view space)
    // The pixel coordinate is in the range [0, u_image_resolution]
    vec2 pixel_coord = v_uv * u_image_resolution;

    // Calculate the ray direction in view space
    vec3 ray_direction = ray_direction(60.0f, u_image_resolution, pixel_coord);
    // Transform the ray direction to world space
    ray_direction = view_to_world * ray_direction; // ray_direction is now in world space

    vec3 reference_point = u_camera_position; // Start at the camera position
    float depth = 0.0f;
    float max_distance = 100.0f;
    int steps = 0;

    while(steps < MAX_STEPS) {
        // Calculate the distance to the sphere
        float distance = s_distance_to_sphere(reference_point, u_sphere);

        // Check if we are inside the sphere
        if(distance < 0.0f) {
            o_frag_color = vec4(1.0f, 0.0f, 0.0f, 1.0f); // Red color for inside the sphere
            return;
        }

        if (distance <= THRESHOLD) {
            o_frag_color = vec4(0.08f, 0.31f, 0.63f, 1.0f); // Color the sphere surface
            return;
        }

        // Move the reference point along the ray
        reference_point += ray_direction * distance;

        // Update the depth
        depth += distance;

        // Check if we are too far away
        if (depth > max_distance) {
            o_frag_color = vec4(0.0f, 0.0f, 0.0f, 1.0f); // Green color for max distance reached
            return;
        }

        // Increment the step count
        steps++;
    }

    if (steps >= MAX_STEPS) {
        o_frag_color = vec4(0.0f, 0.0f, 0.0f, 1.0f); // Black color for max steps reached
        return;
    }
}