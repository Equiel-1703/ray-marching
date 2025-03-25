#version 300 es

in vec3 a_position;
out vec2 v_uv;

void main() {
    // Convert from Normalized Device Coordinates (NDC) to UV coordinates
    // NDC coordinates are in the range [-1, 1]
    // UV coordinates are in the range [0, 1]
    v_uv = (a_position.xy + 1.0f) / 2.0f;

    gl_Position = vec4(a_position, 1.0f);
}