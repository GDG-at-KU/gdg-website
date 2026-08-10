"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MemberProfile } from "../lib/memberData";
import type { GdgMember } from "./MemberAuth";

type Props = { member: GdgMember; profile: MemberProfile };

function cardTexture(member: GdgMember, profile: MemberProfile, back: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext("2d")!;
  const name = profile.displayName || "GDG Member";
  ctx.fillStyle = "#f6f4ef";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffc72c";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = "#101d36";
  ctx.font = "800 30px Arial";
  ctx.letterSpacing = "4px";
  ctx.fillText(back ? "GDG KU MEMBER PROFILE" : "GOOGLE DEVELOPER GROUPS", 72, 96);
  ctx.fillStyle = back ? "#101d36" : "#0051ba";
  ctx.font = "900 210px Arial";
  ctx.letterSpacing = "-22px";
  ctx.fillText(back ? name.slice(0, 1).toUpperCase() : "GDG", 70, 340);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#101d36";
  ctx.font = "400 68px Georgia";
  ctx.fillText(back ? name : "GDG on Campus · KU", 74, 446);
  ctx.font = "700 25px Arial";
  ctx.fillStyle = "#101d36";
  const detail = back ? [profile.major, profile.graduationYear && `Class of ${profile.graduationYear}`].filter(Boolean).join("  ·  ") || "Complete your builder profile" : member.email;
  ctx.fillText(detail, 76, 508);
  ctx.fillStyle = back ? "#34a853" : "#e51b3e";
  ctx.font = "900 25px Arial";
  ctx.letterSpacing = "3px";
  ctx.fillText(back ? (profile.leetCodeUsername ? `LEETCODE · @${profile.leetCodeUsername}` : "MEMBER PROFILE") : "VERIFIED MEMBER", 76, 665);
  ctx.fillStyle = "#0051ba";
  ctx.fillText(back ? "TAP TO FLIP" : "GDG KU · 2026", 900, 665);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function MemberIdentityCard({ member, profile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [back, setBack] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.2, 10);
    const light = new THREE.DirectionalLight(0xffffff, 2.6);
    light.position.set(-4, 6, 8);
    scene.add(light, new THREE.AmbientLight(0xffffff, 1.25));

    const anchor = new THREE.Vector3(0, 3.45, 0);
    const length = 3.6;
    const cardGroup = new THREE.Group();
    scene.add(cardGroup);
    const texture = cardTexture(member, profile, back);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(5.35, 3.38, 0.11), [
      new THREE.MeshStandardMaterial({ color: 0xffc72c }), new THREE.MeshStandardMaterial({ color: 0xffc72c }),
      new THREE.MeshStandardMaterial({ color: 0xffc72c }), new THREE.MeshStandardMaterial({ color: 0xffc72c }),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.68 }), new THREE.MeshStandardMaterial({ color: 0xf6f4ef }),
    ]);
    cardGroup.add(badge);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 10, 28), new THREE.MeshStandardMaterial({ color: 0xffc72c, metalness: 0.5 }));
    scene.add(ring);
    const cordGeometry = new THREE.BufferGeometry();
    const cord = new THREE.Line(cordGeometry, new THREE.LineBasicMaterial({ color: 0xf6f4ef }));
    scene.add(cord);

    let angle = 0.17;
    let angularVelocity = 0;
    let dragging = false;
    let moved = false;
    let lastPointerTime = 0;
    let lastAngle = angle;
    const pointAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const vector = new THREE.Vector3(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1, 0);
      vector.unproject(camera);
      const direction = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / direction.z;
      return camera.position.clone().add(direction.multiplyScalar(distance));
    };
    const down = (event: PointerEvent) => { dragging = true; moved = false; lastPointerTime = performance.now(); canvas.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => {
      if (!dragging) return;
      const point = pointAt(event);
      const next = Math.max(-1.06, Math.min(1.06, Math.atan2(point.x - anchor.x, anchor.y - point.y)));
      const now = performance.now();
      angularVelocity = (next - lastAngle) / Math.max(0.016, (now - lastPointerTime) / 1000);
      moved ||= Math.abs(next - angle) > 0.025;
      angle = next;
      lastAngle = next;
      lastPointerTime = now;
    };
    const up = (event: PointerEvent) => { if (!moved) setBack((value) => !value); dragging = false; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const tick = () => {
      if (!dragging) {
        angularVelocity += (-9.8 / length) * Math.sin(angle) * 0.016;
        angularVelocity *= 0.992;
        angle += angularVelocity * 0.016;
      }
      const position = new THREE.Vector3(anchor.x + length * Math.sin(angle), anchor.y - length * Math.cos(angle), 0);
      cardGroup.position.set(position.x, position.y - 1.18, 0);
      cardGroup.rotation.z = -angle * 0.42;
      ring.position.copy(anchor);
      const attachment = cardGroup.localToWorld(new THREE.Vector3(0, 1.74, 0));
      const curve = new THREE.QuadraticBezierCurve3(anchor, anchor.clone().lerp(attachment, 0.5).add(new THREE.Vector3(0, -0.24 - Math.abs(angularVelocity) * 0.06, 0)), attachment);
      cordGeometry.setFromPoints(curve.getPoints(18));
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(tick);
    return () => {
      canvas.removeEventListener("pointerdown", down); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerup", up); canvas.removeEventListener("pointercancel", up);
      observer.disconnect(); renderer.setAnimationLoop(null); texture.dispose(); badge.geometry.dispose(); cordGeometry.dispose(); renderer.dispose();
    };
  }, [back, member, profile]);

  return <div className="member-pendulum-card"><canvas ref={canvasRef} className="member-pendulum-canvas" aria-label="Interactive GDG KU membership card. Drag it like a hanging badge or tap to flip." /><p>DRAG THE BADGE · TAP TO FLIP</p></div>;
}
