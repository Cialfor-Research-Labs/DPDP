/**
 * AICore — The Consciousness Manifold
 *
 * 22,000 GPU particles flowing through a 3D curl-noise vector field,
 * creating organic, attractor-like neural pathways.
 *
 * Driven by: THREE.Points + custom GLSL shaders + additive blending
 * Responds to: mouse position, AI state from Zustand store
 */

import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../stores/appStore';

/* ═══════════════════════════════════════════
   VERTEX SHADER
   Curl noise → organic flow field
   Energy pulse → periodic spherical waves
   Mouse gravity → interactive attraction
═══════════════════════════════════════════ */
const VERTEX = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouse;      // -1..1 NDC
  uniform float uEnergy;     // 0..1 from store
  uniform float uHover;      // 0..1 mouse proximity
  uniform float uPixelRatio;

  attribute float aOffset;   // stagger offset per particle (0..1)
  attribute float aSize;     // base size multiplier
  attribute float aLayer;    // 0=inner 0.5=mid 1=outer

  varying vec3  vColor;
  varying float vAlpha;
  varying float vPulse;

  // ── Noise Primitives ──────────────────────────
  vec3 mod289v3(vec3 x) { return x - floor(x*(1./289.))*289.; }
  vec4 mod289v4(vec4 x) { return x - floor(x*(1./289.))*289.; }
  vec4 permute(vec4 x)  { return mod289v4((x*34.+1.)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291 - 0.85373472*r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1./6., 1./3.);
    const vec4 D = vec4(0., .5, 1., 2.);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v3(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0., i1.z, i2.z, 1.)) +
      i.y + vec4(0., i1.y, i2.y, 1.)) +
      i.x + vec4(0., i1.x, i2.x, 1.));
    float n_ = 1./7.;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.*x_);
    vec4 x = x_*ns.x + ns.yyyy;
    vec4 y = y_*ns.x + ns.yyyy;
    vec4 h = 1. - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.+1.;
    vec4 s1 = floor(b1)*2.+1.;
    vec4 sh = -step(h, vec4(0.));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.);
    m = m*m;
    return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  // ── Curl Noise (divergence-free) ─────────────
  // Creates beautiful looping / spiral flows with no clumping
  vec3 curl(vec3 p) {
    float e = 0.12;
    vec3 dx = vec3(e, 0., 0.);
    vec3 dy = vec3(0., e, 0.);
    vec3 dz = vec3(0., 0., e);

    float ny1 = snoise(p+dx); float ny0 = snoise(p-dx);
    float nz1 = snoise(p+dy); float nz0 = snoise(p-dy);
    float nx1 = snoise(p+dz); float nx0 = snoise(p-dz);

    // Derivatives of a noise-derived vector field; curl of that field
    float px = (nz1-nz0) - (ny1-ny0);
    float py = (nx1-nx0) - (nz1-nz0);
    float pz = (ny1-ny0) - (nx1-nx0);

    // Avoid zero-vectors in normalize
    float len = max(length(vec3(px,py,pz)), 0.001);
    return vec3(px,py,pz) / len;
  }

  void main() {
    float t = uTime * (0.12 + uEnergy * 0.08) + aOffset * 6.2832;

    // ── Base manifold position ──────────────────
    vec3 pos = position; // initial distribution stored in geometry

    // Multi-octave curl field integration
    // Each octave adds finer-scale detail
    float amp = 3.5 + aLayer * 2.5;
    vec3 p0 = pos * 0.20 + vec3(0., 0., t * 0.8);
    vec3 p1 = pos * 0.45 + vec3(100., 0., t * 1.2);
    vec3 p2 = pos * 0.90 + vec3(200., 0., t * 1.6);

    pos += curl(p0) * amp;
    pos += curl(p1) * (amp * 0.5);
    pos += curl(p2) * (amp * 0.25);

    // Breathing: gentle uniform scale pulsation
    float breath = 1.0 + sin(uTime * 0.4 + aOffset * 3.14) * 0.06;
    pos *= breath;

    // ── Energy Pulse (spherical wave) ───────────
    float distC = length(pos);
    float pulseFreq = 0.18 + uEnergy * 0.12;  // slower = less irritating
    float pulsePhase = fract(uTime * pulseFreq + aLayer * 0.5);
    float pulseR = pulsePhase * 12.0;
    float pulseFall = max(0., 1. - abs(distC - pulseR) / 1.2);
    pos += normalize(pos + 0.001) * pulseFall * (0.5 + uEnergy * 0.5);

    // ── Mouse Gravity ───────────────────────────
    // Project mouse NDC onto the z=0 plane in camera space
    // approximation: scale mouse by viewport-like factor
    vec3 mouseWorld = vec3(uMouse.x * 9., uMouse.y * 5., 2.);
    vec3 toMouse    = mouseWorld - pos;
    float mDist     = length(toMouse);
    float mForce    = uHover * smoothstep(5., 0., mDist) * 2.5;
    pos += normalize(toMouse + 0.001) * mForce;

    // ── Screen-space output ──────────────────────
    vec4 mvPos  = modelViewMatrix * vec4(pos, 1.);
    float depth = -mvPos.z; // positive

    // Point size: larger near center, attenuated by depth
    float sz = aSize * (7. + uEnergy * 5.) * uPixelRatio / max(depth * 0.07, 0.5);
    sz *= (1. + pulseFall * 2.0);
    gl_PointSize = clamp(sz, 0.5, 24.);
    gl_Position  = projectionMatrix * mvPos;

    // ── Color ───────────────────────────────────
    vec3 violet  = vec3(0.486, 0.231, 0.929);  // #7c3aed
    vec3 lavender= vec3(0.655, 0.545, 0.980);  // #a78bfa
    vec3 cyan    = vec3(0.024, 0.714, 0.831);  // #06b6d4
    vec3 ice     = vec3(0.404, 0.910, 0.976);  // #67e8f9
    vec3 white   = vec3(1.);

    // Layer: inner=violet/lavender, outer=cyan/ice
    vec3 base = mix(mix(violet, lavender, aOffset), mix(cyan, ice, aOffset), aLayer);

    // Pulse: particles in the wave front glow white-hot
    vec3 pulseC = mix(base, white, pulseFall * 0.8);

    // Depth: slightly brighter at front
    float depthFactor = clamp(1. - (depth - 3.) / 20., 0.2, 1.);

    vColor = pulseC * depthFactor;
    vAlpha = clamp(0.08 + pulseFall * 0.6 + uEnergy * 0.1, 0., 0.7);  // cap to avoid washing text
    vPulse = pulseFall;
  }
`;

/* ═══════════════════════════════════════════
   FRAGMENT SHADER
   Soft circular sprite with glow halo
═══════════════════════════════════════════ */
const FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec3  vColor;
  varying float vAlpha;
  varying float vPulse;

  void main() {
    vec2 uv   = gl_PointCoord - 0.5;
    float d   = length(uv);
    if (d > 0.5) discard;

    // Soft core
    float core = 1. - smoothstep(0., 0.5, d);
    // Wide glow halo (expensive but worth it for <25k particles)
    float halo = exp(-d * 3.5) * 0.6 * vPulse;

    float alpha = vAlpha * (core + halo);
    vec3  col   = vColor * (core * 1.5 + halo);

    gl_FragColor = vec4(col, alpha);
  }
`;

/* ═══════════════════════════════════════════
   GEOMETRY HELPERS
═══════════════════════════════════════════ */
function buildGeometry(count: number) {
  const positions  = new Float32Array(count * 3);
  const offsets    = new Float32Array(count);
  const sizes      = new Float32Array(count);
  const layers     = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Distribute across 3 nested shells for visual depth
    const shell  = Math.floor(Math.random() * 3);
    const radius = [2.5, 4.5, 7.0][shell] + Math.random() * 1.5;
    const theta  = Math.random() * Math.PI * 2;
    const phi    = Math.acos(2 * Math.random() - 1);

    positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    offsets[i] = Math.random();
    sizes[i]   = 0.3 + Math.random() * 0.7;
    layers[i]  = shell / 2; // 0, 0.5, or 1.0
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aOffset',   new THREE.BufferAttribute(offsets, 1));
  geo.setAttribute('aSize',     new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aLayer',    new THREE.BufferAttribute(layers, 1));
  return geo;
}

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
const PARTICLE_COUNT = 22_000;

export default function AICore() {
  const pointsRef  = useRef<THREE.Points>(null!);
  const matRef     = useRef<THREE.ShaderMaterial>(null!);
  const aiState    = useAppStore((s) => s.aiState);
  const energyLevel = useAppStore((s) => s.energyLevel);

  const geometry = useMemo(() => buildGeometry(PARTICLE_COUNT), []);

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uMouse:      { value: new THREE.Vector2(0, 0) },
    uEnergy:     { value: 0.3 },
    uHover:      { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  }), []);

  // Map AI state → energy level override
  const getTargetEnergy = useCallback(() => {
    switch (aiState) {
      case 'thinking':   return 0.85;
      case 'excited':    return 1.0;
      case 'responding': return 0.65;
      case 'listening':  return 0.50;
      case 'complete':   return 0.40;
      default:           return energyLevel;
    }
  }, [aiState, energyLevel]);

  useFrame((state, delta) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;

    u.uTime.value += delta;

    // Smooth mouse tracking
    const mx = state.pointer.x;
    const my = state.pointer.y;
    (u.uMouse.value as THREE.Vector2).lerp(new THREE.Vector2(mx, my), 0.06);

    // Detect mouse activity for interaction strength
    const hover = (Math.abs(mx) + Math.abs(my)) > 0.02 ? 1 : 0;
    u.uHover.value += (hover - u.uHover.value) * 0.05;

    // Energy animation
    const target = getTargetEnergy();
    u.uEnergy.value += (target - u.uEnergy.value) * 0.025;

    // Slow overall rotation
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.015;
      pointsRef.current.rotation.x  = Math.sin(u.uTime.value * 0.07) * 0.06;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </points>
  );
}
