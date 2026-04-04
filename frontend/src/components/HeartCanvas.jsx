import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function HeartModel({ onPump }) {
  const { gl } = useThree();
  const { scene, animations } = useGLTF('/pumping_heart_model/scene.gltf');
  const group = useRef();
  const mixer = useRef(null);
  const scaleTarget = useRef(1.0);
  const currentScale = useRef(1.0);
  const colorTarget = useRef(0); // 0 = grey, 1 = red
  const currentColor = useRef(0);
  const doPumpRef = useRef(null);

  // Greyscale and red materials
  const greyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#4a4a4a',
    roughness: 0.5,
    metalness: 0.1,
  }), []);

  const redMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8b1a1a',
    roughness: 0.15,
    metalness: 0.1,
  }), []);

  // Apply initial grey material to all meshes
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = greyMaterial.clone();
      }
    });
  }, [scene, greyMaterial]);

  // Setup animation mixer at 0.5x speed
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);
      const clip = animations[0];
      const action = mixer.current.clipAction(clip);
      action.play();
      mixer.current.timeScale = 0.5; // Half speed idle

      // Fire the pump effect each time the animation loops
      const onLoop = () => { doPumpRef.current(); };
      mixer.current.addEventListener('loop', onLoop);

      return () => {
        mixer.current.removeEventListener('loop', onLoop);
        mixer.current.stopAllAction();
      };
    }
    return () => {
      if (mixer.current) mixer.current.stopAllAction();
    };
  }, [scene, animations]);

  useFrame((state, delta) => {
    // Update animation mixer
    if (mixer.current) mixer.current.update(delta);

    if (group.current) {
      // Idle slow rotation
      group.current.rotation.y += delta * 0.3;

      // Smooth scale interpolation (gentler lerp factor)
      currentScale.current = THREE.MathUtils.lerp(
        currentScale.current,
        scaleTarget.current,
        0.05 // slower interpolation
      );
      const s = currentScale.current;
      group.current.scale.set(s, s, s);

      // Smooth color interpolation from grey to red
      currentColor.current = THREE.MathUtils.lerp(
        currentColor.current,
        colorTarget.current,
        0.03
      );
      const t = currentColor.current;
      const lerpedColor = new THREE.Color('#4a4a4a').lerp(new THREE.Color('#8b1a1a'), t);
      scene.traverse((child) => {
        if (child.isMesh) {
          child.material.color.copy(lerpedColor);
        }
      });
    }
  });

  const doPump = useCallback(() => {
    // Gentle pump: smaller scale spike
    scaleTarget.current = 1.12;
    setTimeout(() => { scaleTarget.current = 1.0; }, 300);

    // Transition color towards red
    colorTarget.current = Math.min(colorTarget.current + 0.25, 1.0);

    onPump();
  }, [onPump]);

  // Keep ref in sync so the mixer loop listener always calls the latest version
  useEffect(() => {
    doPumpRef.current = doPump;
  }, [doPump]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    doPump();
  }, [doPump]);

  const handlePointerOver = useCallback(() => {
    gl.domElement.style.cursor = 'pointer';
  }, [gl]);

  const handlePointerOut = useCallback(() => {
    gl.domElement.style.cursor = 'default';
  }, [gl]);

  return (
    <group ref={group}>
      <primitive
        object={scene}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
}

// Auto-fit camera to the model on first render
function AutoFit() {
  const { camera, scene } = useThree();
  const fitted = useRef(false);

  useFrame(() => {
    if (!fitted.current) {
      const box = new THREE.Box3().setFromObject(scene);
      if (box.isEmpty()) return;

      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      camera.position.set(center.x, center.y, center.z + maxDim * 1.8);
      camera.lookAt(center);
      camera.updateProjectionMatrix();

      fitted.current = true;
    }
  });

  return null;
}

export default function HeartCanvas({ onPump }) {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 2000 }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[5, 10, 7]} intensity={1.8} />
      <directionalLight position={[-5, 5, -5]} intensity={0.6} />
      <pointLight position={[0, 0, 5]} intensity={1} color="#ffffffff" />

      <React.Suspense fallback={null}>
        <HeartModel onPump={onPump} />
      </React.Suspense>

      <AutoFit />
    </Canvas>
  );
}
