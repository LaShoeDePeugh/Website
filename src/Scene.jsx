import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// ── Procedural soft radial texture (for glow + shadow) ────────────
// Built on a canvas so we don't ship extra image assets.
function makeRadialTexture(stops) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([offset, color]) => g.addColorStop(offset, color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ── The hero bottle ───────────────────────────────────────────────
// The real product photo, floating and tilting toward the cursor.
// It never rotates far enough to reveal that it's a flat plane, so it
// reads as a premium floating product shot rather than a spinning sheet.
function Bottle() {
  const group = useRef()
  const texture = useTexture('/assets/real_bottle.png')
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const { x: px, y: py } = state.pointer // -1..1, follows the mouse over the canvas

    // Gentle vertical float.
    group.current.position.y = Math.sin(t * 0.8) * 0.12

    // Tilt toward the cursor, plus a slow idle sway so it stays alive even with
    // no pointer (e.g. on touch devices). Small angles only — never edge-on.
    const targetY = px * 0.32 + Math.sin(t * 0.35) * 0.06
    const targetX = -py * 0.16 + Math.sin(t * 0.5) * 0.025
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.06)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.06)
  })

  // Plane sized to the bottle photo's TRUE aspect ratio (1431x3833 = 0.373).
  // Previous 3.7x6.0 stretched it 65% too wide AND too small; this is taller/slimmer/bigger.
  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[2.7, 7.2]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.04} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ── Soft studio glow behind the product ───────────────────────────
function Glow() {
  const tex = useMemo(
    () =>
      makeRadialTexture([
        [0.0, 'rgba(196, 240, 230, 0.55)'],
        [0.35, 'rgba(150, 214, 200, 0.30)'],
        [1.0, 'rgba(150, 214, 200, 0.0)'],
      ]),
    []
  )
  return (
    <mesh position={[0, 0.3, -2.5]} scale={[10, 10, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ── Soft contact shadow under the product ─────────────────────────
function ShadowBlob() {
  const tex = useMemo(
    () =>
      makeRadialTexture([
        [0.0, 'rgba(20, 45, 55, 0.45)'],
        [0.55, 'rgba(20, 45, 55, 0.18)'],
        [1.0, 'rgba(20, 45, 55, 0.0)'],
      ]),
    []
  )
  return (
    <mesh position={[0, -3.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[5.5, 3.0, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ── Floating peppermint leaves (real depth, gentle motion) ────────
function PeppermintLeaf({ position, rotation, scale }) {
  const texture = useTexture('/assets/lsdp_Peppermint.png')
  return (
    <Float speed={1.4} rotationIntensity={0.8} floatIntensity={1.1}>
      <mesh position={position} rotation={rotation} scale={scale}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.1}
          side={THREE.DoubleSide}
          roughness={0.7}
        />
      </mesh>
    </Float>
  )
}

export default function Scene() {
  return (
    <div className="canvas-container" style={{ width: '100%', height: '100%' }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 9], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 6]} intensity={1.1} />
        <directionalLight position={[-6, 2, -4]} intensity={0.5} color="#dff5ef" />

        <Suspense fallback={null}>
          <Glow />

          {/* Just two small foreground leaves for depth — the page background
              already supplies the big drifting leaves, so we don't double up. */}
          <PeppermintLeaf position={[-2.8, 2.4, 1.0]} rotation={[0.4, 1, 0.2]} scale={0.5} />
          <PeppermintLeaf position={[2.8, -1.8, 0.8]} rotation={[0.5, 0.5, 0.8]} scale={0.45} />

          <Bottle />
          <ShadowBlob />
        </Suspense>
      </Canvas>
    </div>
  )
}
