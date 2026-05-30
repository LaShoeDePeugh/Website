import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  PerspectiveCamera,
  Float,
  Environment,
  ContactShadows,
  Text,
  Center,
  useTexture
} from '@react-three/drei'
import * as THREE from 'three'

function BoxRounded({ args, radius, smoothness, ...props }) {
  const shape = useMemo(() => {
    let shape = new THREE.Shape();
    let [width, height] = args;
    let x = -width / 2, y = -height / 2;
    shape.moveTo(x, y + radius);
    shape.lineTo(x, y + height - radius);
    shape.quadraticCurveTo(x, y + height, x + radius, y + height);
    shape.lineTo(x + width - radius, y + height);
    shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    shape.lineTo(x + width, y + radius);
    shape.quadraticCurveTo(x + width, y, x + width - radius, y);
    shape.lineTo(x + radius, y);
    shape.quadraticCurveTo(x, y, x, y + radius);
    return shape;
  }, [args, radius]);

  const extrudeSettings = {
    depth: args[2],
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: radius,
    bevelThickness: radius
  };

  return (
    <mesh {...props}>
      <extrudeGeometry args={[shape, extrudeSettings]} />
      <meshStandardMaterial color="#ffffff" roughness={0.3} />
    </mesh>
  )
}

function Bottle() {
  const mesh = useRef()
  const texture = useTexture('/assets/real_bottle.png')
  // Reduce specular reflection on the label
  texture.colorSpace = THREE.SRGBColorSpace

  useFrame((state) => {
    if (mesh.current) {
      // Gentle floating and very slight rotation for the 2D plane
      mesh.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1
      mesh.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.1
    }
  })

  // Widened the plane to 4.0 x 6.5 to properly match original image aspect ratio.
  return (
    <mesh ref={mesh} position={[0, -0.8, 0]}>
      <planeGeometry args={[4.0, 6.5]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.01}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function PeppermintLeaf({ position, rotation, scale = 1 }) {
  // Use the actual mint leaf image provided by the user
  const texture = useTexture('/assets/lsdp_Peppermint.png')

  return (
    <Float speed={1.5} rotationIntensity={2} floatIntensity={1.5}>
      <mesh position={position} rotation={rotation} scale={scale}>
        {/* Use a plane or slightly curved geometry. Plane is better for raw images with alpha */}
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={texture}
          transparent={true}
          alphaTest={0.1} // to handle transparent background cleanly
          side={THREE.DoubleSide}
          roughness={0.6}
        />
      </mesh>
    </Float>
  )
}

export default function Scene() {
  return (
    <div className="canvas-container" style={{ width: '100%', height: '100%' }}>
      <Canvas shadows dpr={[1, 2]}>
        {/* Adjusted camera to frame the larger bottle without clipping the top */}
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={50} />

        <ambientLight intensity={0.7} />
        <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <spotLight position={[-10, 5, -10]} angle={0.3} penumbra={1} intensity={1.5} color="#e0f7fa" />


        <Suspense fallback={null}>
          <Environment preset="studio" />

          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
            <Bottle />
          </Float>

          {/* Floating Peppermint Leaves */}
          <PeppermintLeaf position={[-1.5, 2, -1]} rotation={[0.4, 1, 0.2]} scale={0.6} />
          <PeppermintLeaf position={[2, 0.5, 1]} rotation={[1, 0.2, 1]} scale={0.4} />
          <PeppermintLeaf position={[-1.2, -1, 0.5]} rotation={[0.5, 0.5, 0.8]} scale={0.7} />
          <PeppermintLeaf position={[1.5, 2.5, -0.5]} rotation={[0.2, 0.8, 0.1]} scale={0.5} />

          <ContactShadows
            position={[0, -2.4, 0]}
            opacity={0.5}
            scale={10}
            blur={2}
            far={3}
            color="#1a2f3a"
          />
        </Suspense>

        <OrbitControls
          enableZoom={true}
          makeDefault
          autoRotate
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 3}
          enablePan={false}
          minDistance={3} // Allows zooming in
          maxDistance={10} // Prevents zooming out too far
        />
      </Canvas>
    </div>
  )
}
