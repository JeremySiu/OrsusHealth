import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function LoadingHeartModel() {
  const { scene, animations } = useGLTF('/pumping_heart_model/scene.gltf');
  const group = useRef();
  const mixer = useRef(null);

  // Greyscale material — slightly lighter so it reads well on the dark bg
  const greyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8a8a8a',
    roughness: 0.35,
    metalness: 0.08,
  }), []);

  // Apply greyscale material to every mesh
  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = greyMaterial.clone();
      }
    });
  }, [scene, greyMaterial]);

  // Animation mixer at 1x speed (double the landing page's 0.5x)
  useEffect(() => {
    if (animations && animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(scene);
      const action = mixer.current.clipAction(animations[0]);
      action.play();
      mixer.current.timeScale = 1.0;
    }
    return () => {
      if (mixer.current) mixer.current.stopAllAction();
    };
  }, [scene, animations]);

  useFrame((_, delta) => {
    if (mixer.current) mixer.current.update(delta);
    if (group.current) {
      // Faster spin than landing page (0.8 vs 0.3)
      group.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

// Camera auto-fit (same logic as HeartCanvas)
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

export default function LoadingScreen({ fadeOut = false }) {
  return (
    <div className={`loading-screen${fadeOut ? ' loading-screen--fade-out' : ''}`}>
      <div className="loading-heart-container">
        <Canvas camera={{ fov: 45, near: 0.1, far: 2000 }}>
          {/* Neutral white/grey lighting — no coloured point light */}
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 7]} intensity={1.4} />
          <directionalLight position={[-5, 5, -5]} intensity={0.5} />

          <React.Suspense fallback={null}>
            <LoadingHeartModel />
          </React.Suspense>

          <AutoFit />
        </Canvas>
      </div>
    </div>
  );
}
