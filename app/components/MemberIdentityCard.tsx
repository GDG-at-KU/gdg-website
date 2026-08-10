"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MemberProfile } from "../lib/memberData";
import type { GdgMember } from "./MemberAuth";

type Props = { member: GdgMember; profile: MemberProfile };

function drawBarcode(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const bars = [5, 2, 6, 3, 2, 7, 4, 3, 6, 2, 5, 3, 7, 2, 4, 6];
  ctx.fillStyle = "#101d36";
  let cursor = x;
  bars.forEach((bar, index) => { ctx.fillRect(cursor, y, bar, index % 3 === 0 ? 44 : 34); cursor += bar + 4; });
}

function createBadgeTexture(member: GdgMember, profile: MemberProfile, profileSide: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400; canvas.height = 880;
  const ctx = canvas.getContext("2d")!;
  const name = profile.displayName || "GDG Member";
  const major = profile.major || "Builder profile";
  ctx.fillStyle = "#f6f4ef"; ctx.fillRect(0, 0, 1400, 880);
  ctx.fillStyle = "#0051ba"; ctx.fillRect(0, 0, 46, 880);
  ctx.fillStyle = "#ffc72c"; ctx.fillRect(46, 0, 16, 880);
  ctx.fillStyle = "#e51b3e"; ctx.beginPath(); ctx.arc(1260, 118, 56, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#34a853"; ctx.beginPath(); ctx.arc(1180, 160, 38, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#101d3622"; ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) { ctx.beginPath(); ctx.moveTo(80, 230 + i * 84); ctx.lineTo(1320, 230 + i * 84); ctx.stroke(); }
  ctx.fillStyle = "#101d36"; ctx.font = "800 29px Arial"; ctx.fillText(profileSide ? "GDG KU · MEMBER PROFILE" : "GOOGLE DEVELOPER GROUPS · KU", 104, 94);
  ctx.fillStyle = profileSide ? "#34a853" : "#0051ba"; ctx.fillRect(104, 121, 236, 44);
  ctx.fillStyle = "#fff"; ctx.font = "800 20px Arial"; ctx.fillText(profileSide ? "PROFILE SIDE" : "ACTIVE MEMBER", 126, 151);
  ctx.fillStyle = "#0051ba"; ctx.font = "900 170px Arial"; ctx.fillText(profileSide ? name.slice(0, 1).toUpperCase() : "GDG", 102, 365);
  ctx.fillStyle = "#101d36"; ctx.font = "400 69px Georgia"; ctx.fillText(profileSide ? name : "On Campus", 108, 482);
  ctx.font = "700 25px Arial"; ctx.fillStyle = "#5a6273"; ctx.fillText(profileSide ? major : member.email, 111, 531);
  if (profileSide) {
    ctx.fillStyle = "#101d36"; ctx.font = "800 21px Arial";
    ctx.fillText(profile.graduationYear ? `CLASS OF ${profile.graduationYear}` : "GDG KU COMMUNITY", 112, 625);
    ctx.fillText(profile.leetCodeUsername ? `LEETCODE  @${profile.leetCodeUsername}` : "LEETCODE  ADD YOUR HANDLE", 112, 676);
    ctx.fillStyle = "#0051ba"; ctx.fillText(profile.interests || "TECH · COMMUNITY · BUILD", 112, 727);
  } else {
    ctx.fillStyle = "#101d36"; ctx.font = "800 21px Arial"; ctx.fillText("UNIVERSITY OF KANSAS", 111, 626);
    ctx.fillStyle = "#e51b3e"; ctx.fillText("VERIFIED · MEMBER PASS", 111, 678);
    drawBarcode(ctx, 105, 728);
  }
  ctx.strokeStyle = "#ffc72c"; ctx.lineWidth = 9; ctx.strokeRect(5, 5, 1390, 870);
  ctx.fillStyle = "#101d36"; ctx.font = "800 20px Arial"; ctx.fillText("GDG KU / 2026", 1080, 814);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function MemberIdentityCard({ member, profile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [profileSide, setProfileSide] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100); camera.position.set(0, 0.35, 10.5);
    const directional = new THREE.DirectionalLight(0xffffff, 2.8); directional.position.set(-4, 7, 8); scene.add(directional, new THREE.AmbientLight(0xffffff, 1.2));
    const anchor = new THREE.Vector3(0, 3.62, 0); const length = 3.95;
    const card = new THREE.Group(); scene.add(card);
    const texture = createBadgeTexture(member, profile, profileSide);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(6.25, 3.92, 0.12), [
      new THREE.MeshStandardMaterial({ color: 0xffc72c }), new THREE.MeshStandardMaterial({ color: 0xffc72c }), new THREE.MeshStandardMaterial({ color: 0xffc72c }), new THREE.MeshStandardMaterial({ color: 0xffc72c }), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.66 }), new THREE.MeshStandardMaterial({ color: 0xf6f4ef }),
    ]); card.add(badge);
    const anchorRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.052, 10, 30), new THREE.MeshStandardMaterial({ color: 0xffc72c, metalness: 0.5, roughness: 0.2 })); anchorRing.position.copy(anchor); scene.add(anchorRing);
    const cordGeometry = new THREE.BufferGeometry(); const cord = new THREE.Line(cordGeometry, new THREE.LineBasicMaterial({ color: 0xf6f4ef })); scene.add(cord);
    const clock = new THREE.Clock(); let theta = 0.15; let velocity = 0; let dragging = false; let lastTheta = theta; let lastTime = 0;
    const getWorldPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect(); const point = new THREE.Vector3(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1, 0);
      point.unproject(camera); const direction = point.sub(camera.position).normalize(); return camera.position.clone().add(direction.multiplyScalar(-camera.position.z / direction.z));
    };
    const down = (event: PointerEvent) => { dragging = true; lastTime = performance.now(); canvas.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const world = getWorldPoint(event); const next = THREE.MathUtils.clamp(Math.atan2(world.x - anchor.x, anchor.y - world.y), -1.08, 1.08); const now = performance.now();
      const instantaneous = (next - lastTheta) / Math.max((now - lastTime) / 1000, 0.016); velocity = THREE.MathUtils.lerp(velocity, instantaneous, 0.34); theta = next; lastTheta = next; lastTime = now;
    };
    const up = (event: PointerEvent) => { dragging = false; velocity = THREE.MathUtils.clamp(velocity, -4.2, 4.2); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    const resize = () => { const { width, height } = canvas.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.033);
      if (!dragging) { velocity += (-(9.81 / length) * Math.sin(theta) - 0.42 * velocity) * dt; theta += velocity * dt; }
      const pendulum = new THREE.Vector3(anchor.x + length * Math.sin(theta), anchor.y - length * Math.cos(theta), 0);
      card.position.set(pendulum.x, pendulum.y - 1.34, 0); card.rotation.z = -theta * 0.34;
      const attachment = card.localToWorld(new THREE.Vector3(0, 2.0, 0)); const sag = 0.18 + Math.min(Math.abs(velocity) * 0.055, 0.22);
      const curve = new THREE.QuadraticBezierCurve3(anchor, anchor.clone().lerp(attachment, 0.5).add(new THREE.Vector3(0, -sag, 0)), attachment); cordGeometry.setFromPoints(curve.getPoints(22));
      renderer.render(scene, camera);
    });
    return () => { canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); observer.disconnect(); renderer.setAnimationLoop(null); texture.dispose(); badge.geometry.dispose(); cordGeometry.dispose(); renderer.dispose(); };
  }, [member, profile, profileSide]);

  return <div className="member-pendulum-card"><canvas ref={canvasRef} className="member-pendulum-canvas" aria-label="Drag this hanging GDG KU member badge to swing it." /><div><span>DRAG TO SWING</span><button type="button" onClick={() => setProfileSide((value) => !value)}>{profileSide ? "View member pass" : "View profile"} ↗</button></div></div>;
}
