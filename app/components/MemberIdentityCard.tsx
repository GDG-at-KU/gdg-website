// @ts-nocheck
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei";
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import type { MemberProfile } from "../lib/memberData";
import type { GdgMember } from "./MemberAuth";

extend({ MeshLineGeometry, MeshLineMaterial });

const CARD_GLB = "/assets/lanyard/card.glb";
const BLANK_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const FRONT_UV_RECT = { x: 0, y: 0, w: 0.5, h: 0.755 };
const BACK_UV_RECT = { x: 0.5, y: 0, w: 0.5, h: 0.757 };

type Props = { member: GdgMember; profile: MemberProfile };

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number) {
  let size = startSize;
  while (size > 34) {
    ctx.font = `700 ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function cardFace(member: GdgMember, profile: MemberProfile, side: "front" | "back", jayhawk: HTMLImageElement | null = null) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d")!;
  const name = profile.displayName || "GDG Member";
  const dots = ["#4285f4", "#ea4335", "#fbbc04", "#34a853"];

  ctx.fillStyle = "#f7f4ed";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0e1f45";
  ctx.fillRect(0, 0, canvas.width, 64);
  ctx.fillStyle = "#0051ba";
  ctx.fillRect(0, 64, 18, canvas.height - 64);
  ctx.fillStyle = "#f6c343";
  ctx.fillRect(18, 64, 8, canvas.height - 64);

  if (side === "front") {
    ctx.fillStyle = "#0e1f45";
    ctx.font = "800 28px Arial";
    ctx.letterSpacing = "4px";
    ctx.fillText("GDG ON CAMPUS · KU", 92, 128);
    ctx.letterSpacing = "0px";
    dots.forEach((color, index) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(820 + index * 48, 112, 19, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#e8f0fe"; ctx.fillRect(92, 220, 896, 375);
    if (jayhawk) { ctx.save(); ctx.globalCompositeOperation = "multiply"; ctx.drawImage(jayhawk, 300, 196, 480, 288); ctx.restore(); }
    ctx.fillStyle = "#0e1f45"; ctx.font = "800 22px Arial"; ctx.textAlign = "center"; ctx.fillText("UNIVERSITY OF KANSAS · LAWRENCE", 540, 525); ctx.font = "700 17px Arial"; ctx.fillStyle = "#53617a"; ctx.fillText("GOOGLE DEVELOPER GROUPS ON CAMPUS", 540, 558); ctx.textAlign = "left";
    ctx.fillStyle = "#0e1f45"; ctx.font = `400 ${fitText(ctx, name, 850, 86)}px Georgia`; ctx.fillText(name, 96, 830);
    ctx.fillStyle = "#34405d"; ctx.font = "700 28px Arial"; ctx.fillText(profile.major || "GDG KU member", 98, 885);
    ctx.strokeStyle = "#0e1f452b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(96, 952); ctx.lineTo(986, 952); ctx.stroke();
    ctx.fillStyle = "#0e1f45"; ctx.font = "800 23px Arial"; ctx.letterSpacing = "3px"; ctx.fillText("MEMBER ID", 96, 1017); ctx.fillText("GRADUATION", 590, 1017); ctx.letterSpacing = "0px";
    ctx.font = "700 34px Arial"; ctx.fillText(member.uid.slice(0, 8).toUpperCase(), 96, 1071); ctx.fillText(profile.graduationYear ? `CLASS OF ${profile.graduationYear}` : "TO BE SET", 590, 1071);
    ctx.fillStyle = "#34a853"; ctx.font = "800 24px Arial"; ctx.letterSpacing = "2px"; ctx.fillText("● VERIFIED MEMBER", 96, 1280); ctx.letterSpacing = "0px";
    ctx.fillStyle = "#0e1f45"; ctx.font = "700 22px Arial"; ctx.textAlign = "right"; ctx.fillText("BUILD · LEARN · CONNECT", 982, 1280); ctx.textAlign = "left";
  } else {
    ctx.fillStyle = "#0e1f45"; ctx.font = "800 28px Arial"; ctx.letterSpacing = "4px"; ctx.fillText("MEMBER NOTES", 92, 128); ctx.letterSpacing = "0px";
    ctx.fillStyle = "#0051ba"; ctx.font = "400 78px Georgia"; ctx.fillText("What I’m", 92, 278); ctx.font = "italic 78px Georgia"; ctx.fillText("building.", 92, 355);
    ctx.fillStyle = "#0e1f45"; ctx.font = "800 23px Arial"; ctx.letterSpacing = "3px"; ctx.fillText("LEETCODE", 92, 486); ctx.letterSpacing = "0px";
    ctx.font = "700 46px Arial"; ctx.fillText(profile.leetCodeUsername ? `@${profile.leetCodeUsername}` : "Not connected", 92, 550);
    ctx.fillStyle = "#0e1f45"; ctx.font = "800 23px Arial"; ctx.letterSpacing = "3px"; ctx.fillText("INTERESTS", 92, 680); ctx.letterSpacing = "0px";
    const interests = profile.interests.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 5);
    const values = interests.length ? interests : ["Build", "Learn", "Connect"];
    let x = 92, y = 750;
    ctx.font = "700 29px Arial";
    values.forEach((item, index) => {
      const w = Math.min(760, ctx.measureText(item).width + 56);
      if (x + w > 970) { x = 92; y += 84; }
      ctx.fillStyle = ["#e8f0fe", "#fce8e6", "#e6f4ea", "#fff3cd"][index % 4]; ctx.fillRect(x, y - 40, w, 58);
      ctx.fillStyle = "#0e1f45"; ctx.fillText(item, x + 24, y); x += w + 18;
    });
    ctx.fillStyle = "#0e1f45"; ctx.font = "700 25px Arial"; ctx.fillText("GOOGLE DEVELOPER GROUPS ON CAMPUS", 92, 1264);
    ctx.fillStyle = "#ea4335"; ctx.font = "800 28px Arial"; ctx.textAlign = "right"; ctx.fillText("UNIVERSITY OF KANSAS", 982, 1264); ctx.textAlign = "left";
  }
  return canvas.toDataURL("image/png");
}

function Lanyard({ frontImage, backImage }: { frontImage: string; backImage: string }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { const update = () => setIsMobile(window.innerWidth < 720); update(); window.addEventListener("resize", update); return () => window.removeEventListener("resize", update); }, []);
  return <div className="member-lanyard-stage"><Canvas camera={{ position: [0, 0, isMobile ? 21 : 19], fov: isMobile ? 25 : 20 }} dpr={[1, isMobile ? 1.25 : 1.75]} gl={{ alpha: true }} onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}>
    <ambientLight intensity={Math.PI} />
    <Physics gravity={[0, -40, 0]} timeStep={isMobile ? 1 / 30 : 1 / 60}><Band isMobile={isMobile} frontImage={frontImage} backImage={backImage} /></Physics>
    <Environment blur={0.8}><Lightformer intensity={3} color="#ffffff" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, .1, 1]} /><Lightformer intensity={4} color="#dce8ff" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} /></Environment>
  </Canvas></div>;
}

function Band({ isMobile, frontImage, backImage }: { isMobile: boolean; frontImage: string; backImage: string }) {
  const leftBand = useRef(), rightBand = useRef(), leftStitch = useRef(), rightStitch = useRef(), fixed = useRef(), j1 = useRef(), j2 = useRef(), j3 = useRef(), card = useRef();
  const vec = new THREE.Vector3(), ang = new THREE.Vector3(), rot = new THREE.Vector3(), dir = new THREE.Vector3();
  const { nodes, materials } = useGLTF(CARD_GLB);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 320;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#0a1328"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#172a50"; context.fillRect(8, 0, 80, canvas.height);
    context.fillStyle = "#f6c343"; context.fillRect(12, 0, 4, canvas.height); context.fillRect(80, 0, 4, canvas.height);
    context.strokeStyle = "#ffffff33"; context.lineWidth = 2;
    for (let y = 20; y < canvas.height; y += 54) { context.beginPath(); context.moveTo(26, y); context.lineTo(70, y + 20); context.stroke(); }
    const strap = new THREE.CanvasTexture(canvas); strap.colorSpace = THREE.SRGBColorSpace; strap.wrapS = strap.wrapT = THREE.RepeatWrapping; strap.repeat.set(1, 4); return strap;
  }, []);
  const frontTex = useTexture(frontImage || BLANK_PIXEL), backTex = useTexture(backImage || BLANK_PIXEL);
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map; if (!baseMap?.image) return baseMap;
    const W = baseMap.image.width, H = baseMap.image.height, canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"); if (!ctx) return baseMap; ctx.drawImage(baseMap.image, 0, 0, W, H);
    const draw = (image: HTMLImageElement, rect: typeof FRONT_UV_RECT) => { const x = rect.x * W, y = rect.y * H, w = rect.w * W, h = rect.h * H, scale = Math.max(w / image.width, h / image.height), dw = image.width * scale, dh = image.height * scale; ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore(); };
    if (frontTex.image) draw(frontTex.image, FRONT_UV_RECT); if (backTex.image) draw(backTex.image, BACK_UV_RECT);
    const composite = new THREE.CanvasTexture(canvas); composite.colorSpace = THREE.SRGBColorSpace; composite.flipY = baseMap.flipY; composite.anisotropy = 16; composite.needsUpdate = true; return composite;
  }, [frontTex, backTex, materials.base.map]);
  const [leftCurve] = useState(() => { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]); curve.curveType = "chordal"; return curve; });
  const [rightCurve] = useState(() => { const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]); curve.curveType = "chordal"; return curve; });
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]); useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]); useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]); useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5, 0]]);
  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, .5).unproject(state.camera); dir.copy(vec).sub(state.camera.position).normalize(); vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3].forEach((ref) => ref.current?.wakeUp());
      const position = card.current?.translation();
      if (position) card.current?.setLinvel({ x: (vec.x - dragged.x - position.x) * 14, y: (vec.y - dragged.y - position.y) * 14, z: (vec.z - dragged.z - position.z) * 14 }, true);
    }
    if (!fixed.current || !j1.current || !j2.current || !j3.current || !card.current) return;
    const cardPosition = card.current.translation();
    leftCurve.points[0].set(-2.25, 4.29, -.36); leftCurve.points[1].set(-1.85, 2.55, -.3); leftCurve.points[2].set(cardPosition.x - .9, cardPosition.y + 1.45, cardPosition.z - .16); leftCurve.points[3].set(cardPosition.x - .63, cardPosition.y + 1.16, cardPosition.z - .12);
    rightCurve.points[0].set(2.25, 4.29, -.36); rightCurve.points[1].set(1.85, 2.55, -.3); rightCurve.points[2].set(cardPosition.x + .9, cardPosition.y + 1.45, cardPosition.z - .16); rightCurve.points[3].set(cardPosition.x + .63, cardPosition.y + 1.16, cardPosition.z - .12);
    const leftPoints = leftCurve.getPoints(isMobile ? 16 : 32), rightPoints = rightCurve.getPoints(isMobile ? 16 : 32);
    leftBand.current?.geometry.setPoints(leftPoints); rightBand.current?.geometry.setPoints(rightPoints); leftStitch.current?.geometry.setPoints(leftPoints); rightStitch.current?.geometry.setPoints(rightPoints); ang.copy(card.current.angvel()); rot.copy(card.current.rotation()); card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * .25, z: ang.z });
  });
  const props = { type: "dynamic", canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
  return <>
    <group position={[0, 4.15, 0]}>
      <RigidBody ref={fixed} {...props} type="fixed" />
      <group position={[-2.25, .14, -.28]}>
        <mesh><boxGeometry args={[.48, .3, .1]} /><meshStandardMaterial color="#09142b" metalness={.38} roughness={.4} /></mesh>
        <mesh position={[0, .1, .06]}><boxGeometry args={[.28, .03, .018]} /><meshBasicMaterial color="#f6c343" /></mesh>
        <mesh position={[0, -.28, .035]}><torusGeometry args={[.11, .028, 10, 24]} /><meshStandardMaterial color="#111827" metalness={.8} roughness={.22} /></mesh>
      </group>
      <group position={[2.25, .14, -.28]}>
        <mesh><boxGeometry args={[.48, .3, .1]} /><meshStandardMaterial color="#09142b" metalness={.38} roughness={.4} /></mesh>
        <mesh position={[0, .1, .06]}><boxGeometry args={[.28, .03, .018]} /><meshBasicMaterial color="#f6c343" /></mesh>
        <mesh position={[0, -.28, .035]}><torusGeometry args={[.11, .028, 10, 24]} /><meshStandardMaterial color="#111827" metalness={.8} roughness={.22} /></mesh>
      </group>
      <RigidBody position={[0, -.85, 0]} ref={j1} {...props}><BallCollider args={[.1]} /></RigidBody>
      <RigidBody position={[0, -1.7, 0]} ref={j2} {...props}><BallCollider args={[.1]} /></RigidBody>
      <RigidBody position={[0, -2.55, 0]} ref={j3} {...props}><BallCollider args={[.1]} /></RigidBody>
      <RigidBody position={[0, -3.42, 0]} ref={card} {...props}>
        <CuboidCollider args={[.8, 1.125, .01]} />
        <group scale={isMobile ? 2.85 : 3.25} position={[0, -1.2, .2]} onPointerDown={(event) => { event.stopPropagation(); event.target.setPointerCapture(event.pointerId); drag(new THREE.Vector3().copy(event.point).sub(vec.copy(card.current.translation()))); }} onPointerUp={(event) => { event.target.releasePointerCapture(event.pointerId); drag(false); }}>
          <mesh geometry={nodes.card.geometry}><meshPhysicalMaterial map={cardMap} map-anisotropy={16} clearcoat={isMobile ? 0 : 1} clearcoatRoughness={.15} roughness={.82} metalness={.28} /></mesh>
          <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={.3} visible={false} />
          <mesh geometry={nodes.clamp.geometry} material={materials.metal} visible={false} />
        </group>
      </RigidBody>
    </group>
    <mesh ref={leftBand}>
      <meshLineGeometry />
      <meshLineMaterial map={texture} useMap={1} color="#ffffff" depthTest resolution={[1000, 1000]} lineWidth={.42} transparent opacity={1} />
    </mesh>
    <mesh ref={rightBand}>
      <meshLineGeometry />
      <meshLineMaterial map={texture} useMap={1} color="#ffffff" depthTest resolution={[1000, 1000]} lineWidth={.42} transparent opacity={1} />
    </mesh>
    <mesh ref={leftStitch}>
      <meshLineGeometry />
      <meshLineMaterial color="#f6c343" depthTest resolution={[1000, 1000]} lineWidth={.045} dashArray={.16} dashRatio={.55} useDash={1} transparent opacity={.95} />
    </mesh>
    <mesh ref={rightStitch}>
      <meshLineGeometry />
      <meshLineMaterial color="#f6c343" depthTest resolution={[1000, 1000]} lineWidth={.045} dashArray={.16} dashRatio={.55} useDash={1} transparent opacity={.95} />
    </mesh>
  </>;
}

export function MemberIdentityCard({ member, profile }: Props) {
  const [jayhawk, setJayhawk] = useState<HTMLImageElement | null>(null);
  useEffect(() => { const logo = new Image(); logo.onload = () => setJayhawk(logo); logo.src = "/assets/ku-jayhawk.png"; }, []);
  const frontImage = useMemo(() => cardFace(member, profile, "front", jayhawk), [member, profile, jayhawk]);
  const backImage = useMemo(() => cardFace(member, profile, "back"), [member, profile]);
  const [open, setOpen] = useState(false);
  const name = profile.displayName || "GDG Member";
  const interests = profile.interests.split(",").map((interest) => interest.trim()).filter(Boolean).slice(0, 4);
  const viewer = <div className="member-pass-modal" role="dialog" aria-modal="true" aria-label="Full GDG KU member pass" onClick={() => setOpen(false)}><section onClick={(event) => event.stopPropagation()}><button onClick={() => setOpen(false)} aria-label="Close full member pass">×</button><div className="member-pass-full"><p>GDG ON CAMPUS · KU</p><img className="member-pass-jayhawk" src="/assets/ku-jayhawk.png" alt="University of Kansas Jayhawk" /><i>GOOGLE DEVELOPER GROUPS ON CAMPUS</i><h2>{name}</h2><span>{profile.major || "GDG KU member"}</span><hr /><dl><div><dt>Graduation</dt><dd>{profile.graduationYear ? `Class of ${profile.graduationYear}` : "To be set"}</dd></div><div><dt>LeetCode</dt><dd>{profile.leetCodeUsername ? `@${profile.leetCodeUsername}` : "Not connected"}</dd></div></dl><div className="member-pass-interests"><b>Interests</b><div>{(interests.length ? interests : ["Build", "Learn", "Connect"]).map((interest) => <span key={interest}>{interest}</span>)}</div></div><footer><b>● VERIFIED MEMBER</b><em>BUILD · LEARN · CONNECT</em></footer></div></section></div>;
  return <><div className="member-lanyard"><Lanyard frontImage={frontImage} backImage={backImage} /><div className="member-lanyard-actions"><span>DRAG THE PASS TO EXPLORE</span><button type="button" onClick={() => setOpen(true)}>View full pass ↗</button></div></div>{open && createPortal(viewer, document.body)}</>;
}
