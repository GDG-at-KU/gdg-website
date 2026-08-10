"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { MemberProfile } from "../lib/memberData";
import type { GdgMember } from "./MemberAuth";

type Props = { member: GdgMember; profile: MemberProfile };
const CARD_WIDTH = 5.8;
const CARD_HEIGHT = 3.82;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath(); ctx.moveTo(x + radius, y); ctx.arcTo(x + width, y, x + width, y + height, radius); ctx.arcTo(x + width, y + height, x, y + height, radius); ctx.arcTo(x, y + height, x, y, radius); ctx.arcTo(x, y, x + width, y, radius); ctx.closePath();
}

function textureFor(member: GdgMember, profile: MemberProfile, profileSide: boolean) {
  const canvas = document.createElement("canvas"); canvas.width = 1400; canvas.height = 920;
  const ctx = canvas.getContext("2d")!; const name = profile.displayName || "GDG Member";
  rounded(ctx, 0, 0, 1400, 920, 56); ctx.fillStyle = "#16171c"; ctx.fill();
  const shade = ctx.createLinearGradient(0, 0, 1400, 920); shade.addColorStop(0, "#252733"); shade.addColorStop(1, "#101116"); rounded(ctx, 18, 18, 1364, 884, 42); ctx.fillStyle = shade; ctx.fill();
  ctx.strokeStyle = "#ffffff2c"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#f5f4ef"; ctx.font = "800 26px Arial"; ctx.fillText(profileSide ? "GDG KU / MEMBER ACCESS" : "GDG ON CAMPUS / KU", 72, 84);
  ctx.fillStyle = "#ffffff90"; ctx.font = "700 16px Arial"; ctx.fillText(profileSide ? "PROFILE CLEARANCE" : "BUILDER CLEARANCE", 73, 115);
  ctx.fillStyle = "#4285f4"; ctx.beginPath(); ctx.arc(1240, 90, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#34a853"; ctx.beginPath(); ctx.arc(1282, 90, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ea4335"; ctx.beginPath(); ctx.arc(1324, 90, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(366, 425, 166, 0, Math.PI * 2); ctx.stroke();
  const avatar = ctx.createRadialGradient(330, 380, 20, 370, 425, 210); avatar.addColorStop(0, "#4285f4"); avatar.addColorStop(.58, "#0051ba"); avatar.addColorStop(1, "#0c1430"); ctx.fillStyle = avatar; ctx.beginPath(); ctx.arc(366, 425, 156, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f6f4ef"; ctx.font = "900 180px Arial"; ctx.textAlign = "center"; ctx.fillText(profileSide ? name.slice(0, 1).toUpperCase() : "G", 366, 486); ctx.textAlign = "left";
  ctx.fillStyle = "#ffc72c"; ctx.beginPath(); ctx.arc(250, 283, 17, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#ea4335"; ctx.beginPath(); ctx.arc(475, 515, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f6f4ef"; ctx.font = "800 46px Arial"; ctx.fillText(name, 600, 347);
  ctx.fillStyle = "#ffffffa8"; ctx.font = "700 22px Arial"; ctx.fillText(profileSide ? (profile.major || "Add your major below") : member.email, 602, 389);
  ctx.fillStyle = "#ffffff2b"; ctx.fillRect(602, 430, 680, 2);
  ctx.fillStyle = "#f6f4ef"; ctx.font = "800 20px Arial"; ctx.fillText(profileSide ? "GRADUATION" : "MEMBER STATUS", 602, 488); ctx.fillText(profileSide ? "LEETCODE" : "CHAPTER", 602, 585);
  ctx.fillStyle = "#ffffffa8"; ctx.font = "700 25px Arial"; ctx.fillText(profileSide ? (profile.graduationYear ? `CLASS OF ${profile.graduationYear}` : "NOT SET") : "VERIFIED MEMBER", 602, 525); ctx.fillText(profileSide ? (profile.leetCodeUsername ? `@${profile.leetCodeUsername}` : "NOT CONNECTED") : "UNIVERSITY OF KANSAS", 602, 622);
  ctx.strokeStyle = "#ffffff55"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(602, 552); ctx.lineTo(1282, 552); ctx.stroke();
  ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = 5; for (let i = 0; i < 5; i += 1) { const x = 93 + i * 39; ctx.beginPath(); ctx.moveTo(x, 708); ctx.lineTo(x + 25, 733); ctx.lineTo(x + 50, 708); ctx.stroke(); }
  ctx.fillStyle = "#ffffffcc"; ctx.font = "700 18px Arial"; ctx.fillText(profileSide ? (profile.interests || "BUILD · LEARN · CONNECT") : "GOOGLE DEVELOPER GROUPS ON CAMPUS", 73, 818);
  ctx.fillStyle = "#ffc72c"; ctx.font = "900 18px Arial"; ctx.textAlign = "right"; ctx.fillText(profileSide ? "PROFILE VIEW" : "ACCESS PASS", 1324, 818); ctx.textAlign = "left";
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function MemberIdentityCard({ member, profile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const [profileSide, setProfileSide] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100); camera.position.set(0, .35, 10.5);
    const light = new THREE.DirectionalLight(0xffffff, 2.4); light.position.set(-4, 6, 8); scene.add(light, new THREE.AmbientLight(0x9bbcff, 1.15));
    const anchor = new THREE.Vector3(0, 3.52, 0); const length = 3.42; const group = new THREE.Group(); scene.add(group);
    const texture = textureFor(member, profile, profileSide);
    const badge = new THREE.Mesh(new RoundedBoxGeometry(CARD_WIDTH, CARD_HEIGHT, .16, 5, .15), new THREE.MeshStandardMaterial({ map: texture, roughness: .46, metalness: .08 })); group.add(badge);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.23, .052, 10, 26, Math.PI * 1.75), new THREE.MeshStandardMaterial({ color: 0xf6f4ef, metalness: .85, roughness: .15 })); hook.rotation.z = Math.PI * .62; hook.position.copy(anchor).add(new THREE.Vector3(0, .14, 0)); scene.add(hook);
    const cordGeometry = new THREE.BufferGeometry(); const cord = new THREE.Line(cordGeometry, new THREE.LineBasicMaterial({ color: 0x0c1630 })); scene.add(cord);
    const clock = new THREE.Clock(); let theta = .14; let velocity = 0; let dragging = false; let lastTheta = theta; let lastTime = 0;
    const worldPoint = (event: PointerEvent) => { const r = canvas.getBoundingClientRect(); const p = new THREE.Vector3(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1, 0); p.unproject(camera); const ray = p.sub(camera.position).normalize(); return camera.position.clone().add(ray.multiplyScalar(-camera.position.z / ray.z)); };
    const down = (event: PointerEvent) => { dragging = true; lastTheta = theta; lastTime = performance.now(); canvas.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!dragging) return; const point = worldPoint(event); const next = THREE.MathUtils.clamp(Math.atan2(point.x - anchor.x, anchor.y - point.y), -1.05, 1.05); const now = performance.now(); velocity = THREE.MathUtils.lerp(velocity, (next - lastTheta) / Math.max(.016, (now - lastTime) / 1000), .24); theta = next; lastTheta = next; lastTime = now; };
    const up = (event: PointerEvent) => { dragging = false; velocity = THREE.MathUtils.clamp(velocity, -2.7, 2.7); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    const resize = () => { const { width, height } = canvas.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }; const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .03); if (!dragging) { velocity += (-(8.8 / length) * Math.sin(theta) - .64 * velocity) * dt; theta += velocity * dt; } const attachment = new THREE.Vector3(anchor.x + length * Math.sin(theta), anchor.y - length * Math.cos(theta), 0); const tilt = -theta * .12; const offset = new THREE.Vector3(0, -CARD_HEIGHT / 2, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt); group.position.copy(attachment).add(offset); group.rotation.z = tilt; const curve = new THREE.QuadraticBezierCurve3(anchor, anchor.clone().lerp(attachment, .5).add(new THREE.Vector3(0, -.12, 0)), attachment); cordGeometry.setFromPoints(curve.getPoints(18)); renderer.render(scene, camera); });
    return () => { canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up); observer.disconnect(); renderer.setAnimationLoop(null); texture.dispose(); badge.geometry.dispose(); cordGeometry.dispose(); renderer.dispose(); };
  }, [member, profile, profileSide]);
  return <div className="member-pendulum-card"><canvas ref={canvasRef} className="member-pendulum-canvas" aria-label="Drag the hanging GDG KU member badge to swing it." /><div><span>DRAG TO SWING</span><button type="button" onClick={() => setProfileSide((value) => !value)}>{profileSide ? "Member pass" : "Profile details"} ↗</button></div></div>;
}
