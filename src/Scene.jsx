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
// Framing constants. The photo is 1431x3833 (aspect 0.3733) and the product does
// NOT fill it: the bottle body sits in x 7%-60%, with the trigger handle jutting
// out to x 97%. So the image's centre is NOT the product's centre — without the
// nudge below, the bottle hangs left and crowds the hero copy.
// The camera (fov 45 @ z=9) shows 7.46 world units of height whatever the screen
// size, so these are resolution-independent. H=6.0 fills ~80% of the viewport —
// big and dominant — while still leaving clearance under the nav and, crucially,
// room BELOW the bottle for the contact shadow that makes it feel real.
const BOTTLE_ASPECT = 1431 / 3833
const BOTTLE_H = 6.0
const BOTTLE_W = BOTTLE_H * BOTTLE_ASPECT
const BOTTLE_X = 0.3                        // re-centre the product mass in the canvas
const BOTTLE_Y = 0.05
const BOTTLE_BOTTOM = BOTTLE_Y - BOTTLE_H * 0.47 // where the bottle actually "lands"

function Bottle() {
  const group = useRef()
  const texture = useTexture('/assets/real_bottle.png')
  texture.colorSpace = THREE.SRGBColorSpace
  // The label is minified ~5.7x (758px of source body -> ~134px on screen), and at
  // that ratio plain trilinear mipmapping smears the lettering. Max anisotropy is
  // what keeps "La Shoe de Peugh" and "Shoe & Foot Deodorizing Spray" crisp.
  texture.anisotropy = 16
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const { x: px, y: py } = state.pointer // -1..1, follows the mouse over the canvas

    // Gentle vertical float.
    group.current.position.y = BOTTLE_Y + Math.sin(t * 0.8) * 0.09

    // Parallax toward the cursor. Angles are deliberately TINY: this is a flat
    // photo plane, and a perspective camera keystones it as soon as it turns —
    // which is what made the bottle read as a leaning sticker. At <=6 degrees the
    // shear is imperceptible and it just feels alive.
    const targetY = px * 0.10 + Math.sin(t * 0.35) * 0.02
    const targetX = -py * 0.05 + Math.sin(t * 0.5) * 0.012
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, 0.06)
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, 0.06)
  })

  return (
    <group ref={group} position={[BOTTLE_X, BOTTLE_Y, 0]}>
      <mesh>
        <planeGeometry args={[BOTTLE_W, BOTTLE_H]} />
        {/* Front-side only: the photo already carries its own lighting, so an unlit
            material keeps it looking like the real product instead of tinted CG. */}
        <meshBasicMaterial map={texture} transparent alphaTest={0.04} side={THREE.FrontSide} toneMapped={false} />
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
    <mesh position={[BOTTLE_X, 0.1, -2.5]} scale={[10, 10, 1]}>
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
  // NOT laid flat. The camera sits at eye level (y=0), so a floor-plane shadow is
  // viewed edge-on and effectively disappears — which left the bottle floating with
  // nothing anchoring it. Facing the camera, squashed on Y, it reads as the soft
  // contact shadow a real product shot would have.
  // It also sits under the BODY, not the plane centre — the body is offset left in
  // the photo, so a plane-centred shadow drifts out from under the bottle.
  return (
    <mesh position={[BOTTLE_X - BOTTLE_W * 0.165, BOTTLE_BOTTOM - 0.1, -0.1]} scale={[1.9, 0.6, 1]}>
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

// On a 1x display the canvas renders 1:1, so the heavily-minified label ends up
// soft. Rendering at 2x and letting the browser downsample is real supersampling
// and visibly sharpens the lettering. Only done on wide screens — it costs 4x the
// fill rate, which we don't want to spend on phones.
function renderScale() {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio || 1
  return window.innerWidth >= 1024 ? Math.min(2, dpr * 2) : Math.min(2, dpr)
}

export default function Scene() {
  const dpr = useMemo(renderScale, [])
  return (
    <div className="canvas-container" style={{ width: '100%', height: '100%' }}>
      <Canvas dpr={dpr} camera={{ position: [0, 0, 9], fov: 45 }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 6]} intensity={1.1} />
        <directionalLight position={[-6, 2, -4]} intensity={0.5} color="#dff5ef" />

        <Suspense fallback={null}>
          <Glow />

          {/* Just two small foreground leaves for depth — the page background
              already supplies the big drifting leaves, so we don't double up.
              Kept clear of the bottle's silhouette so it stays a clean product
              shot rather than a collage. */}
          <PeppermintLeaf position={[-2.3, 2.6, 1.0]} rotation={[0.4, 1, 0.2]} scale={0.45} />
          <PeppermintLeaf position={[2.9, -2.3, 0.8]} rotation={[0.5, 0.5, 0.8]} scale={0.4} />

          <Bottle />
          <ShadowBlob />
        </Suspense>
      </Canvas>
    </div>
  )
}
