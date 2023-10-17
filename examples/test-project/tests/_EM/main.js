/**
 * @author ciphrd
 *
 * This project is based on the following paper:
 * Characteristics of pattern formation and evolution in approximations of physarum transport networks
 * Jeff Jones
 *
 * A few iterations were added to the original to idea to allow for more complex patterns to emerge.
 * I wrote an article about using agent-based simulations with deposited substrate as communication
 * layer, somehow relevant to this piece:
 * https://ciphrd.com/2021/07/07/particle-interactions-using-deposited-substrate-as-communication-layer-ds-cl/
 *
 * This system uses multiple species of Phydarum with randomized but controlled parameters. Each
 * species deposit and interacts with its own subtrate in the environment. Species can also "eat"
 * the substrate of other species. Finally, species have their parameters mutated when over the
 * subtrate of another specie.
 */

//
// SHADERS
//

const quadVS = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  // since a_position is [-1; 1] and we have a quad, we can "cheat" uvs by
  // remapping the coordinates of the points to [0; 1]
  v_uv = a_position*0.5+0.5;
  gl_Position = vec4(a_position, 0, 1);
}`

const drawVS = `#version 300 es
in vec2 a_texcoord;
uniform sampler2D u_position;
uniform float u_pointsize;
out vec2 v_texcoord;

void main() {
  // pass to fragment
  v_texcoord = a_texcoord;
  // grab position from the texture
  vec4 agent = texture(u_position, a_texcoord);
  // turn the position from [0; 1] to [-1; -1]
  gl_Position = vec4(agent.xy*2.0-1.0, 0, 1);
  gl_PointSize = u_pointsize;
}`

const drawFS = `#version 300 es
precision mediump float;
#define NB_GROUPS 12
uniform sampler2D u_group;
uniform float u_deposit;
in vec2 v_texcoord;

layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;
layout(location = 2) out vec4 outColor2;
layout(location = 3) out vec4 outColor3;

void main() {
  // get the group
  int group = int(texture(u_group, v_texcoord).r);

  vec4 color0 = vec4(0);
  vec4 color1 = vec4(0);
  vec4 color2 = vec4(0);
  vec4 color3 = vec4(0);

  // on which buffer the group should be rendered
  int outputBuffer = int(group / 3);
  // on which component the group should be renderer ?
  int outputComponent = group % 3;

  if (outputBuffer == 0) {
    color0[outputComponent] = u_deposit;
  }
  else if (outputBuffer == 1) {
    color1[outputComponent] = u_deposit;
  }
  else if (outputBuffer == 2) {
    color2[outputComponent] = u_deposit;
  }
  else if (outputBuffer == 3) {
    color3[outputComponent] = u_deposit;
  }

  outColor0 = vec4(color0);
  outColor1 = vec4(color1);
  outColor2 = vec4(color2);
  outColor3 = vec4(color3);
}`

const updateVS = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0, 1);
}`

const updateFS = `#version 300 es
precision highp float;
uniform sampler2D u_substrate0;
uniform sampler2D u_substrate1;
uniform sampler2D u_substrate2;
uniform sampler2D u_substrate3;
uniform sampler2D u_agents;
uniform sampler2D u_groups;
uniform sampler2D u_features;
uniform sampler2D u_random;
uniform sampler2D u_drawing;
uniform float u_randomResolution;
uniform vec2 u_texResolution;
uniform float u_frame;
uniform float u_mutation;
uniform float u_shock;
uniform float u_centerAttraction;

const float PI  = 3.141592653;

// to ensure consistent randomness regardless of graphic driven, a pre-seed
// random texture is used in coordination with the frame count to shift the
// index (in fact because of rendering this is useless but now it's there)
float rand(in vec2 P){
  vec2 del = vec2(
    mod(u_frame, u_randomResolution),
    floor(u_frame / u_randomResolution)
  ) / u_randomResolution;
  return texture(u_random, P + del).r;
}

vec2 toroidal(vec2 p) {
  return fract(p + vec2(1.0));
}

float sampleEnv(int idx, int comp, vec2 P, float DS) {
  P = toroidal(P);
  vec3 S;
  if (idx == 0) {
    S = texture(u_substrate0, P).rgb;
  } else if (idx == 1) {
    S = texture(u_substrate1, P).rgb;
  } else if (idx == 2) {
    S = texture(u_substrate2, P).rgb;
  } else {
    S = texture(u_substrate3, P).rgb;
  }
  S+= texture(u_drawing, P).r * DS;
  return S[comp];
}

out vec4 outColor0;

void main() {
  // compute tex coord
  vec2 uv = gl_FragCoord.xy / u_texResolution;

  // sample texture to get pos/group
  vec4 agent = texture(u_agents, uv);
  float group = texture(u_groups, uv).r;

  // sample the features from the group
  vec4 features = texture(u_features, vec2((group+0.5)/12.0, 0.5));

  // which subtrate map needs to be used
  int substrateIdx = int(group / 3.0);
  int component = int(group) % 3;

  float SA = features.x;
  float RA = features.y;
  float SO = features.z;
  float SS = features.w;

  // introduce mutations based on the subtrate of another specie
  int mutationSubIdx = (substrateIdx + 1) % 4;
  float mutationSub = sampleEnv(mutationSubIdx, component, agent.xy, 0.0);

  SA+= mutationSub * u_mutation;
  RA+= mutationSub * u_mutation;
  SO+= mutationSub * u_mutation;
  SS+= (4.0 * mutationSub) / u_texResolution.x * u_mutation;

  float angle = agent.z;

  // position of the sensors
  vec2 SL = agent.xy + vec2(cos(angle - SA), sin(angle - SA)) * SO;
  vec2 SM = agent.xy + vec2(cos(angle), sin(angle)) * SO;
  vec2 SR = agent.xy + vec2(cos(angle + SA), sin(angle + SA)) * SO;

  // sample the environment under the sensors
  float L = sampleEnv(substrateIdx, component, SL, 1.0);
  float M = sampleEnv(substrateIdx, component, SM, 1.0);
  float R = sampleEnv(substrateIdx, component, SR, 1.0);

  if (M < L && M < R) {
    agent.z += (round(rand(agent.xy))*2.0-1.0) * RA;
  }
  else if (L < R) {
    agent.z += RA;
  }
  else if (L > R) {
    agent.z -= RA;
  }

  // current direction
  vec2 dir = vec2(cos(agent.z), sin(agent.z));

  // move strength
  vec2 mv = dir * mix(1.0, sampleEnv(substrateIdx, component, agent.xy, 0.0), 0.5) * SS;
  
  // update position
  agent.xy = agent.xy + mv;

  // move in random direction when shocked
  agent.xy += vec2(
    rand(agent.xy + dir * 0.1) - 0.5,
    rand(agent.xy + dir * 0.414) - 0.5
  ) * u_shock;

  // attraction towards the center
	vec2 p = agent.xy - 0.5;
  if (u_centerAttraction < 0.0) {
    agent.xy+= normalize(p) * u_centerAttraction;
  }
  else {
    agent.xy+= p * u_centerAttraction * 4.0;
  }

  // circle world
	float l = length(p);
	if (l > 0.48) {
		agent.xy = normalize(p) * (0.01 * rand(agent.xy)) + 0.5;
	}
	else if (l > 0.47) {
		agent.z+= PI * 0.5;
	}

  outColor0 = vec4(agent.xyz, agent.w);
}`

const envFS = `#version 300 es
precision highp float;
#define u_eat 2.0
uniform sampler2D u_texture0;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
uniform sampler2D u_insertion0;
uniform sampler2D u_insertion1;
uniform sampler2D u_insertion2;
uniform sampler2D u_insertion3;
uniform sampler2D u_drawing;
uniform float u_decay;
uniform float u_deposit;
uniform int u_addinteractions;
uniform vec2 u_mousepos;
uniform float u_mouse;
uniform float u_mouseinsert;

in vec2 v_uv;

layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;
layout(location = 2) out vec4 outColor2;
layout(location = 3) out vec4 outColor3;

void main() {
  // sample the substrate
  vec4 substrate0 = texture(u_texture0, v_uv) * u_decay;
  vec4 substrate1 = texture(u_texture1, v_uv) * u_decay;
  vec4 substrate2 = texture(u_texture2, v_uv) * u_decay;
  vec4 substrate3 = texture(u_texture3, v_uv) * u_decay;

  vec4 color0 = substrate0;
  vec4 color1 = substrate1;
  vec4 color2 = substrate2;
  vec4 color3 = substrate3;

  // sample the insertion
  vec4 insert0 = texture(u_insertion0, v_uv);
  vec4 insert1 = texture(u_insertion1, v_uv);
  vec4 insert2 = texture(u_insertion2, v_uv);
  vec4 insert3 = texture(u_insertion3, v_uv);

  // for each layer, add new one and previous
  color0 += insert0 * u_deposit;
  color1 += insert1 * u_deposit;
  color2 += insert2 * u_deposit;
  color3 += insert3 * u_deposit;

  // now add species eating other substrate
  color0.r -= substrate0.g * u_eat;
  color0.g -= substrate0.b * u_eat;
  color0.b -= substrate1.r * u_eat;
  color1.r -= substrate1.g * u_eat;
  color1.g -= substrate1.b * u_eat;
  color1.b -= substrate0.r * u_eat;
  color2.r -= substrate2.g * u_eat;
  color2.g -= substrate2.b * u_eat;
  color2.b -= substrate3.r * u_eat;
  color3.r -= substrate3.g * u_eat;
  color3.g -= substrate3.b * u_eat;
  color3.b -= substrate2.r * u_eat;

  if (u_addinteractions == 1) {
    color0.r -= substrate1.g * u_eat;
    color0.g -= substrate1.b * u_eat;
    color0.b -= substrate2.r * u_eat;
    color1.r -= substrate2.g * u_eat;
    color1.g -= substrate2.b * u_eat;
    color1.b -= substrate1.r * u_eat;
    color2.r -= substrate3.g * u_eat;
    color2.g -= substrate3.b * u_eat;
    color2.b -= substrate0.r * u_eat;
    color3.r -= substrate0.g * u_eat;
    color3.g -= substrate0.b * u_eat;
    color3.b -= substrate3.r * u_eat;
  }

  // insertion from the mouse & clamp
  float mouse = smoothstep(0.2, 0.01, length(u_mousepos - v_uv)) * u_mouse * 2.0;
  color0.rgb -= vec3(mouse) * (1.0 * -u_mouseinsert);
  color0 = clamp(color0, vec4(0), vec4(1.5));
  color1.rgb -= vec3(mouse) * (1.0 * -u_mouseinsert);
  color1 = clamp(color1, vec4(0), vec4(1.5));
  color2.rgb -= vec3(mouse) * (1.0 * -u_mouseinsert);
  color2 = clamp(color2, vec4(0), vec4(1.5));
  color3.rgb -= vec3(mouse) * (1.0 * -u_mouseinsert);
  color3 = clamp(color3, vec4(0), vec4(1.5));

  float drawing = texture(u_drawing, v_uv).r * 0.3;
  color0.r += drawing;
  color1.r += drawing;
  color2.r += drawing;
  color3.r += drawing;

  outColor0 = color0;
  outColor1 = color1;
  outColor2 = color2;
  outColor3 = color3;
}`

const dotsFS = `#version 300 es
precision mediump float;
uniform float u_rand;
in vec2 v_uv;
out vec4 outColor;

// found somewhere on the World Wide West
float rand(vec2 n) { 
	return fract(sin(dot(n, vec2(12.9898 + u_rand, 4.1414))) * 43758.5453);
}

vec2 rand2(vec2 n) {
  return vec2(rand(n), rand(n + vec2(0.0, 0.8)));
}

// generate dots randomly distributed on the plane with some variations in size / colros
void main() {
  vec2 id = floor(v_uv * 16.0);
  vec2 iuv = fract(v_uv * 16.0);
  vec2 N;
  float R, S, fi, St;
  float dots = 0.0;
  float r_uv = rand(v_uv);
  for (int i = 0; i < 20; i++) {
    fi = float(i);
    N = (rand2(id * (0.01+0.1*fi)) - 0.5) * 0.9 + 0.5;
    R = rand(id * (0.02+0.2*fi));
    St = rand(id * (0.08745+0.745*fi));
    dots += smoothstep(0.01 + 0.1 * R, 0.001, length(N - iuv)) * pow(St, 2.0) * 0.1 * r_uv;
  }
  outColor = vec4(dots);
}`

const gaussian1dFS = `#version 300 es
precision highp float;
const float[] kernel = float[2]( 0.5, 0.25 );
uniform vec2 u_dir;
uniform sampler2D u_substrate0;
uniform sampler2D u_substrate1;
uniform sampler2D u_substrate2;
uniform sampler2D u_substrate3;

in vec2 v_uv;

layout(location = 0) out vec4 outColor0;
layout(location = 1) out vec4 outColor1;
layout(location = 2) out vec4 outColor2;
layout(location = 3) out vec4 outColor3;

void main() {
  vec4 color0 = texture(u_substrate0, v_uv) * kernel[0];
  vec4 color1 = texture(u_substrate1, v_uv) * kernel[0];
  vec4 color2 = texture(u_substrate2, v_uv) * kernel[0];
  vec4 color3 = texture(u_substrate3, v_uv) * kernel[0];

  color0 += texture(u_substrate0, v_uv + u_dir) * kernel[1];
  color0 += texture(u_substrate0, v_uv + u_dir * -1.0) * kernel[1];
  color1 += texture(u_substrate1, v_uv + u_dir) * kernel[1];
  color1 += texture(u_substrate1, v_uv + u_dir * -1.0) * kernel[1];
  color2 += texture(u_substrate2, v_uv + u_dir) * kernel[1];
  color2 += texture(u_substrate2, v_uv + u_dir * -1.0) * kernel[1];
  color3 += texture(u_substrate3, v_uv + u_dir) * kernel[1];
  color3 += texture(u_substrate3, v_uv + u_dir * -1.0) * kernel[1];   
   
  outColor0 = color0;
  outColor1 = color1;
  outColor2 = color2;
  outColor3 = color3;
}`

const renderFS = `#version 300 es
precision mediump float;
uniform sampler2D u_substrate0;
uniform sampler2D u_substrate1;
uniform sampler2D u_substrate2;
uniform sampler2D u_substrate3;
uniform sampler2D u_colors;

in vec2 v_uv;

out vec4 outColor;

void main() {
  // manual unroll lol vs code help
  vec4 color0 = texture(u_colors, vec2(0.5/12.0, 0.5));
  vec4 color1 = texture(u_colors, vec2(1.5/12.0, 0.5));
  vec4 color2 = texture(u_colors, vec2(2.5/12.0, 0.5));
  vec4 color3 = texture(u_colors, vec2(3.5/12.0, 0.5));
  vec4 color4 = texture(u_colors, vec2(4.5/12.0, 0.5));
  vec4 color5 = texture(u_colors, vec2(5.5/12.0, 0.5));
  vec4 color6 = texture(u_colors, vec2(6.5/12.0, 0.5));
  vec4 color7 = texture(u_colors, vec2(7.5/12.0, 0.5));
  vec4 color8 = texture(u_colors, vec2(8.5/12.0, 0.5));
  vec4 color9 = texture(u_colors, vec2(9.5/12.0, 0.5));
  vec4 color10 = texture(u_colors, vec2(10.5/12.0, 0.5));
  vec4 color11 = texture(u_colors, vec2(11.5/12.0, 0.5));

  vec4 C = vec4(0.0);

  // sample the 4 substrate 
  vec4 S0 = texture(u_substrate0, v_uv);
  vec4 S1 = texture(u_substrate1, v_uv);
  vec4 S2 = texture(u_substrate2, v_uv);
  vec4 S3 = texture(u_substrate3, v_uv);

  // compose the final color based on each substrate's color
  C = mix(C, color0, S0.r);
  C = mix(C, color1, S0.g);
  C = mix(C, color2, S0.b);
  C = mix(C, color3, S1.r);
  C = mix(C, color4, S1.g);
  C = mix(C, color5, S1.b);
  C = mix(C, color6, S2.r);
  C = mix(C, color7, S2.g);
  C = mix(C, color8, S2.b);
  C = mix(C, color9, S3.r);
  C = mix(C, color10, S3.g);
  C = mix(C, color11, S3.b);

  C = clamp(C, vec4(0), vec4(1));
  outColor = vec4(C.rgb, 1);
}`

const crossFS = `#version 300 es
precision mediump float;
uniform sampler2D u_textureA;
uniform sampler2D u_textureB;
uniform float u_cross;

in vec2 v_uv;
out vec4 outColor;

void main() {
  outColor = clamp(mix(texture(u_textureA, v_uv), texture(u_textureB, v_uv), 0.05), vec4(0), vec4(1));
}`

const drawingFS = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_mouse;

in vec2 v_uv;
out vec4 outColor;

void main() {
  float L = length(v_uv - u_mouse);
  float I = smoothstep(0.01, 0.001, L) * 0.5;
  vec4 smp = texture(u_texture, v_uv);
  outColor = clamp(smp + vec4(I), vec4(0), vec4(1));
}`

const compositionFS = `#version 300 es
precision mediump float;
uniform sampler2D u_substrate;
uniform sampler2D u_smoothed;
uniform sampler2D u_agents;
uniform sampler2D u_deposit0;
uniform sampler2D u_deposit1;
uniform sampler2D u_deposit2;
uniform sampler2D u_deposit3;
uniform sampler2D u_dots;
uniform int u_activeDeposit;
uniform int u_compositionMode;
uniform float u_time;

in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 substrate = texture(u_substrate, v_uv);
  vec4 smoothed = texture(u_smoothed, v_uv);
  vec4 agents = texture(u_agents, v_uv) * 0.5;

  vec4 sm_sub = pow(substrate, vec4(0.4)) * 0.2;

  vec4 color = (substrate + smoothed + agents) * 0.5;

  // add the dots for some texture
  color.rgb += texture(u_dots, v_uv).r;

  // special visualisation effect of the deposit
  if (u_activeDeposit != 0) {
    float gscale = (color.r+color.g+color.b) * 0.2;
    color.rgb = vec3(gscale);
    vec4 smp;
    if (u_activeDeposit == 1) {
      smp = texture(u_deposit0, v_uv);
    }
    else if (u_activeDeposit == 2) {
      smp = texture(u_deposit1, v_uv);
    }
    if (u_activeDeposit == 3) {
      smp = texture(u_deposit2, v_uv);
    }
    if (u_activeDeposit == 4) {
      smp = texture(u_deposit3, v_uv);
    }
    color.rgb = mix(color.rgb, smp.rgb, max(smp.b, max(smp.r, smp.g)) * 0.5);
  }

  // color is processed differently depending on the mode of composition
  // 0: darkest background
  if (u_compositionMode == 0) {
    color.rgb = color.rgb;  // nothing is done with the color
  }
  // 1: very light gray flimic background
  else if (u_compositionMode == 1) {
    color.rgb += 0.07;
  }
  // 2: slightly blue-ish tinted background
  else if (u_compositionMode == 2) {
    color.rgb += vec3(0.03, 0.04, 0.1);
  }
  // 3: sort of a dirty water color
  else if (u_compositionMode == 3) {
    color.rgb = vec3(0.46, 0.4, 0.33) + color.rgb * 0.6;
  }
  // 4: phase contrast-ish (for the background, not foreground pipeline isn't suited for that)
  else if (u_compositionMode == 4) {
    color.rgb = vec3(0.33, 0.40, 0.46) + color.rgb * 0.6;
  }
  // 5: backlight
  else if (u_compositionMode == 5) {
    color.rgb = vec3(1.0, 1.0, 0.9) - color.rgb;
  }

  outColor = color;
}`

const sobelFS = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
uniform float u_resolution;
uniform float u_strength;

in vec2 v_uv;
out vec4 outColor;

mat3 kernel = mat3(
  vec3(-1, -2, -1),
  vec3(0, 0, 0),
  vec3(1, 2, 1)
);

void main() {
  vec4 smp;
  vec4 gx = vec4(0);
  vec4 gy = vec4(0);
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      smp = texture(u_texture, v_uv + vec2(float(dx)/u_resolution, float(dy)/u_resolution));
      gx+= kernel[dx+1][dy+1] * smp;
      gy+= kernel[dy+1][dx+1] * smp;
    }
  }

  // compose the sobel effect with the color
  vec4 color = texture(u_texture, v_uv);
  color.rgb = color.rgb * (1.0 - u_strength) + (gx.rgb + gy.rgb) * u_strength;

  // compose the optic in here to save a draw call
  float O = smoothstep(0.47, 0.48, length(v_uv - 0.5));
  color.rgb = mix(color.rgb, vec3(0), O);

  outColor = color;
}`

const postFS = `#version 300 es
precision mediump float;

/**
  Transverse Chromatic Aberration
	Based on https://github.com/FlexMonkey/Filterpedia/blob/7a0d4a7070894eb77b9d1831f689f9d8765c12ca/Filterpedia/customFilters/TransverseChromaticAberration.swift
	Simon Gladman | http://flexmonkey.blogspot.co.uk | September 2017
*/

#define SAMPLES 8
#define BLUR 0.165
#define FALLOF 5.0
uniform sampler2D u_texture;
uniform sampler2D u_sobel;

in vec2 v_uv;
out vec4 outColor0;

void main() {
  vec2 dir = normalize(v_uv - 0.5); 
  vec2 vel = dir * BLUR * pow(length(v_uv - 0.5), FALLOF);
  float inverseSampleCount = 1.0 / float(SAMPLES);

  mat3x2 increments = mat3x2(
    vel * 1.0 * inverseSampleCount,
    vel * 2.0 * inverseSampleCount,
    vel * 4.0 * inverseSampleCount
  );

  vec3 acc = vec3(0);
  mat3x2 offsets = mat3x2(0); 

  for (int i = 0; i < SAMPLES; i++) {
    acc.r += texture(u_texture, v_uv + offsets[0]).r; 
    acc.g += texture(u_texture, v_uv + offsets[1]).g; 
    acc.b += texture(u_texture, v_uv + offsets[2]).b; 
    offsets -= increments;
  }

  vec3 col = acc / float(SAMPLES);
  col = clamp(col, vec3(0), vec3(1));

  outColor0 = vec4(col, 1.0);
}`

//
// UTILITIES
//

// cheap test to check for mobile devices
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

// compile a shader
function createShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  // success
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader
  }
  // error somewhere
  console.log(gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
}

// link shaders into a program
function createProgram(gl, vert, frag) {
  // create the vertex / fragment shader
  const vertShader = createShader(gl, gl.VERTEX_SHADER, vert)
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, frag)
  // create the program
  const program = gl.createProgram()
  gl.attachShader(program, vertShader)
  gl.attachShader(program, fragShader)
  gl.linkProgram(program)
  // success
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program
  }
  // error somewhere
  console.log(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
}

// create a RGBA texture from a data array
function createTexture(
  gl,
  data,
  width,
  height,
  internatFormat = gl.RGBA32F,
  format = gl.RGBA,
  type = gl.FLOAT
) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    internatFormat,
    width,
    height,
    0,
    format,
    type,
    data
  )
  // nearest / clamp
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return tex
}

// create a frame buffer
function createFrameBuffer(gl, tex) {
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  )
  return fb
}

// create a frame buffer for already-existing multiple textures
function createFrameBufferMultipleTextures(gl, textures) {
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  for (let i = 0; i < textures.length; i++) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + i,
      gl.TEXTURE_2D,
      textures[i],
      0
    )
  }
  return fb
}

// helper to handle Ping Pong buffers (texture can be array of textures if needed)
function pingPongFramebuffers(framebufferA, textureA, framebufferB, textureB) {
  // create a reference to access the textures
  const pingpong = {
    back: {
      fb: framebufferA,
      tex: textureA,
    },
    front: {
      fb: framebufferB,
      tex: textureB,
    },
  }
  // utility to swap the 2 buffers
  function swap() {
    const tmp = pingpong.back
    pingpong.back = pingpong.front
    pingpong.front = tmp
  }
  // return utility object
  return { pingpong, swap }
}

function capture(canvas) {
  const url = canvas.toDataURL("image/png")
  const a = document.createElement("a")
  a.href = url
  a.download = "image.png"
  a.click()
  URL.revokeObjectURL(url)
}

const mouse = {
  x: 0,
  y: 0,
  down: 0,
}

const lerp = (a, b, t) => (b - a) * t + a
const fxrange = (a, b) => lerp(a, b, fxrand())
// given an normalized array of probabilities, outputs the index of the prob triggered
// ex [0.6, 0.2, 0.1, 0.1]
const fxprob = probs => {
  const r = fxrand()
  let p = 0
  for (let i = 0; i < probs.length; i++) {
    p += probs[i]
    if (r < p) return i
  }
}

//
// GLOBAL PARAMETERS
//

// the mutation strength based on Z-neighbor substrate
const mutationStrength = fxrange(0.5, 1.5)
// deposit strength of the agents substrate
const deposit = fxrange(0.01, 0.1)
// the rate of decay of the subtrate
const decay = fxrange(0.95, 0.99)
// the mode of composition, used just before post processing to combine passes
const compositionMode = fxprob([0.05, 0.3, 0.28, 0.18, 0.15, 0.04])
// sobel strength is derived from composition mode
const sobelStrength = [0.05, 0.1, 0.05, 0.2, 0.2, 0.15][compositionMode]
// size of the particles being drawn
let pointSize = fxrange(1.3, 2.2)
// are the interaction less stable ?
const addInteractions = fxrand() < 0.5
// will store the active layer for visualization
let activeDeposit = 0
// toggable settings
let shock = 0
let centerAttraction = 0
let flash = false
let paused = false
let mouseinsert = 1.0
let drawing = 0.0

// color generation
const colorMode = fxprob([0.3, 0.25, 0.2, 0.15, 0.1])
const generateColor = () => {
  switch (colorMode) {
    // mostly grayscale, with chances to have a mutant
    case 0: {
      const mutant = fxrand() < 0.1
      if (mutant) {
        // don't lose the red with inversion on backlight effect
        if (compositionMode === 5) {
          const r = fxrange(60, 150)
          return [0, r, r]
        } else {
          return [fxrange(60, 150), 0, 0]
        }
      } else {
        const gscale = fxrange(20, 150)
        return [gscale, gscale, gscale]
      }
    }
    // mostly grayscale, with chances to have lime mutant
    case 1: {
      const mutant = fxrand() < 0.1
      if (mutant) {
        if (compositionMode === 5) {
          return [fxrange(30, 80), 0, fxrange(90, 190)]
        } else {
          return [fxrange(30, 80), fxrange(90, 190), 0]
        }
      } else {
        const gscale = fxrange(20, 150)
        return [gscale, gscale, gscale]
      }
    }
    // mostly grayscale, with chances to have full random mutant
    case 2: {
      const mutant = fxrand() < 0.1
      if (mutant) {
        return [fxrange(0, 200), fxrange(0, 200), fxrange(0, 200)]
      } else {
        const gscale = fxrange(20, 150)
        return [gscale, gscale, gscale]
      }
    }
    // purple-ish green-ish
    case 3: {
      const r = fxrand()
      if (r < 0.4) {
        const gscale = fxrange(20, 150)
        return [gscale, gscale, gscale]
      } else if (r < 0.3) {
        // some purple tones
        const b = fxrange(80, 160)
        return [b * 0.5, fxrange(0, 50), b]
      } else {
        // some green tones
        return [fxrange(20, 120), fxrange(50, 150), fxrange(20, 120)]
      }
    }
    // full randomness
    case 4: {
      if (fxrand() < 0.2) {
        const gscale = fxrange(20, 150)
        return [gscale, gscale, gscale]
      } else {
        return [fxrange(0, 255), fxrange(0, 255), fxrange(0, 255)]
      }
    }
  }
}

// initial position generation
const seedPosMode = fxrange(0, 13) | 0
// 2 global seed parameters
const seedA = fxrand()
const generatePos = group => {
  switch (seedPosMode) {
    // vertical ellpisis
    case 0: {
      const alpha = fxrand() * Math.PI * 2.0
      const d = fxrand() * 0.4
      return [
        Math.cos(alpha) * d * lerp(0.01, 0.2, seedA) + 0.5,
        Math.sin(alpha) * d * 0.85 + 0.5,
      ]
    }
    // ditribution on the center
    case 1: {
      const alpha = fxrand() * Math.PI * 2.0
      const d = fxrand() * lerp(0.01, 0.01, seedA)
      // no correction for a better polar distribution because more on the center creates
      // some depth
      return [Math.cos(alpha) * d + 0.5, Math.sin(alpha) * d + 0.5]
    }
    // sort of lines per group
    case 2: {
      let x = group / 12
      let y = fxrand()
      // if the seed is out of the circle, we pick a random point along the line to create
      // some shuffle in the distribution of the species
      let D = Math.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2)
      if (D > 0.48) {
        let alpha = x * 2 * Math.PI
        D = fxrange(-0.1, 0.3)
        x = Math.cos(alpha) * D + 0.5
        y = Math.sin(alpha) * D + 0.5
      }
      return [x, y]
    }
    // 2 areas with half species on each
    case 3: {
      const alpha = fxrand() * Math.PI * 2.0
      const d = fxrand() * lerp(0.01, 0.05, seedA)
      return [
        Math.cos(alpha) * d + 0.5 + (group < 6 ? -1 : 1) * 0.15,
        Math.sin(alpha) * d + 0.5,
      ]
    }
    // circular layers
    case 4: {
      const alpha = fxrand() * Math.PI * 2.0
      const d =
        ((((group / 2) | 0) * 2) / SPECIES + 0.01) * lerp(0.2, 0.45, seedA)
      return [Math.cos(alpha) * d + 0.5, Math.sin(alpha) * d + 0.5]
    }
    // diagonal
    case 5: {
      const p = fxrand() - 0.5
      return [p + 0.5, p + 0.5]
    }
    // X
    case 6: {
      const p = fxrand() - 0.5
      return [p + 0.5, (fxrand() < 0.5 ? 1 : -1) * p + 0.5]
    }
    // C - ciphrd hehe
    case 7: {
      const alpha = fxrange(0.8, 2 * Math.PI - 0.8)
      const d = fxrange(0.2, 0.22)
      return [Math.cos(alpha) * d + 0.5, Math.sin(alpha) * d + 0.5]
    }
    // O
    case 8: {
      const alpha = fxrange(0, 2 * Math.PI)
      const d = fxrange(0.2, 0.22)
      return [Math.cos(alpha) * d + 0.5, Math.sin(alpha) * d + 0.5]
    }
    // 2 arcs
    case 9: {
      const alpha =
        fxrange(Math.PI * 0.5 + 0.2, Math.PI - 0.2) + (group < 6 ? 0 : Math.PI)
      const d = fxrange(0.15, 0.16)
      return [Math.cos(alpha) * d + 0.5, Math.sin(alpha) * d + 0.5]
    }
    // waves
    case 10: {
      const x = fxrand()
      return [x * 0.6 + 0.2, Math.sin(x * 7 * Math.PI) * 0.05 + 0.5]
    }
    // small segment for each group
    case 11: {
      const alpha = ((((group / 2) | 0) * 2) / 12) * 2 * Math.PI
      const d = fxrange(-0.1, 0.3)
      const r1 = fxrange(-0.01, 0.01)
      const r2 = fxrange(-0.01, 0.01)
      return [Math.cos(alpha) * d + 0.5 + r1, Math.sin(alpha) * d + 0.5 + r2]
    }
    // verical "singularity"
    case 12: {
      return [fxrange(0.499, 0.501), fxrand()]
    }
  }
}

//
// BASIC SETUP
//

// check if we are in HQ mode
const url = new URLSearchParams(window.location.search)
const quality = isFxpreview ? 0 : parseInt(url.get("quality")) || 1 // 0: preview, 1: normal, 2: HQ, 3: VHQ

const SIZE = [800, 1024, 1600, 2048][quality]
const CVS_SIZE = [800, 1024, 2048, 4096][quality]
const SPECIES = 12

const cvs = document.querySelector("canvas")
cvs.width = cvs.height = CVS_SIZE
const gl = cvs.getContext("webgl2", {
  powerPreference: "high-performance",
  preserveDrawingBuffer: true,
})

// gl viewport to canvas size
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

// clear the canvas
gl.clearColor(0, 0, 0, 0)
gl.clear(gl.COLOR_BUFFER_BIT)

//
// COMPATIBILITY/EXTENSIONS CHECKUPS
//

if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
  throw new Error("Cannot use texture in vertex shader")
}
if (!gl.getExtension("EXT_color_buffer_float")) {
  throw new Error("Cannot render to a float frame buffer")
}

//
// INITIALISATION
//

// create the shader programs
const dotsProgram = createProgram(gl, quadVS, dotsFS)
const drawProgram = createProgram(gl, drawVS, drawFS)
const updateProgram = createProgram(gl, updateVS, updateFS)
const substrateProgram = createProgram(gl, quadVS, envFS)
const gaussianProgram = createProgram(gl, quadVS, gaussian1dFS)
const renderSubstrateProgram = createProgram(gl, quadVS, renderFS)
const crossProgram = createProgram(gl, quadVS, crossFS)
const drawingProgram = createProgram(gl, quadVS, drawingFS)
const compositionProgram = createProgram(gl, quadVS, compositionFS)
const sobelProgram = createProgram(gl, quadVS, sobelFS)
const postProgram = createProgram(gl, quadVS, postFS)

// initialize the color buffer and the features first so that if the size is changed it doesn't
// impact the output conceptually
const colors = new Uint8Array(SPECIES * 4)
const speciesFeatures = new Float32Array(SPECIES * 4)
for (let i = 0; i < SPECIES; i++) {
  const idx = i * 4
  const color = generateColor()
  colors[idx] = color[0]
  colors[idx + 1] = color[1]
  colors[idx + 2] = color[2]
  colors[idx + 3] = 255
  // SA
  speciesFeatures[idx] = fxrange(0.2, Math.PI / 2)
  // RA
  speciesFeatures[idx + 1] = fxrange(0.2, Math.PI / 2)
  // SO
  speciesFeatures[idx + 2] = (1.0 + fxrand() * 10) / cvs.width
  // SS
  speciesFeatures[idx + 3] = (0.5 + Math.pow(fxrand(), 4.0) * 8.0) / cvs.width
}
const colorsTex = createTexture(
  gl,
  colors,
  SPECIES,
  1,
  gl.RGBA,
  gl.RGBA,
  gl.UNSIGNED_BYTE
)
const featuresTex = createTexture(gl, speciesFeatures, SPECIES, 1)

// create empty buffer to initilize texture
const emptyBufferParticles = new Float32Array(SIZE * SIZE * 4).fill(0)
const emptyBufferCanvas = new Float32Array(cvs.width * cvs.height * 4).fill(0)

// create some random positions and groups
const agents = new Float32Array(SIZE * SIZE * 4)
const groups = new Float32Array(SIZE * SIZE)
for (let i = 0; i < SIZE * SIZE; i++) {
  const idx = i * 4
  const group = (fxrand() * 12) | 0
  const pos = generatePos(group)
  agents[idx] = pos[0]
  agents[idx + 1] = pos[1]
  agents[idx + 2] = fxrand() * Math.PI * 2.0
  agents[idx + 3] = 0.0
  groups[i] = group
}

// create a pseudo-randomness texture to be used in shaders for randomness
const randomValues = new Float32Array(CVS_SIZE * CVS_SIZE)
for (let i = 0; i < CVS_SIZE * CVS_SIZE; i++) {
  randomValues[i] = fxrand()
}

// 2 textures for agents for the pingpong buffer
const agentsTex1 = createTexture(gl, agents, SIZE, SIZE)
const agentsTex2 = createTexture(gl, null, SIZE, SIZE)
const groupTex = createTexture(gl, groups, SIZE, SIZE, gl.R16F, gl.RED)

// create the texture for the random values
const randomValTex = createTexture(
  gl,
  randomValues,
  CVS_SIZE,
  CVS_SIZE,
  gl.R32F,
  gl.RED
)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)

// create 2 frame buffers, one for each agents texture
const agentsFB1 = createFrameBuffer(gl, agentsTex1)
const agentsFB2 = createFrameBuffer(gl, agentsTex2)
const agentsPingPong = pingPongFramebuffers(
  agentsFB1,
  agentsTex1,
  agentsFB2,
  agentsTex2
)

// create 4 textures to draw the agents (3 species / buffer)
const drawAgentsTextures = []
for (let i = 0; i < 4; i++) {
  drawAgentsTextures.push(createTexture(gl, null, cvs.width, cvs.height))
}
const drawAgentsFB = createFrameBufferMultipleTextures(gl, drawAgentsTextures)

// create 2x4 textures for the subtrate (1 texture = 3 species, and front/back buffer)
const subtrateTextures1 = []
const subtrateTextures2 = []
for (let i = 0; i < 4; i++) {
  subtrateTextures1.push(createTexture(gl, null, cvs.width, cvs.height))
  subtrateTextures2.push(createTexture(gl, null, cvs.width, cvs.height))
}
const drawSubstrateFB1 = createFrameBufferMultipleTextures(
  gl,
  subtrateTextures1
)
const drawSubstrateFB2 = createFrameBufferMultipleTextures(
  gl,
  subtrateTextures2
)
const substratePingpong = pingPongFramebuffers(
  drawSubstrateFB1,
  subtrateTextures1,
  drawSubstrateFB2,
  subtrateTextures2
)

// the frame buffer to render the substrate
const renderSubstratesTexture = createTexture(gl, null, cvs.width, cvs.height)
const renderSubstratesFB = createFrameBuffer(gl, renderSubstratesTexture)

// the frame buffer to compose the insertion
const renderInsertionTexture = createTexture(gl, null, cvs.width, cvs.height)
const renderInsertionFB = createFrameBuffer(gl, renderInsertionTexture)

// the drawing
const drawingSize = isMobile ? 256 : CVS_SIZE * 0.5
const drawingTexture1 = createTexture(
  gl,
  null,
  drawingSize,
  drawingSize,
  gl.R32F,
  gl.RED
)
const drawingTexture2 = createTexture(
  gl,
  null,
  drawingSize,
  drawingSize,
  gl.R32F,
  gl.RED
)
const drawingFB1 = createFrameBuffer(gl, drawingTexture1)
const drawingFB2 = createFrameBuffer(gl, drawingTexture2)
const drawingPingpong = pingPongFramebuffers(
  drawingFB1,
  drawingTexture1,
  drawingFB2,
  drawingTexture2
)

// the feedback effect on the agents
const agentsFeedbackTex1 = createTexture(gl, null, cvs.width, cvs.height)
const agentsFeedbackTex2 = createTexture(gl, null, cvs.width, cvs.height)
const agentsFeedbackFB1 = createFrameBuffer(gl, agentsFeedbackTex1)
const agentsFeedbackFB2 = createFrameBuffer(gl, agentsFeedbackTex2)
const agentsFeedbackPingPong = pingPongFramebuffers(
  agentsFeedbackFB1,
  agentsFeedbackTex1,
  agentsFeedbackFB2,
  agentsFeedbackTex2
)

// the frame buffer to render the composition
const compositionTexture = createTexture(gl, null, cvs.width, cvs.height)
const compositionFB = createFrameBuffer(gl, compositionTexture)

// create the texture coordinates buffer for the draw vertex
const texCoords = new Float32Array(SIZE * SIZE * 2)
for (let i = 0; i < SIZE * SIZE; i++) {
  const x = i % SIZE
  const y = (i / SIZE) | 0
  texCoords[i * 2] = (x + 0.5) / SIZE
  texCoords[i * 2 + 1] = (y + 0.5) / SIZE
}
const texCoordsBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW)

// get the position of the attributes/uniforms
const locations = {
  dots: {
    attributes: {
      a_position: gl.getAttribLocation(dotsProgram, "a_position"),
    },
    uniforms: {
      u_rand: gl.getUniformLocation(dotsProgram, "u_rand"),
    },
  },
  update: {
    attributes: {
      a_position: gl.getAttribLocation(updateProgram, "a_position"),
    },
    uniforms: {
      u_agents: gl.getUniformLocation(updateProgram, "u_agents"),
      u_texResolution: gl.getUniformLocation(updateProgram, "u_texResolution"),
      u_groups: gl.getUniformLocation(updateProgram, "u_groups"),
      u_features: gl.getUniformLocation(updateProgram, "u_features"),
      u_substrate0: gl.getUniformLocation(updateProgram, "u_substrate0"),
      u_substrate1: gl.getUniformLocation(updateProgram, "u_substrate1"),
      u_substrate2: gl.getUniformLocation(updateProgram, "u_substrate2"),
      u_substrate3: gl.getUniformLocation(updateProgram, "u_substrate3"),
      u_random: gl.getUniformLocation(updateProgram, "u_random"),
      u_drawing: gl.getUniformLocation(updateProgram, "u_drawing"),
      u_randomResolution: gl.getUniformLocation(
        updateProgram,
        "u_randomResolution"
      ),
      u_frame: gl.getUniformLocation(updateProgram, "u_frame"),
      u_time: gl.getUniformLocation(updateProgram, "u_time"),
      u_mutation: gl.getUniformLocation(updateProgram, "u_mutation"),
      u_shock: gl.getUniformLocation(updateProgram, "u_shock"),
      u_centerAttraction: gl.getUniformLocation(
        updateProgram,
        "u_centerAttraction"
      ),
    },
  },
  draw: {
    attributes: {
      a_texcoord: gl.getAttribLocation(drawProgram, "a_texcoord"),
    },
    uniforms: {
      u_position: gl.getUniformLocation(drawProgram, "u_position"),
      u_group: gl.getUniformLocation(drawProgram, "u_group"),
      u_pointsize: gl.getUniformLocation(drawProgram, "u_pointsize"),
      u_deposit: gl.getUniformLocation(drawProgram, "u_deposit"),
    },
  },
  substrate: {
    attributes: {
      a_position: gl.getAttribLocation(substrateProgram, "a_position"),
    },
    uniforms: {
      u_texture0: gl.getUniformLocation(substrateProgram, "u_texture0"),
      u_texture1: gl.getUniformLocation(substrateProgram, "u_texture1"),
      u_texture2: gl.getUniformLocation(substrateProgram, "u_texture2"),
      u_texture3: gl.getUniformLocation(substrateProgram, "u_texture3"),
      u_insertion0: gl.getUniformLocation(substrateProgram, "u_insertion0"),
      u_insertion1: gl.getUniformLocation(substrateProgram, "u_insertion1"),
      u_insertion2: gl.getUniformLocation(substrateProgram, "u_insertion2"),
      u_insertion3: gl.getUniformLocation(substrateProgram, "u_insertion3"),
      u_drawing: gl.getUniformLocation(substrateProgram, "u_drawing"),
      u_decay: gl.getUniformLocation(substrateProgram, "u_decay"),
      u_deposit: gl.getUniformLocation(substrateProgram, "u_deposit"),
      u_mousepos: gl.getUniformLocation(substrateProgram, "u_mousepos"),
      u_mouse: gl.getUniformLocation(substrateProgram, "u_mouse"),
      u_mouseinsert: gl.getUniformLocation(substrateProgram, "u_mouseinsert"),
      u_addinteractions: gl.getUniformLocation(
        substrateProgram,
        "u_addinteractions"
      ),
    },
  },
  gaussian: {
    attributes: {
      a_position: gl.getAttribLocation(gaussianProgram, "a_position"),
    },
    uniforms: {
      u_dir: gl.getUniformLocation(gaussianProgram, "u_dir"),
      u_substrate0: gl.getUniformLocation(gaussianProgram, "u_substrate0"),
      u_substrate1: gl.getUniformLocation(gaussianProgram, "u_substrate1"),
      u_substrate2: gl.getUniformLocation(gaussianProgram, "u_substrate2"),
      u_substrate3: gl.getUniformLocation(gaussianProgram, "u_substrate3"),
    },
  },
  renderSubstrate: {
    attributes: {
      a_position: gl.getAttribLocation(renderSubstrateProgram, "a_position"),
    },
    uniforms: {
      u_substrate0: gl.getUniformLocation(
        renderSubstrateProgram,
        "u_substrate0"
      ),
      u_substrate1: gl.getUniformLocation(
        renderSubstrateProgram,
        "u_substrate1"
      ),
      u_substrate2: gl.getUniformLocation(
        renderSubstrateProgram,
        "u_substrate2"
      ),
      u_substrate3: gl.getUniformLocation(
        renderSubstrateProgram,
        "u_substrate3"
      ),
      u_colors: gl.getUniformLocation(renderSubstrateProgram, "u_colors"),
    },
  },
  drawing: {
    attributes: {
      a_position: gl.getAttribLocation(drawingProgram, "a_position"),
    },
    uniforms: {
      u_mouse: gl.getUniformLocation(drawingProgram, "u_mouse"),
      u_texture: gl.getUniformLocation(drawingProgram, "u_texture"),
    },
  },
  cross: {
    attributes: {
      a_position: gl.getAttribLocation(crossProgram, "a_position"),
    },
    uniforms: {
      u_textureA: gl.getUniformLocation(crossProgram, "u_textureA"),
      u_textureB: gl.getUniformLocation(crossProgram, "u_textureB"),
    },
  },
  composition: {
    attributes: {
      a_position: gl.getAttribLocation(compositionProgram, "a_position"),
    },
    uniforms: {
      u_substrate: gl.getUniformLocation(compositionProgram, "u_substrate"),
      u_smoothed: gl.getUniformLocation(compositionProgram, "u_smoothed"),
      u_agents: gl.getUniformLocation(compositionProgram, "u_agents"),
      u_deposit0: gl.getUniformLocation(compositionProgram, "u_deposit0"),
      u_deposit1: gl.getUniformLocation(compositionProgram, "u_deposit1"),
      u_deposit2: gl.getUniformLocation(compositionProgram, "u_deposit2"),
      u_deposit3: gl.getUniformLocation(compositionProgram, "u_deposit3"),
      u_dots: gl.getUniformLocation(compositionProgram, "u_dots"),
      u_activeDeposit: gl.getUniformLocation(
        compositionProgram,
        "u_activeDeposit"
      ),
      u_compositionMode: gl.getUniformLocation(
        compositionProgram,
        "u_compositionMode"
      ),
      u_time: gl.getUniformLocation(compositionProgram, "u_time"),
    },
  },
  sobel: {
    attributes: {
      a_position: gl.getAttribLocation(sobelProgram, "a_position"),
    },
    uniforms: {
      u_texture: gl.getUniformLocation(sobelProgram, "u_texture"),
      u_resolution: gl.getUniformLocation(sobelProgram, "u_resolution"),
      u_strength: gl.getUniformLocation(sobelProgram, "u_strength"),
    },
  },
  post: {
    attributes: {
      a_position: gl.getAttribLocation(postProgram, "a_position"),
    },
    uniforms: {
      u_texture: gl.getUniformLocation(postProgram, "u_texture"),
    },
  },
}

// define the vertices for a full screen quad
const quadVertices = new Float32Array([
  -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, 1, 1,
])
const quadBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW)

//
// PRE-GENERATION
//

// generate some dots to add some texture to the composition
const dotsTexture = createTexture(gl, null, CVS_SIZE, CVS_SIZE, gl.R16F, gl.RED)
const dotsFB = createFrameBuffer(gl, dotsTexture)
gl.bindFramebuffer(gl.FRAMEBUFFER, dotsFB)
gl.drawBuffers([gl.COLOR_ATTACHMENT0])
gl.viewport(0, 0, CVS_SIZE, CVS_SIZE)
gl.useProgram(dotsProgram)

// bind the attributes & uniforms
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
gl.enableVertexAttribArray(locations.update.attributes.a_position)
gl.vertexAttribPointer(
  locations.update.attributes.a_position,
  2,
  gl.FLOAT,
  false,
  0,
  0
)
gl.uniform1f(locations.dots.uniforms.u_rand, fxrand())

// draw 2 triangles full screen, which will execute the fragment shader on the whole texture
gl.drawArrays(gl.TRIANGLES, 0, 6)

//
// EVENTS
//
cvs.addEventListener("mousemove", evt => {
  const bounds = cvs.getBoundingClientRect()
  mouse.x = (evt.clientX - bounds.left) / bounds.width
  mouse.y = 1 - (evt.clientY - bounds.top) / bounds.width
})
cvs.addEventListener("mousedown", () => (mouse.down = 1))
window.addEventListener("mouseup", () => (mouse.down = 0))
window.addEventListener("mouseleave", () => (mouse.down = 0))
let lastTouch = 0
window.addEventListener("touchstart", event => {
  const touchTime = performance.now()
  if (touchTime - lastTouch < 700) {
    paused = !paused
  }
  lastTouch = touchTime
  const bounds = cvs.getBoundingClientRect()
  mouse.x = (event.touches[0].clientX - bounds.left) / bounds.width
  mouse.y = 1 - (event.touches[0].clientY - bounds.top) / bounds.width
  mouse.down = 1
  console.log("touch")
})
window.addEventListener("touchend", () => (mouse.down = 0))
window.addEventListener("touchmove", event => {
  const bounds = cvs.getBoundingClientRect()
  mouse.x = (event.touches[0].clientX - bounds.left) / bounds.width
  mouse.y = 1 - (event.touches[0].clientY - bounds.top) / bounds.width
  event.preventDefault()
})
window.addEventListener("keypress", event => {
  if (event.key === "s") {
    capture(cvs)
  } else if (event.key === "v") {
    activeDeposit = (activeDeposit + 1) % 5
  }
})
window.addEventListener("keydown", event => {
  if (event.key === "m") {
    shock = 5 / CVS_SIZE
  } else if (event.key === "a") {
    centerAttraction = -2.0 / CVS_SIZE
  } else if (event.key === "r") {
    if (!event.repeat) {
      if (centerAttraction > 3.0 / CVS_SIZE) {
        centerAttraction = 0
      } else {
        centerAttraction += 1.0 / CVS_SIZE
      }
    }
  } else if (event.key === "f") {
    flash = true
  } else if (event.key === "p") {
    if (!event.repeat) {
      paused = !paused
    }
  } else if (event.key === "d") {
    if (!event.paused) {
      if (mouseinsert === 0) {
        mouseinsert = 1.0
      } else {
        mouseinsert = 0
      }
    }
  }
})
window.addEventListener("keyup", event => {
  if (event.key === "m") {
    shock = 0
  } else if (event.key === "a") {
    centerAttraction = 0
  } else if (event.key === "f") {
    flash = false
  }
})

//
// LOOP
//

let frame = 0

function loop() {
  requestAnimationFrame(loop)

  // pause
  if (paused) return

  //
  // UPDATE THE DRAWING IF NEEDED
  //
  if (mouseinsert === 0 && mouse.down) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, drawingPingpong.pingpong.front.fb)
    gl.drawBuffers([gl.COLOR_ATTACHMENT0])
    gl.viewport(0, 0, drawingSize, drawingSize)
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.enableVertexAttribArray(locations.draw.attributes.a_position)
    gl.vertexAttribPointer(
      locations.draw.attributes.a_position,
      2,
      gl.FLOAT,
      false,
      0,
      0
    )
    gl.useProgram(drawingProgram)
    gl.uniform2f(locations.drawing.uniforms.u_mouse, mouse.x, mouse.y)
    gl.uniform1i(locations.drawing.uniforms.u_texture, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, drawingPingpong.pingpong.back.tex)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    drawingPingpong.swap()
  }

  //
  // UPDATE AGENTS
  //

  // render to the new agents buffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, agentsPingPong.pingpong.front.fb)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])
  gl.viewport(0, 0, SIZE, SIZE)

  // bind the attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.update.attributes.a_position)
  gl.vertexAttribPointer(
    locations.update.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // bind the textures
  // set active program and its uniforms
  gl.useProgram(updateProgram)
  // feed the 4 substrate maps back
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.update.uniforms[`u_substrate${i}`], i)
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, substratePingpong.pingpong.back.tex[i])
  }
  gl.uniform1i(locations.update.uniforms.u_agents, 4)
  gl.uniform1i(locations.update.uniforms.u_groups, 5)
  gl.uniform1i(locations.update.uniforms.u_features, 6)
  gl.uniform1i(locations.update.uniforms.u_random, 7)
  gl.uniform1i(locations.update.uniforms.u_drawing, 8)
  gl.activeTexture(gl.TEXTURE4)
  gl.bindTexture(gl.TEXTURE_2D, agentsPingPong.pingpong.back.tex)
  gl.activeTexture(gl.TEXTURE5)
  gl.bindTexture(gl.TEXTURE_2D, groupTex)
  gl.activeTexture(gl.TEXTURE6)
  gl.bindTexture(gl.TEXTURE_2D, featuresTex)
  gl.activeTexture(gl.TEXTURE7)
  gl.bindTexture(gl.TEXTURE_2D, randomValTex)
  gl.activeTexture(gl.TEXTURE8)
  gl.bindTexture(gl.TEXTURE_2D, drawingPingpong.pingpong.front.tex)
  gl.uniform2f(locations.update.uniforms.u_texResolution, SIZE, SIZE)
  gl.uniform1f(locations.update.uniforms.u_randomResolution, CVS_SIZE)
  gl.uniform1f(locations.update.uniforms.u_mutation, mutationStrength + flash)
  gl.uniform1f(locations.update.uniforms.u_frame, frame)
  gl.uniform1f(locations.update.uniforms.u_shock, shock)
  gl.uniform1f(locations.update.uniforms.u_centerAttraction, centerAttraction)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // RENDER PARTICLES
  //

  // bind frame buffer, set viewport and clear
  gl.bindFramebuffer(gl.FRAMEBUFFER, drawAgentsFB)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  // draw to the 4 textures
  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1,
    gl.COLOR_ATTACHMENT2,
    gl.COLOR_ATTACHMENT3,
  ])

  // on some mobile devices, the blend function doesn't seem to work so it's getting killed
  if (!isMobile) {
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)
  }

  // bind the attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer)
  gl.enableVertexAttribArray(locations.draw.attributes.a_texcoord)
  gl.vertexAttribPointer(
    locations.draw.attributes.a_texcoord,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // set active program and its uniforms
  gl.useProgram(drawProgram)
  gl.uniform1i(locations.draw.uniforms.u_position, 0)
  gl.uniform1i(locations.draw.uniforms.u_group, 1)
  gl.uniform1f(
    locations.draw.uniforms.u_pointsize,
    flash ? fxrand() * 4.0 : pointSize
  )
  gl.uniform1f(locations.draw.uniforms.u_deposit, isMobile ? 0.8 : 0.15)

  // bind textures
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, agentsPingPong.pingpong.front.tex)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, groupTex)

  // draw as many vertices as there are points
  gl.drawArrays(gl.POINTS, 0, SIZE * SIZE)

  if (!isMobile) {
    gl.disable(gl.BLEND)
  }

  //
  // PROCESS THE SUBSTRATE
  //

  // bind the frame buffer, set viewport and clear
  gl.bindFramebuffer(gl.FRAMEBUFFER, substratePingpong.pingpong.front.fb)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  // draw to the 4 textures
  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1,
    gl.COLOR_ATTACHMENT2,
    gl.COLOR_ATTACHMENT3,
  ])

  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.substrate.attributes.a_position)
  gl.vertexAttribPointer(
    locations.substrate.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // use the program to process the substrates with new intertion
  gl.useProgram(substrateProgram)
  gl.uniform1f(locations.substrate.uniforms.u_decay, decay)
  gl.uniform1f(locations.substrate.uniforms.u_deposit, deposit)
  gl.uniform2f(locations.substrate.uniforms.u_mousepos, mouse.x, mouse.y)
  gl.uniform1f(locations.substrate.uniforms.u_mouse, mouse.down)
  gl.uniform1f(locations.substrate.uniforms.u_mouseinsert, mouseinsert * 3)
  gl.uniform1i(
    locations.substrate.uniforms.u_addinteractions,
    addInteractions ? 1 : 0
  )

  // bind the 4 previous substrate and the 4 intertion textures
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.substrate.uniforms[`u_texture${i}`], i)
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, substratePingpong.pingpong.back.tex[i])
    gl.uniform1i(locations.substrate.uniforms[`u_insertion${i}`], i + 4)
    gl.activeTexture(gl.TEXTURE0 + i + 4)
    gl.bindTexture(gl.TEXTURE_2D, drawAgentsTextures[i])
  }
  gl.uniform1i(locations.substrate.uniforms.u_drawing, 8)
  gl.activeTexture(gl.TEXTURE8)
  gl.bindTexture(gl.TEXTURE_2D, drawingPingpong.pingpong.front.tex)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // 2-pass gaussian blut of the substrate
  //

  // swap the pingpong for the subtrate
  substratePingpong.swap()

  // bind the frame buffer, set viewport and clear
  gl.bindFramebuffer(gl.FRAMEBUFFER, substratePingpong.pingpong.front.fb)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  // draw to the 4 textures
  gl.drawBuffers([
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1,
    gl.COLOR_ATTACHMENT2,
    gl.COLOR_ATTACHMENT3,
  ])

  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.gaussian.attributes.a_position)
  gl.vertexAttribPointer(
    locations.gaussian.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // set program and uniforms
  gl.useProgram(gaussianProgram)
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.gaussian.uniforms[`u_substrate${i}`], i)
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, substratePingpong.pingpong.back.tex[i])
  }
  gl.uniform2f(locations.gaussian.uniforms.u_dir, 1 / cvs.width, 0)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  // now the second pass
  substratePingpong.swap()
  gl.bindFramebuffer(gl.FRAMEBUFFER, substratePingpong.pingpong.front.fb)
  gl.clear(gl.COLOR_BUFFER_BIT)
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.gaussian.uniforms[`u_substrate${i}`], i)
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, substratePingpong.pingpong.back.tex[i])
  }
  gl.uniform2f(locations.gaussian.uniforms.u_dir, 0, 1 / cvs.height)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // RENDER SUBTRATE
  //
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderSubstratesFB)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])

  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.renderSubstrate.attributes.a_position)
  gl.vertexAttribPointer(
    locations.renderSubstrate.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // set program and uniforms
  gl.useProgram(renderSubstrateProgram)
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.renderSubstrate.uniforms[`u_substrate${i}`], i)
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, substratePingpong.pingpong.front.tex[i])
  }
  gl.uniform1i(locations.renderSubstrate.uniforms.u_colors, 4)
  gl.activeTexture(gl.TEXTURE4)
  gl.bindTexture(gl.TEXTURE_2D, colorsTex)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // RENDER INSERTION
  //
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderInsertionFB)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])

  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.renderSubstrate.attributes.a_position)
  gl.vertexAttribPointer(
    locations.renderSubstrate.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // set program and uniforms
  gl.useProgram(renderSubstrateProgram)
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.renderSubstrate.uniforms[`u_substrate${i}`], i)
    gl.activeTexture(gl.TEXTURE0 + i)
    gl.bindTexture(gl.TEXTURE_2D, drawAgentsTextures[i])
  }
  gl.uniform1i(locations.renderSubstrate.uniforms.u_colors, 4)
  gl.activeTexture(gl.TEXTURE4)
  gl.bindTexture(gl.TEXTURE_2D, colorsTex)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // CROSS FEEDBACK ON AGENTS
  //
  gl.bindFramebuffer(gl.FRAMEBUFFER, agentsFeedbackPingPong.pingpong.front.fb)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])

  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.cross.attributes.a_position)
  gl.vertexAttribPointer(
    locations.cross.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // set active program and its uniforms
  gl.useProgram(crossProgram)
  // bind textures
  gl.uniform1i(locations.cross.uniforms.u_textureA, 0)
  gl.uniform1i(locations.cross.uniforms.u_textureB, 1)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, agentsFeedbackPingPong.pingpong.back.tex)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, renderInsertionTexture)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // COMPOSITION OF THE DIFFERENT LAYERS
  //
  gl.bindFramebuffer(gl.FRAMEBUFFER, compositionFB)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])

  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.composition.attributes.a_position)
  gl.vertexAttribPointer(
    locations.composition.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // set program and bind textures
  gl.useProgram(compositionProgram)
  gl.uniform1i(locations.composition.uniforms.u_substrate, 0)
  gl.uniform1i(locations.composition.uniforms.u_smoothed, 1)
  gl.uniform1i(locations.composition.uniforms.u_agents, 2)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, renderSubstratesTexture)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, agentsFeedbackPingPong.pingpong.front.tex)
  gl.activeTexture(gl.TEXTURE2)
  gl.bindTexture(gl.TEXTURE_2D, renderInsertionTexture)
  for (let i = 0; i < 4; i++) {
    gl.uniform1i(locations.composition.uniforms[`u_deposit${i}`], 3 + i)
    gl.activeTexture(gl.TEXTURE3 + i)
    gl.bindTexture(gl.TEXTURE_2D, drawAgentsTextures[i])
  }
  gl.uniform1i(locations.composition.uniforms.u_dots, 7)
  gl.activeTexture(gl.TEXTURE7)
  gl.bindTexture(gl.TEXTURE_2D, dotsTexture)
  gl.uniform1i(locations.composition.uniforms.u_activeDeposit, activeDeposit)
  gl.uniform1i(
    locations.composition.uniforms.u_compositionMode,
    compositionMode
  )
  gl.uniform1f(locations.composition.uniforms.u_time, performance.now() * 0.001)

  // draw 2 triangles full screen, which will execute the fragment shader
  // on the whole texture of the agents (clean full quad update of the agents)
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // SOBEL FILTER
  // we use the render insertion buffer for optimiztion purposes
  //
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderInsertionFB)
  gl.viewport(0, 0, cvs.width, cvs.height)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0])
  // bind the quad vertices
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.sobel.attributes.a_position)
  gl.vertexAttribPointer(
    locations.sobel.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )
  // program & uniforms
  gl.useProgram(sobelProgram)
  gl.uniform1f(locations.sobel.uniforms.u_resolution, CVS_SIZE)
  gl.uniform1f(locations.sobel.uniforms.u_strength, sobelStrength)
  gl.uniform1i(locations.sobel.uniforms.u_texture, 0)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, compositionTexture)
  // draw
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  //
  // FINAL RENDER
  //

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.drawBuffers([gl.BACK])

  // draw the texture on a quad
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
  gl.enableVertexAttribArray(locations.post.attributes.a_position)
  gl.vertexAttribPointer(
    locations.post.attributes.a_position,
    2,
    gl.FLOAT,
    false,
    0,
    0
  )

  // program & uniforms
  gl.useProgram(postProgram)
  gl.uniform1i(locations.post.uniforms.u_texture, 0)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, renderInsertionTexture)

  // draw
  gl.drawArrays(gl.TRIANGLES, 0, 6)

  // swap the 2 textures for the ping pong effect
  agentsPingPong.swap()
  substratePingpong.swap()
  agentsFeedbackPingPong.swap()

  frame++
}
requestAnimationFrame(loop)
