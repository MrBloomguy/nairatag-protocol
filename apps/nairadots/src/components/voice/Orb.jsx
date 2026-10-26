import React, { useEffect, useRef } from 'react';

// WebGL Vertex Shader
const VERTEX_SHADER_SRC = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = (position + 1.0) * 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// WebGL Fragment Shader for 3D Audio-Reactive Fluid Orb
const FRAGMENT_SHADER_SRC = `
precision highp float;
varying vec2 vUv;

uniform float u_time;
uniform float u_volume;
uniform int u_state; // 0: idle, 1: listening, 2: thinking, 3: speaking
uniform vec2 u_resolution;
uniform vec3 u_color1; // Neon Lime (#c9f36e -> 0.788, 0.953, 0.431)
uniform vec3 u_color2; // Mint / Emerald (#10b981 -> 0.063, 0.725, 0.506)
uniform vec3 u_color3; // Electric Cyan (#38bdf8 -> 0.220, 0.741, 0.973)
uniform vec3 u_color4; // Deep Core (#064e3b -> 0.024, 0.306, 0.231)

// Simplex 3D noise functions
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100.0);
  for (int i = 0; i < 3; ++i) {
    v += a * snoise(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  float dist = length(uv);

  float time = u_time * 0.8;
  float stateMult = 1.0;
  float noiseDisplacement = 0.0;

  // Base spherical radius
  float baseRadius = 0.30;

  if (u_state == 1) {
    // LISTENING: audio-reactive expansion + ripple spikes
    time *= 1.35;
    baseRadius += u_volume * 0.07;
    vec3 np = vec3(uv * 3.5, time * 1.2);
    noiseDisplacement = fbm(np) * (0.05 + u_volume * 0.12);
  } else if (u_state == 2) {
    // THINKING: rapid celestial swirling vortex
    time *= 2.8;
    float angle = atan(uv.y, uv.x) + time * 0.6;
    vec2 rotatedUv = vec2(cos(angle), sin(angle)) * dist;
    vec3 np = vec3(rotatedUv * 4.2, time * 0.8);
    noiseDisplacement = fbm(np) * 0.07;
    baseRadius += sin(time * 3.0) * 0.015;
  } else if (u_state == 3) {
    // SPEAKING: rich harmonic wave crests dancing with speech audio
    time *= 1.5;
    baseRadius += (0.04 + u_volume * 0.09) * sin(time * 4.0);
    vec3 np = vec3(uv * 3.0, time * 1.5);
    noiseDisplacement = fbm(np) * (0.08 + u_volume * 0.14);
  } else {
    // IDLE: calm organic harmonic breathing
    time *= 0.7;
    baseRadius += sin(time * 1.8) * 0.015;
    vec3 np = vec3(uv * 2.8, time * 0.7);
    noiseDisplacement = fbm(np) * 0.04;
  }

  float orbRadius = baseRadius + noiseDisplacement;
  float delta = dist - orbRadius;

  // Fluid color mixing across the sphere
  float noiseColor = fbm(vec3(uv * 2.2, time * 0.5));
  float noiseColor2 = fbm(vec3(uv * 4.0, time * 0.8 + 10.0));

  vec3 colorA = mix(u_color1, u_color2, smoothstep(-0.4, 0.4, noiseColor));
  vec3 colorB = mix(u_color3, u_color4, smoothstep(-0.3, 0.5, noiseColor2));
  vec3 orbColor = mix(colorA, colorB, smoothstep(0.0, baseRadius * 1.2, dist));

  // Add inner luminous core
  float coreGlow = smoothstep(baseRadius * 0.7, 0.0, dist);
  orbColor += vec3(0.9, 1.0, 0.8) * coreGlow * 0.45;

  // Fresnel rim glow
  float fresnel = 1.0 - smoothstep(0.0, orbRadius, dist);
  float rim = pow(1.0 - abs(dist - orbRadius) / orbRadius, 3.0);
  orbColor += u_color1 * rim * 0.7;

  // Edge anti-aliasing & soft volumetric falloff
  float alpha = smoothstep(0.02, -0.02, delta);

  // Outer ambient volumetric corona / aura
  float aura = exp(-dist * 5.2) * 0.55;
  if (u_state == 1) aura *= (1.0 + u_volume * 1.8);
  if (u_state == 3) aura *= (1.2 + u_volume * 1.5);
  vec3 auraColor = mix(u_color1, u_color2, dist * 2.0);

  vec3 finalColor = mix(auraColor * aura, orbColor, alpha);
  float finalAlpha = clamp(alpha + aura * 0.85, 0.0, 1.0);

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r / 255, g / 255, b / 255];
}

export default function Orb({
  state = 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking' | 'connecting'
  volume = 0,
  colors = ['#c9f36e', '#10b981', '#38bdf8', '#064e3b'],
  size = 280,
  className = '',
  agentTag = '',
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const uniformsRef = useRef({});
  const smoothedVolumeRef = useRef(0);
  const timeRef = useRef(0);

  // Map state to integer uniform
  const stateNum = state === 'listening' ? 1
    : state === 'thinking' ? 2
    : state === 'speaking' || state === 'talking' ? 3
    : state === 'connecting' ? 1
    : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high-DPI displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    let gl = null;
    try {
      gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    } catch {
      gl = null;
    }

    if (!gl) {
      // Graceful 2D fallback for restricted environments
      renderCanvas2dFallback(canvas, size, stateNum, volume, colors);
      return;
    }

    glRef.current = gl;

    // Compile Shader helper
    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Orb shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Orb shader program link error:', gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Fullscreen quad buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
      ]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    uniformsRef.current = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_volume: gl.getUniformLocation(program, 'u_volume'),
      u_state: gl.getUniformLocation(program, 'u_state'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_color1: gl.getUniformLocation(program, 'u_color1'),
      u_color2: gl.getUniformLocation(program, 'u_color2'),
      u_color3: gl.getUniformLocation(program, 'u_color3'),
      u_color4: gl.getUniformLocation(program, 'u_color4'),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let lastTimestamp = performance.now();

    const render = (now) => {
      const dt = (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      timeRef.current += Math.min(dt, 0.1);

      // Smooth audio volume reactivity with momentum damping
      const targetVolume = volume || (stateNum === 3 ? (0.25 + 0.2 * Math.sin(timeRef.current * 8)) : 0);
      smoothedVolumeRef.current += (targetVolume - smoothedVolumeRef.current) * 0.18;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.uniform1f(uniformsRef.current.u_time, timeRef.current);
      gl.uniform1f(uniformsRef.current.u_volume, smoothedVolumeRef.current);
      gl.uniform1i(uniformsRef.current.u_state, stateNum);
      gl.uniform2f(uniformsRef.current.u_resolution, canvas.width, canvas.height);

      const c1 = hexToRgb(colors[0] || '#c9f36e');
      const c2 = hexToRgb(colors[1] || '#10b981');
      const c3 = hexToRgb(colors[2] || '#38bdf8');
      const c4 = hexToRgb(colors[3] || '#064e3b');

      gl.uniform3f(uniformsRef.current.u_color1, c1[0], c1[1], c1[2]);
      gl.uniform3f(uniformsRef.current.u_color2, c2[0], c2[1], c2[2]);
      gl.uniform3f(uniformsRef.current.u_color3, c3[0], c3[1], c3[2]);
      gl.uniform3f(uniformsRef.current.u_color4, c4[0], c4[1], c4[2]);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (gl) {
        try {
          gl.deleteProgram(program);
          gl.deleteShader(vertShader);
          gl.deleteShader(fragShader);
          gl.deleteBuffer(positionBuffer);
        } catch { }
      }
    };
  }, [size, stateNum, colors, volume]);

  return (
    <div
      className={`elevenlabs-orb-container ${className}`}
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto',
      }}
    >
      {/* Outer Atmospheric Radiant Halos */}
      <div
        className={`elevenlabs-orb-aura aura-${state}`}
        style={{
          position: 'absolute',
          inset: '-20%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors[0]}22 0%, ${colors[1]}15 45%, transparent 70%)`,
          filter: 'blur(36px)',
          pointerEvents: 'none',
          transition: 'transform 0.4s ease, opacity 0.4s ease',
          transform: state === 'listening' ? 'scale(1.15)' : state === 'speaking' ? 'scale(1.2)' : 'scale(1.0)',
          opacity: state === 'thinking' ? 0.75 : 0.6,
        }}
      />

      {/* The 3D WebGL Shader Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'block',
          position: 'relative',
          zIndex: 2,
        }}
      />

      {/* Subtle Holographic Center Insignia */}
      <div
        className="elevenlabs-orb-glyph"
        style={{
          position: 'absolute',
          zIndex: 3,
          pointerEvents: 'none',
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(9, 13, 10, 0.45)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201, 243, 110, 0.35)',
          boxShadow: '0 0 20px rgba(201, 243, 110, 0.25), inset 0 0 10px rgba(255, 255, 255, 0.1)',
          color: '#c9f36e',
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          transition: 'all 0.3s ease',
        }}
      >
        <span>{agentTag ? `₦` : '✦'}</span>
      </div>
    </div>
  );
}

// Graceful 2D canvas fallback if WebGL is unavailable
function renderCanvas2dFallback(canvas, size, stateNum, volume, colors) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let frame = 0;

  const loop = () => {
    frame += 0.04;
    ctx.clearRect(0, 0, size, size);
    const center = size / 2;
    const radius = size * 0.35 + (stateNum === 1 ? volume * 15 : Math.sin(frame * 2) * 5);

    const grad = ctx.createRadialGradient(center, center, 5, center, center, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, colors[0] || '#c9f36e');
    grad.addColorStop(0.7, colors[1] || '#10b981');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
