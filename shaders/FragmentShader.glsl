#version 300 es
precision highp float;

in vec2 v_uv;
in vec4 o_vertex_color;
out vec4 o_frag_color;

uniform mat4 u_camera_matrix;
uniform mat4 u_projection_matrix;
uniform vec2 u_image_resolution;

void main() {
    o_frag_color = o_vertex_color;
}