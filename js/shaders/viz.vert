precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional

// attribute vec4 color;
attribute float alpha;
attribute vec3 position;
attribute float value;

// colormap texture
uniform sampler2D uColormapTex;

// This attributes are the result of data processing in processData.js
// and BufferAttribute creation in visualization.js

varying vec3 vColor;
varying float vAlpha;

void main() {

    vColor = texture2D(uColormapTex, vec2(alpha, 0.5)).rgb;
    vAlpha= alpha;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}

