/**
 * Scene — R3F Canvas wrapper
 * Postprocessing pipeline: Bloom → Chromatic Aberration → Noise
 * Camera reacts to scroll position and mouse
 */

import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2 } from 'three';
import AICore from './AICore';

function CameraRig() {
  useFrame((state) => {
    // Subtle mouse parallax on camera
    const mx = state.pointer.x * 0.5;
    const my = state.pointer.y * 0.3;
    state.camera.position.x += (mx - state.camera.position.x) * 0.02;
    state.camera.position.y += (my - state.camera.position.y) * 0.02;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.15}
        luminanceSmoothing={0.85}
        intensity={2.2}
        mipmapBlur
        radius={0.5}
      />
      <ChromaticAberration
        offset={new Vector2(0.0004, 0.0004)}
        radialModulation={false}
        modulationOffset={0}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise
        opacity={0.025}
        blendFunction={BlendFunction.SCREEN}
      />
      <Vignette
        offset={0.3}
        darkness={0.8}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 14], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
      }}
    >
      <color attach="background" args={['#03030a']} />

      <Suspense fallback={null}>
        <AICore />
        <CameraRig />
        <PostFX />
      </Suspense>
    </Canvas>
  );
}
