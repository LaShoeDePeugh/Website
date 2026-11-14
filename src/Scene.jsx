import React, { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
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

// ── Spray mist + "psst" sound ─────────────────────────────────────
// A fine spray from the sprayer nozzle. The nozzle is the square cap at the
// upper-RIGHT of the trigger head in hero_bottle.webp (its tip is ~80.6% across,
// 3.3% down the photo), on the same side as the trigger, so the mist shoots
// right. Like a light misting spray bottle it's a fan of crisp, tiny droplets:
// they leave the tip fast, slow down, then sprinkle downward and fade within
// about a second. No soft haze (that read as steam). Particles live inside the
// bottle's group, so they follow its tilt.
// A puff fires on its own every few seconds (silent) and whenever the pointer
// touches the bottle (with sound). The sound is synthesized white noise shaped
// like a trigger spray — no audio file to download. Browsers only allow sound
// after the visitor has clicked/tapped/pressed a key on the page, so until then
// the hover puff is silent; that's a browser rule we can't (and shouldn't) bypass.
const NOZZLE = [(0.806 - 0.5) * BOTTLE_W, (0.5 - 0.036) * BOTTLE_H, 0.05]
const MIST_MAX = 1200

let audioCtx = null
function getAudio() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
    // Unlock on the first real user gesture anywhere on the page.
    const unlock = () => audioCtx && audioCtx.state === 'suspended' && audioCtx.resume()
    ;['pointerdown', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }))
  }
  return audioCtx
}

function playPsst() {
  const ctx = getAudio()
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const noise = (secs) => {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    return src
  }

  // 1) The trigger: a tiny plastic "tk" click.
  const click = noise(0.02)
  const clickBand = ctx.createBiquadFilter()
  clickBand.type = 'bandpass'
  clickBand.frequency.value = 2600
  clickBand.Q.value = 4
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.5, t)
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
  click.connect(clickBand).connect(clickGain).connect(ctx.destination)
  click.start(t)

  // 2) The mist: a short, crisp, high "tsssht" — only the top of the spectrum
  //    (a fine nozzle has no low "whoosh"), sharp start, quick fade.
  const dur = 0.34
  const hiss = noise(dur)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 5000
  hp.Q.value = 0.9
  const sheen = ctx.createBiquadFilter()
  sheen.type = 'peaking'
  sheen.frequency.value = 9500
  sheen.Q.value = 1.2
  sheen.gain.value = 8
  const g = ctx.createGain()
  const s0 = t + 0.012
  g.gain.setValueAtTime(0.0001, s0)
  g.gain.exponentialRampToValueAtTime(0.32, s0 + 0.006)
  g.gain.setValueAtTime(0.3, s0 + 0.11)
  g.gain.exponentialRampToValueAtTime(0.0001, s0 + dur - 0.01)
  hiss.connect(hp).connect(sheen).connect(g).connect(ctx.destination)
  hiss.start(s0)
  hiss.stop(s0 + dur)
}

function SprayMist({ puffRef }) {
  const pointsRef = useRef()
  const tex = useMemo(
    // Crisp droplet: solid core with a short soft edge (a long fuzzy falloff looks like steam)
    () => makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,1)'], [0.8, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]),
    []
  )
  const sim = useMemo(() => ({
    pos: new Float32Array(MIST_MAX * 3),
    vel: new Float32Array(MIST_MAX * 3),
    age: new Float32Array(MIST_MAX).fill(99),
    life: new Float32Array(MIST_MAX).fill(1),
    size0: new Float32Array(MIST_MAX),
    size: new Float32Array(MIST_MAX),
    alpha: new Float32Array(MIST_MAX),
    next: 0,
  }), [])
  const uniforms = useMemo(() => ({
    uTex: { value: tex },
    uScale: { value: 500 },
    uColor: { value: new THREE.Color('#ffffff') },
  }), [tex])

  // Expose puff() to the bottle (hover) and the auto-timer.
  puffRef.current = (count = 420) => {
    for (let k = 0; k < count; k++) {
      const i = sim.next
      sim.next = (sim.next + 1) % MIST_MAX
      sim.pos[i * 3] = NOZZLE[0]
      sim.pos[i * 3 + 1] = NOZZLE[1] + (Math.random() - 0.5) * 0.02
      sim.pos[i * 3 + 2] = NOZZLE[2]
      // A fan about ±17°, aimed right and a touch down, the way it's held.
      const spread = (Math.random() - 0.5) * 0.6 - 0.05
      const speed = 4.5 + Math.random() * 4.5
      sim.vel[i * 3] = Math.cos(spread) * speed
      sim.vel[i * 3 + 1] = Math.sin(spread) * speed
      sim.vel[i * 3 + 2] = (Math.random() - 0.5) * speed * 0.2
      // Starts once the handle is most of the way in (~0.08s), then sprays ~⅓s
      sim.age[i] = -0.08 - Math.random() * 0.3
      sim.life[i] = 0.55 + Math.random() * 0.6
      // tiny droplets; a few slightly larger ones catch the light
      sim.size0[i] = Math.random() < 0.1 ? 0.045 + Math.random() * 0.02 : 0.014 + Math.random() * 0.026
    }
  }

  useFrame((state, dt) => {
    const g = pointsRef.current
    if (!g) return
    const step = Math.min(dt, 0.05)
    const bufH = state.gl.domElement.height
    uniforms.uScale.value = bufH / (2 * Math.tan(THREE.MathUtils.degToRad(45 / 2)))
    for (let i = 0; i < MIST_MAX; i++) {
      sim.age[i] += step
      const a = sim.age[i]
      if (a < 0 || a > sim.life[i]) { sim.alpha[i] = 0; continue }
      const k = a / sim.life[i]
      const drag = Math.exp(-3.8 * step) // droplets lose speed fast...
      sim.vel[i * 3] *= drag
      sim.vel[i * 3 + 1] = sim.vel[i * 3 + 1] * drag - 1.6 * step // ...then sprinkle down
      sim.vel[i * 3 + 2] *= drag
      sim.pos[i * 3] += sim.vel[i * 3] * step
      sim.pos[i * 3 + 1] += sim.vel[i * 3 + 1] * step
      sim.pos[i * 3 + 2] += sim.vel[i * 3 + 2] * step
      sim.size[i] = sim.size0[i]
      sim.alpha[i] = 0.9 * Math.pow(1 - k, 1.3)
    }
    g.geometry.attributes.position.needsUpdate = true
    g.geometry.attributes.aSize.needsUpdate = true
    g.geometry.attributes.aAlpha.needsUpdate = true
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[sim.pos, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sim.size, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[sim.alpha, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`
          attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uScale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform sampler2D uTex; uniform vec3 uColor; varying float vAlpha;
          void main() {
            float a = texture2D(uTex, gl_PointCoord).a * vAlpha;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor, a);
          }`}
      />
    </points>
  )
}

// Trigger handle layer (hero_trigger.webp) — cut from the photo at x 760–1431,
// y 356–920 (px of the 1431x3833 original), pivoting at (800, 400) where it meets
// the head. TRIGGER_SQUEEZE is how far it swings back toward the bottle (radians;
// negative = clockwise on screen, i.e. the tip moves toward the bottle).
const PX_W = BOTTLE_W / 1431
const PX_H = BOTTLE_H / 3833
const TRIGGER_W = 671 * PX_W
const TRIGGER_H = 564 * PX_H
const TRIGGER_PIVOT = [(800 - 1431 / 2) * PX_W, (3833 / 2 - 400) * PX_H, 0.004]
const TRIGGER_OFFSET = [(760 + 671 / 2 - 800) * PX_W, -(356 + 564 / 2 - 400) * PX_H, 0]
const TRIGGER_SQUEEZE = THREE.MathUtils.degToRad(-13)

function Bottle() {
  const group = useRef()
  const puff = useRef(null)
  const lastHover = useRef(-10)
  const nextAuto = useRef(1.6) // first puff shortly after load, then every ~5s
  const trigger = useRef()
  const squeezeAt = useRef(-10)  // clock time of the last squeeze
  const clockRef = useRef(useThree((st) => st.clock))
  // The bottle photo is split in two: the body (hero_bottle_body.webp = the
  // original photo with the trigger handle faded out past its joint) and the
  // handle on its own (hero_trigger.webp), so the handle can pivot when it sprays.
  // At rest the two line up pixel-for-pixel with the original hero_bottle.webp.
  const [texture, triggerTex] = useTexture(['/assets/hero_bottle_body.webp', '/assets/hero_trigger.webp'])
  ;[texture, triggerTex].forEach((tx) => {
    tx.colorSpace = THREE.SRGBColorSpace
    // The label is minified ~5.7x (758px of source body -> ~134px on screen), and at
    // that ratio plain trilinear mipmapping smears the lettering. Max anisotropy is
    // what keeps "La Shoe de Peugh" and "Shoe & Foot Deodorizing Spray" crisp.
    tx.anisotropy = 16
    tx.minFilter = THREE.LinearMipmapLinearFilter
    tx.magFilter = THREE.LinearFilter
    tx.needsUpdate = true
  })

  // One spray = trigger squeeze + mist (+ sound when the visitor caused it).
  const spray = (count, withSound, now) => {
    squeezeAt.current = now
    puff.current && puff.current(count)
    if (withSound) playPsst()
  }

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const { x: px, y: py } = state.pointer // -1..1, follows the mouse over the canvas

    // Automatic (silent) puff every ~5s.
    if (t > nextAuto.current && puff.current) {
      spray(380, false, t)
      nextAuto.current = t + 4.5 + Math.random() * 1.5
    }

    // Trigger squeeze, shaped like a real finger pull: ease in (~0.16s), keep
    // creeping in slightly while the mist comes out, then let go — the handle's
    // spring returns it with a soft, damped settle rather than a snap.
    if (trigger.current) {
      const s = t - squeezeAt.current
      let k = 0
      if (s >= 0 && s < 0.16) {
        const x = s / 0.16
        k = 0.94 * (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2) // ease in-out
      } else if (s >= 0.16 && s < 0.36) {
        k = 0.94 + 0.06 * Math.sin(((s - 0.16) / 0.2) * Math.PI / 2) // slow last bit of travel
      } else if (s >= 0.36 && s < 1.0) {
        const r = s - 0.36
        k = Math.exp(-9 * r) * Math.cos(11 * r) // damped spring back, tiny overshoot
      }
      trigger.current.rotation.z = TRIGGER_SQUEEZE * k
    }

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

  // Pointer touches the bottle → puff + "psst" (at most every 1.2s). The photo
  // plane is a rectangle, so ignore its empty right-hand side below the trigger.
  const onTouch = (e) => {
    const uv = e.uv
    if (uv && uv.x > 0.62 && uv.y < 0.75) return
    const now = performance.now() / 1000
    if (now - lastHover.current < 1.2) return
    lastHover.current = now
    spray(460, true, clockRef.current.elapsedTime)
  }

  return (
    <group ref={group} position={[BOTTLE_X, BOTTLE_Y, 0]}>
      <mesh onPointerOver={onTouch} onPointerDown={onTouch}>
        <planeGeometry args={[BOTTLE_W, BOTTLE_H]} />
        {/* Front-side only: the photo already carries its own lighting, so an unlit
            material keeps it looking like the real product instead of tinted CG. */}
        <meshBasicMaterial map={texture} transparent alphaTest={0.04} side={THREE.FrontSide} toneMapped={false} />
      </mesh>
      {/* The trigger handle, pivoting where it meets the sprayer head */}
      <group ref={trigger} position={TRIGGER_PIVOT}>
        <mesh position={TRIGGER_OFFSET}>
          <planeGeometry args={[TRIGGER_W, TRIGGER_H]} />
          <meshBasicMaterial map={triggerTex} transparent alphaTest={0.01} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <SprayMist puffRef={puff} />
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
