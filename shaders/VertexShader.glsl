#version 300 es

in vec3 a_position;

out vec2 v_uv;
out vec4 o_vertex_color;

void main() {
    v_uv = (a_position.xy + 1.0f) / 2.0f;
    gl_Position = vec4(a_position, 1.0);
    o_vertex_color = vec4(1.0f, 0.0f, 0.0f, 1.0f);
}