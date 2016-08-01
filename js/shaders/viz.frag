precision mediump float;
precision mediump int;

varying vec3 vColor;
varying float vAlpha;

void main() {

    // gl_FragColor = vec4( 1.0, 0.0, 0.0, vAlpha );
    if ( vAlpha < 1e-10 )
        discard;
    else
        gl_FragColor = vec4( vColor, 1.0 );

}

