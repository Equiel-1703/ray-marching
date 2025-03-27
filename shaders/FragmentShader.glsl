#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 o_frag_color;

uniform vec3 u_camera_position;
uniform vec3 u_camera_target;
uniform vec3 u_camera_up;

uniform vec2 u_image_resolution;

// ----------------------------- NOISE FUNCTIONS -----------------------------

// Hash function to generate pseudo-random gradients
vec3 hash3(vec3 p) {
    p = fract(p * vec3(443.897f, 441.423f, 437.195f));
    p += dot(p, p.yxz + 19.19f);
    return normalize(fract(vec3(p.x * p.y, p.z * p.x, p.y * p.z)) * 2.0f - 1.0f);
}

// Smoothstep function for interpolation
vec3 fade(vec3 t) {
    return t * t * (3.0f - 2.0f * t);
}

// Perlin 3D noise function
float perlin_noise_3d(vec3 p) {
    vec3 p_i = floor(p);
    vec3 p_f = fract(p);

    // Compute fade curves
    vec3 f = fade(p_f);

    // Get random gradients at cube corners
    vec3 g_000 = hash3(p_i + vec3(0.0f, 0.0f, 0.0f));
    vec3 g_100 = hash3(p_i + vec3(1.0f, 0.0f, 0.0f));
    vec3 g_010 = hash3(p_i + vec3(0.0f, 1.0f, 0.0f));
    vec3 g_110 = hash3(p_i + vec3(1.0f, 1.0f, 0.0f));

    vec3 g_001 = hash3(p_i + vec3(0.0f, 0.0f, 1.0f));
    vec3 g_101 = hash3(p_i + vec3(1.0f, 0.0f, 1.0f));
    vec3 g_011 = hash3(p_i + vec3(0.0f, 1.0f, 1.0f));
    vec3 g_111 = hash3(p_i + vec3(1.0f, 1.0f, 1.0f));

    // Compute dot products
    float n_000 = dot(g_000, p_f - vec3(0.0f, 0.0f, 0.0f));
    float n_100 = dot(g_100, p_f - vec3(1.0f, 0.0f, 0.0f));
    float n_010 = dot(g_010, p_f - vec3(0.0f, 1.0f, 0.0f));
    float n_110 = dot(g_110, p_f - vec3(1.0f, 1.0f, 0.0f));

    float n_001 = dot(g_001, p_f - vec3(0.0f, 0.0f, 1.0f));
    float n_101 = dot(g_101, p_f - vec3(1.0f, 0.0f, 1.0f));
    float n_011 = dot(g_011, p_f - vec3(0.0f, 1.0f, 1.0f));
    float n_111 = dot(g_111, p_f - vec3(1.0f, 1.0f, 1.0f));

    // Interpolation
    float n_x00 = mix(n_000, n_100, f.x);
    float n_x01 = mix(n_001, n_101, f.x);
    float n_x10 = mix(n_010, n_110, f.x);
    float n_x11 = mix(n_011, n_111, f.x);

    float n_xy0 = mix(n_x00, n_x10, f.y);
    float n_xy1 = mix(n_x01, n_x11, f.y);

    return mix(n_xy0, n_xy1, f.z);
}

// Multi-layered Perlin noise for craters and surface details
// This function generates fractal noise by summing multiple octaves of Perlin noise
float fbm(vec3 p) {
    float total = 0.0f;
    float amplitude = 0.5f;
    float frequency = 1.0f;
    const int OCTAVES = 5;

    for(int i = 0; i < OCTAVES; i++) {
        total += perlin_noise_3d(p * frequency) * amplitude;
        frequency *= 2.0f;
        amplitude *= 0.5f;
    }

    return total;
}

// ------------------------- SHAPE DEFINITIONS -------------------------

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

float sdf_sphere(vec3 point, Sphere sphere) {
    return length(sphere.position - point) - sphere.radius;
}

float sdf_quadrangle(vec3 point, Quadrangle cube) {
    vec3 d = abs(point - cube.position) - cube.size;
    return length(max(d, 0.0f)) + min(max(d.x, max(d.y, d.z)), 0.0f);
}

float sdf_flat_disk(vec3 p, vec3 center, float innerRadius, float outerRadius, float thickness) {
    vec2 q = vec2(length(p.xz - center.xy), abs(p.y - center.y));
    return max(q.y - thickness, max(innerRadius - q.x, q.x - outerRadius));
}

// ------------------------- RAY MARCH CONSTANTS -------------------------

// The proximity threshold is the distance at which we consider the ray to be close to the surface
const float PROXIMITY_THRESHOLD = 0.001f;
// The MAX_STEPS constant is the maximum number of steps we will take before giving up on finding a surface
const int MAX_STEPS = 100;
// The MAX_DISTANCE constant is the maximum distance we will search for a surface/light
const float MAX_DISTANCE = 300.0f;

// Return structure
struct RayHit {
    float distance;
    vec4 color;
};

// ------------------------- SCENE DEFINITION -------------------------

const vec3 SATURN_POSITION = vec3(0.0f, 0.0f, 0.0f);
const float SATURN_RADIUS = 30.0f;

const float RING_INNER_RADIUS = 50.0f;
const float RING_OUTER_RADIUS = 70.0f;
const float RING_THICKNESS = 0.04f;
const float RING_GLOW_POWER = 2.0f;
const float RING_GLOW_RADIUS = 6.0f;
const vec3 RING_GLOW_COLOR = vec3(0.1f, 0.5f, 1.0f);

const vec3 MOON_POSITION = vec3(50.0f, 50.0f, 30.0f);
const float MOON_RADIUS = 10.0f;
const vec4 MOON_COLOR = vec4(0.8f, 0.8f, 0.8f, 1.0f); // Light gray color

// This function defines the moon and returns its distance and color
RayHit moon(vec3 point) {
    Sphere moon;
    moon.position = MOON_POSITION;
    moon.radius = MOON_RADIUS;
    moon.color = MOON_COLOR;
    const float DISTORTION_FACTOR = 0.4f;

    RayHit ret;
    ret.distance = sdf_sphere(point, moon) + DISTORTION_FACTOR * fbm(point);
    ret.color = moon.color;

    return ret;
}

RayHit rings(vec3 p) {
    RayHit ret;

    float distance = sdf_flat_disk(p, SATURN_POSITION, RING_INNER_RADIUS, RING_OUTER_RADIUS, RING_THICKNESS);

    ret.distance = distance;
    ret.color = vec4(0.0f, 0.0f, 0.0f, 1.0f); // Default color, we will compute it in main

    return ret;
}

vec3 get_ring_color(vec3 p, vec3 normal, vec3 viewDir) {
    float dist = length(p.xz);
    float normDist = smoothstep(0.0f, 1.0f, (dist - RING_INNER_RADIUS) / (RING_OUTER_RADIUS - RING_INNER_RADIUS));
    float angle = atan(p.z, p.x);

    // Neon color palette
    vec3 neonBlue = vec3(0.1f, 0.5f, 1.0f) * 3.0f;
    vec3 neonPink = vec3(1.0f, 0.2f, 0.8f) * 3.0f;

    // Base ring color
    vec3 baseColor = mix(neonBlue, neonPink, 0.3f + sin(angle * 5.0f) * 0.3f);

    // Fresnel glow
    float fresnel = pow(1.0f - abs(dot(normal, viewDir)), 2.0f);
    baseColor += neonBlue * fresnel * 4.0f;

    return baseColor / (baseColor + 1.0f); // Tonemapping
}

// Get the glow intensity at point p
float get_glow_intensity(vec3 p) {
    float distance_to_rings_edge = sdf_flat_disk(p, SATURN_POSITION, RING_INNER_RADIUS, RING_OUTER_RADIUS, RING_THICKNESS);

    if (distance_to_rings_edge < RING_GLOW_RADIUS) {
        // Normalize the distance to the ring edge (0 to 1)
        float glow_intensity = distance_to_rings_edge / RING_GLOW_RADIUS;

        // Now we will invert it, so the further away from the edge, the dimmer the glow and apply a power function
        glow_intensity = 1.0f - pow(glow_intensity, RING_GLOW_POWER);


        glow_intensity = max(glow_intensity, 0.0f); // Ensure non-negative
        return glow_intensity;
    }

    return 0.0f; // No glow outside the ring radius
}

// This function defines the planet Saturn and returns its distance
RayHit saturn(vec3 point) {
    Sphere saturn;
    saturn.position = SATURN_POSITION;
    saturn.radius = SATURN_RADIUS;

    RayHit ret;
    ret.distance = sdf_sphere(point, saturn);
    ret.color = vec4(0.0f); // Default color, we will compute it in main

    return ret;
}

vec3 get_saturn_color(vec3 pos, vec3 normal, vec3 view_dir) {
    // Professional Saturn color palette
    const vec3 base_color = vec3(0.96f, 0.83f, 0.63f);  // Pale gold
    const vec3 band1_color = vec3(0.72f, 0.54f, 0.39f);  // Warm brown (replaced lavender)
    const vec3 band2_color = vec3(0.62f, 0.5f, 0.35f);  // Darker brown
    const vec3 polar_color = vec3(0.85f, 0.82f, 0.78f);  // Cool polar

    // Corrected coordinate calculation (pure latitude-based)
    float latitude = degrees(asin(normal.y));  // -90 to +90 degrees
    float abs_lat = abs(latitude);

    // Multi-scale bands (latitude only - no tilt)
    float band_large = sin(latitude * 0.18f);         // Primary bands
    float band_medium = sin(latitude * 0.6f) * 0.7f;   // Secondary bands
    float band_detail = sin(latitude * 3.0f) * 0.3f;   // Fine details

    // Combined pattern (vertical bands only)
    float pattern = band_large + band_medium + band_detail;

    // Band masking (sharper at equator, softer at poles)
    float band_mask = 1.0f - smoothstep(20.0f, 70.0f, abs_lat);
    float bands = smoothstep(-0.4f, 0.4f, pattern) * band_mask;

    // Polar regions
    float polar = smoothstep(75.0f, 85.0f, abs_lat);

    // Final color mixing
    vec3 color = mix(base_color, mix(band1_color, band2_color, smoothstep(-0.5f, 0.5f, band_medium)),  // Band color variation
    bands);

    // Apply polar darkening
    color = mix(color, polar_color, polar);

    // Subtle noise texture (vertical streaks only)
    float noise = fract(sin(dot(pos.xz, vec2(12.9898f, 4.1414f))) * 43758.5453f);
    color = mix(color, color * 1.05f, noise * 0.08f);

    return color;
}

// This function returns the distance and color of the nearest surface in the scene
// It is called from the ray_march function
// Updated scene function with rings
RayHit scene(vec3 point) {
    const int NO_OBJECTS = 3; // Number of objects in the scene

    RayHit moon = moon(point);
    RayHit saturn = saturn(point);
    RayHit rings = rings(point);

    // Find nearest solid object
    RayHit hits[NO_OBJECTS] = RayHit[NO_OBJECTS](moon, saturn, rings);
    RayHit nearest = hits[0];
    
    for(int i = 1; i < NO_OBJECTS; i++) {
        if(hits[i].distance < nearest.distance) {
            nearest = hits[i];
        }
    }

    return nearest;
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
    float depth = 0.0f;
    float glow = 0.0f;

    RayHit final_hit;
    final_hit.distance = max_distance;
    final_hit.color = vec4(0.0f, 0.0f, 0.0f, 1.0f); // Default color (black)

    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 point = ray_origin + ray_direction * depth;

        // Accumulate glow intensity at the current point
        glow += get_glow_intensity(point);

        // Get hit information from the scene
        RayHit hit = scene(point);

        if(hit.distance <= PROXIMITY_THRESHOLD) {
            final_hit.distance = depth + hit.distance;
            final_hit.color = hit.color + vec4(glow * RING_GLOW_COLOR, 0.0f); // Add glow to the color
            return final_hit;
        }

        depth += hit.distance;

        if(depth > max_distance) {
            break;
        }
    }

    final_hit.color.rgb = glow * RING_GLOW_COLOR;
    final_hit.color.a = 1.0f; // Fully opaque if no hit

    return final_hit;
}
// ------------------------- LIGHTING -------------------------

// Light positions
vec3 sun_dir = normalize(vec3(3.8f, 6.0f, -3.0f)); // Example direction
const float SUN_INTENSITY = 200.0f; // Bright enough to light planets
const float SUN_ANGULAR_RADIUS = 0.005f; // Controls soft shadows (smaller = sharper)

vec3 light_1 = vec3(0.0f, 5.0f, -50.0f);
const float LIGHT_INTENSITY = 1.0f; // Light intensity

// This function approximates the normal at a point in space by sampling the distance function
// at small variations around the point
// This is a common technique in ray marching to get the normal vector, it is called gradient estimation
vec3 get_normal(vec3 p) {
    const float DIST = 0.001f; // Small distance to sample the distance function
    vec3 n;
    n.x = scene(p + vec3(DIST, 0.0f, 0.0f)).distance - scene(p - vec3(DIST, 0.0f, 0.0f)).distance;
    n.y = scene(p + vec3(0.0f, DIST, 0.0f)).distance - scene(p - vec3(0.0f, DIST, 0.0f)).distance;
    n.z = scene(p + vec3(0.0f, 0.0f, DIST)).distance - scene(p - vec3(0.0f, 0.0f, DIST)).distance;
    return normalize(n);
}

float calculate_light_attenuation(float distance_to_light) {
    // Inverse square law with minimum distance to prevent singularity
    float d = max(distance_to_light, 0.1f);
    return 1.0f / (1.0f + d * d);  // The 1.0+ makes it finite at d=0
}

// Simple tone mapping to prevent over-brightening
float tone_map(float light) {
    return light / (1.0f + light);
}

// Directional light for the sun
float compute_sun_light(vec3 p, vec3 normal) {
    float sun_diff = max(dot(normal, sun_dir), 0.0f);
    return sun_diff * SUN_INTENSITY;
}

float compute_sun_shadow(vec3 p, vec3 light_dir) {
    float shadow = 1.0f;
    float t = 0.02f; // Bias to avoid self-shadowing
    const int steps = 64; // More steps for planetary accuracy

    // Jitter light direction for soft shadows
    vec3 jittered_dir = light_dir;
    for(int i = 0; i < steps; i++) {
        float d = scene(p + jittered_dir * t).distance;

        if(d < PROXIMITY_THRESHOLD) {
            return 0.0f; // Hard shadow in core umbra
        }

        // Soft shadow calculation considering sun's angular size
        shadow = min(shadow, SUN_ANGULAR_RADIUS * d / t);
        t += d;

        if(t > MAX_DISTANCE)
            break;
    }
    return clamp(shadow, 0.0f, 1.0f);
}

// Compute the specular lighting at a point in space (Blinn-Phong)
float compute_specular(vec3 p, vec3 view_dir) {
    const float SHININESS = 32.0f; // Higher = sharper highlights

    vec3 normal = get_normal(p);
    vec3 light_dir = normalize(light_1 - p);
    vec3 halfway_dir = normalize(light_dir + view_dir);

    float spec = pow(max(dot(normal, halfway_dir), 0.0f), SHININESS);
    float atten = calculate_light_attenuation(length(light_1 - p));

    return spec * atten * LIGHT_INTENSITY;
}

// Compute the shadow factor at a point in space
// The ray marches from the point to the light source and checks if it hits any object
// The k factor is used to control the softness of the shadow
float compute_shadow(vec3 ro, vec3 rd) {
    float t = 0.02f;            // Start slightly above the surface to avoid self-shadowing
    float shadow = 1.0f;        // Shadow factor (1 = no shadow, 0 = full shadow)
    float softness = 16.0f;     // Higher = softer shadows

    const int MAX_STEPS = 32; // Number of steps to take in the shadow ray (more steps = better details)

    for(int i = 0; i < MAX_STEPS; i++) {
        float d = scene(ro + rd * t).distance;

        if(d < PROXIMITY_THRESHOLD)
            return 0.0f; // Fully in shadow

        // Smooth soft shadow calculation
        shadow = min(shadow, softness * d / t);

        t += d;
        if(t >= MAX_DISTANCE)
            break; // Stop if we go too far
    }

    return clamp(shadow, 0.0f, 1.0f);
}

// Compute the light intesity at a point in space, considering ambient, diffuse and specular components
// This function combines the diffuse and specular lighting with shadows
// It returns a value between 0.0 and 1.0
float compute_lighting_and_shadows(vec3 p, vec3 view_dir) {
    float ambient = 0.02f; // Very low ambient (space is dark!)

    // Point light (for other light sources)
    vec3 light_dir = normalize(light_1 - p);
    float point_diffuse = max(dot(get_normal(p), light_dir), 0.0f);
    float point_atten = calculate_light_attenuation(length(light_1 - p));
    float point_light = point_diffuse * point_atten * LIGHT_INTENSITY;
    float point_shadow = compute_shadow(p, light_dir);

    // Sun light (main planetary light)
    float sun_light = compute_sun_light(p, get_normal(p));
    float sun_shadow = compute_sun_shadow(p, sun_dir);

    // Specular (only for point light to avoid unrealistic sun specular)
    float specular = compute_specular(p, view_dir) * point_shadow;

    // Combine with tone mapping
    float total = ambient +
        point_light * point_shadow +
        sun_light * sun_shadow +
        specular;

    return tone_map(total);
}

// ---------------------------------------- UTILITIES ----------------------------------------
/**
 * Return the normalized direction to march in from the camera to a single pixel.
 * 
 * fieldOfView: vertical field of view in degrees
 * size: resolution of the output image
 * fragCoord: the x,y coordinate of the pixel in the output image
 */
vec3 ray_direction(float field_of_view, vec2 size, vec2 frag_coord) {
    // This is taking the fragCoord (which goes from 0 to size)
    // and converting its to a coordinate range [-size/2, size/2]
    vec2 xy = frag_coord - size / 2.0f;

    // Calculate distance from the camera to the near plane
    // This uses a trigonometric trick to calculate the distance
    float z = size.y / tan(radians(field_of_view) / 2.0f);

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


void main() {
    // Calculate ray direction
    vec2 pixel_coord = v_uv * u_image_resolution;
    mat3 view_to_world = view_to_world_matrix(u_camera_position, u_camera_target, u_camera_up);
    vec3 ray_direction = view_to_world * ray_direction(60.0f, u_image_resolution, pixel_coord);

    // Ray march through the scene
    RayHit hit = ray_march(u_camera_position, ray_direction, MAX_DISTANCE);

    if(hit.distance < MAX_DISTANCE) {
        vec3 point = u_camera_position + ray_direction * hit.distance;
        vec3 view_dir = normalize(u_camera_position - point);

        vec3 surface_color = vec3(0.0f);
        float alpha = 1.0f;

        // Determine what we hit
        if(rings(point).distance <= PROXIMITY_THRESHOLD) {
            // Ring specific shading
            vec3 ring_normal = vec3(0, sign(point.y), 0);
            surface_color = get_ring_color(point, ring_normal, view_dir);
            alpha = 0.8f; // Slightly transparent rings
        } else if(saturn(point).distance <= PROXIMITY_THRESHOLD) {
            // Planet shading
            vec3 normal = get_normal(point);
            surface_color = get_saturn_color(point, normal, view_dir) + hit.color.rgb;

            // Apply lighting to planets (not rings)
            float light_intensity = compute_lighting_and_shadows(point, view_dir);
            surface_color *= light_intensity;
        } else if(moon(point).distance <= PROXIMITY_THRESHOLD + 0.1f) {
            // Moon shading (use the color alredy set in moon() function)
            surface_color = hit.color.rgb;

            // Apply lighting to moon
            float light_intensity = compute_lighting_and_shadows(point, view_dir);
            surface_color *= light_intensity;
        }

        o_frag_color = vec4(surface_color, alpha);
    } else {
        // Apply default color
        o_frag_color = hit.color;
    }
}