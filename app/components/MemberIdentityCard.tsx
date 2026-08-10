"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { MemberProfile } from "../lib/memberData";
import type { GdgMember } from "./MemberAuth";

type Props = { member: GdgMember; profile: MemberProfile };
const WIDTH = 5.8;
const HEIGHT = 3.82;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function badgeTexture(member: GdgMember, profile: MemberProfile) {
  const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 920;
  const ctx = canvas.getContext("2d")!; const name = profile.displayName || "GDG Member";
  rounded(ctx, 0, 0, 1400, 920, 52); ctx.fillStyle = "#16171c"; ctx.fill();
  const gradient = ctx.createLinearGradient(0, 0, 1400, 920); gradient.addColorStop(0, "#2a2d39"); gradient.addColorStop(1, "#111217"); rounded(ctx, 18, 18, 1364, 884, 39); ctx.fillStyle = gradient; ctx.fill();
  ctx.strokeStyle = "#ffffff2c"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#f6f4ef"; ctx.font = "800 26px Arial"; ctx.fillText("GDG ON CAMPUS / KU", 72, 86); ctx.fillStyle = "#ffffff90"; ctx.font = "700 16px Arial"; ctx.fillText("MEMBER ACCESS", 73, 116);
  ["#4285f4", "#34a853", "#ea4335", "#ffc72c"].forEach((color, index) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(1210 + index * 38, 88, 14, 0, Math.PI * 2); ctx.fill(); });
  ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(330, 420, 150, 0, Math.PI * 2); ctx.stroke(); const avatar = ctx.createRadialGradient(300, 386, 22, 330, 420, 205); avatar.addColorStop(0, "#4285f4"); avatar.addColorStop(.6, "#0051ba"); avatar.addColorStop(1, "#0b1129"); ctx.fillStyle = avatar; ctx.beginPath(); ctx.arc(330, 420, 140, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f6f4ef"; ctx.font = "900 170px Arial"; ctx.textAlign = "center"; ctx.fillText("G", 330, 480); ctx.textAlign = "left";
  ctx.fillStyle = "#f6f4ef"; ctx.font = "800 46px Arial"; ctx.fillText(name, 570, 342); ctx.fillStyle = "#ffffffa8"; ctx.font = "700 22px Arial"; ctx.fillText(member.email, 572, 385); ctx.fillStyle = "#ffffff2b"; ctx.fillRect(572, 432, 710, 2);
  ctx.fillStyle = "#ffffff90"; ctx.font = "800 18px Arial"; ctx.fillText("GRADUATION", 572, 490); ctx.fillText("LEETCODE", 572, 585); ctx.fillStyle = "#f6f4ef"; ctx.font = "800 26px Arial"; ctx.fillText(profile.graduationYear ? `CLASS OF ${profile.graduationYear}` : "NOT SET", 572, 527); ctx.fillText(profile.leetCodeUsername ? `@${profile.leetCodeUsername}` : "NOT CONNECTED", 572, 622);
  ctx.fillStyle = "#ffffffb8"; ctx.font = "700 18px Arial"; ctx.fillText("GOOGLE DEVELOPER GROUPS ON CAMPUS", 72, 815); ctx.fillStyle = "#34a853"; ctx.font = "900 18px Arial"; ctx.textAlign = "right"; ctx.fillText("VERIFIED MEMBER", 1322, 815); ctx.textAlign = "left";
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function MemberIdentityCard({ member, profile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const [open, setOpen] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(39, 1, .1, 100); camera.position.set(0, .2, 13);
    const light = new THREE.DirectionalLight(0xffffff, 2.45); light.position.set(-4, 6, 8); scene.add(light, new THREE.AmbientLight(0x9bbcff, 1.05));
    const anchor = new THREE.Vector3(0, 3.42, 0); const length = 3.35; const group = new THREE.Group(); scene.add(group);
    const texture = badgeTexture(member, profile); const badge = new THREE.Mesh(new RoundedBoxGeometry(WIDTH, HEIGHT, .16, 5, .15), new THREE.MeshStandardMaterial({ map: texture, roughness: .48, metalness: .08 })); group.add(badge);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.22, .05, 10, 26, Math.PI * 1.75), new THREE.MeshStandardMaterial({ color: 0xf6f4ef, metalness: .85, roughness: .12 })); hook.position.copy(anchor).add(new THREE.Vector3(0, .14, 0)); hook.rotation.z = Math.PI * .62; scene.add(hook); const cordGeometry = new THREE.BufferGeometry(); scene.add(new THREE.Line(cordGeometry, new THREE.LineBasicMaterial({ color: 0x0c1630 })));
    const clock = new THREE.Clock(); let theta = .12; let velocity = 0; let dragging = false; let lastTheta = theta; let lastTime = 0;
    const point = (event: PointerEvent) => { const r = canvas.getBoundingClientRect(); const p = new THREE.Vector3(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1, 0); p.unproject(camera); const ray = p.sub(camera.position).normalize(); return camera.position.clone().add(ray.multiplyScalar(-camera.position.z / ray.z)); };
    const down = (event: PointerEvent) => { dragging = true; lastTheta = theta; lastTime = performance.now(); canvas.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!dragging) return; const p = point(event); const next = THREE.MathUtils.clamp(Math.atan2(p.x - anchor.x, anchor.y - p.y), -.62, .62); const now = performance.now(); velocity = THREE.MathUtils.lerp(velocity, (next - lastTheta) / Math.max(.016, (now - lastTime) / 1000), .22); theta = next; lastTheta = next; lastTime = now; };
    const up = (event: PointerEvent) => { dragging = false; velocity = THREE.MathUtils.clamp(velocity, -2.3, 2.3); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    const resize = () => { const { width, height } = canvas.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }; const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .03); if (!dragging) { velocity += (-(8.8 / length) * Math.sin(theta) - .74 * velocity) * dt; theta += velocity * dt; } const attachment = new THREE.Vector3(anchor.x + length * Math.sin(theta), anchor.y - length * Math.cos(theta), 0); const tilt = -theta * .1; const offset = new THREE.Vector3(0, -HEIGHT / 2, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt); group.position.copy(attachment).add(offset); group.rotation.z = tilt; cordGeometry.setFromPoints(new THREE.QuadraticBezierCurve3(anchor, anchor.clone().lerp(attachment, .5).add(new THREE.Vector3(0, -.12, 0)), attachment).getPoints(18)); renderer.render(scene, camera); });
    return () => { canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); observer.disconnect(); renderer.setAnimationLoop(null); texture.dispose(); badge.geometry.dispose(); cordGeometry.dispose(); renderer.dispose(); };
  }, [member.email, profile.displayName, profile.graduationYear, profile.leetCodeUsername]);
  const name = profile.displayName || "GDG Member";
  return <><div className="member-pendulum-card"><canvas ref={canvasRef} className="member-pendulum-canvas" aria-label="Drag the hanging GDG KU member badge to swing it." /><div><span>DRAG TO SWING</span><button type="button" onClick={() => setOpen(true)}>Open ID ↗</button></div></div>{open && <div className="member-id-modal" role="dialog" aria-modal="true" aria-label="GDG KU member ID" onClick={() => setOpen(false)}><section onClick={(event) => event.stopPropagation()}><button className="member-id-close" onClick={() => setOpen(false)} aria-label="Close ID">×</button><p>GDG ON CAMPUS · KU</p><h2>{name}</h2><span>{profile.major || "GDG Member"}</span><div><article><b>Graduation</b><strong>{profile.graduationYear ? `Class of ${profile.graduationYear}` : "Not set"}</strong></article><article><b>LeetCode</b><strong>{profile.leetCodeUsername ? `@${profile.leetCodeUsername}` : "Not connected"}</strong></article></div><h3>Interests</h3><ul>{(profile.interests ? profile.interests.split(",") : ["Build", "Learn", "Connect"]).map((interest) => <li key={interest}>{interest.trim()}</li>)}</ul></section></div>}</>;
}
