"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { MemberProfile } from "../lib/memberData";
import type { GdgMember } from "./MemberAuth";

type Props = { member: GdgMember; profile: MemberProfile };

export function MemberIdentityCard({ member, profile }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const name = profile.displayName || "GDG Member";
  const details = [profile.major, profile.graduationYear && `Class of ${profile.graduationYear}`].filter(Boolean).join(" · ");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 9);
    const group = new THREE.Group();
    scene.add(group);

    const card = new THREE.Mesh(
      new THREE.BoxGeometry(5.85, 3.55, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: 0.7, metalness: 0.04 }),
    );
    group.add(card);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(5.88, 3.58, 0.2)),
      new THREE.LineBasicMaterial({ color: 0xffc72c }),
    );
    group.add(outline);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.5, 4.2),
      new THREE.MeshBasicMaterial({ color: 0x101d36, transparent: true, opacity: 0.42 }),
    );
    shadow.position.set(0.38, -0.42, -0.34);
    group.add(shadow);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const light = new THREE.PointLight(0xffffff, 25, 20);
    light.position.set(-3, 4, 6);
    scene.add(light);

    const colors = [0xffc72c, 0xea4335, 0x34a853, 0x4285f4, 0xffffff];
    const bodies = colors.map((color, index) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(index === 0 ? 0.2 : 0.13, 20, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
      mesh.position.set((index - 2) * 1.15, index % 2 ? 1.35 : -1.35, (index % 3) * 0.35 + 0.18);
      scene.add(mesh);
      return { mesh, velocity: new THREE.Vector3((index + 1) * 0.004, (index % 2 ? -1 : 1) * 0.005, (index - 2) * 0.002) };
    });

    let targetX = 0.08;
    let targetY = -0.14;
    let expanded = false;
    const pointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      targetY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.46;
      targetX = -((event.clientY - bounds.top) / bounds.height - 0.5) * 0.32;
    };
    const leave = () => { targetX = 0.08; targetY = -0.14; };
    const toggle = () => { expanded = !expanded; };
    canvas.addEventListener("pointermove", pointer);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("click", toggle);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    renderer.setAnimationLoop(() => {
      group.rotation.x += (targetX - group.rotation.x) * 0.07;
      const spin = expanded ? Math.PI * 2 + targetY : targetY;
      group.rotation.y += (spin - group.rotation.y) * 0.055;
      bodies.forEach(({ mesh, velocity }) => {
        mesh.position.add(velocity);
        if (Math.abs(mesh.position.x) > 4.2) velocity.x *= -1;
        if (Math.abs(mesh.position.y) > 2.4) velocity.y *= -1;
        if (mesh.position.z > 1.7 || mesh.position.z < -0.5) velocity.z *= -1;
      });
      renderer.render(scene, camera);
    });
    return () => {
      canvas.removeEventListener("pointermove", pointer);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("click", toggle);
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
      card.geometry.dispose();
      outline.geometry.dispose();
    };
  }, []);

  return <button type="button" className={`member-identity-card ${showProfile ? "is-profile" : ""}`} onClick={() => setShowProfile((value) => !value)} aria-pressed={showProfile} aria-label="Toggle member card details">
    <canvas ref={canvasRef} className="member-identity-canvas" />
    <span className="member-card-content">
      {!showProfile ? <><small>GOOGLE DEVELOPER GROUPS</small><b>GDG</b><strong>{name}</strong><em>{member.email}</em><i>CLICK TO EXPLORE ↗</i></> : <><small>MEMBER PROFILE</small><b className="member-card-initial">{name.charAt(0).toUpperCase()}</b><strong>{name}</strong><em>{details || "Complete your profile below"}</em><i>{profile.leetCodeUsername ? `LEETCODE · @${profile.leetCodeUsername}` : "CLICK TO RETURN"}</i></>}
    </span>
  </button>;
}
