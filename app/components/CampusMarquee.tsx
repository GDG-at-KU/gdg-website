"use client";
import { useEffect, useRef } from "react";

export function CampusMarquee() {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose = () => {};
    void import("three").then((THREE) => {
      const host = mount.current; if (!host) return;
      const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, .1, 100); camera.position.z = 8;
      const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true }); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(host.clientWidth,host.clientHeight); host.appendChild(renderer.domElement);
      const system = new THREE.Group(); scene.add(system);
      const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42,2),new THREE.MeshBasicMaterial({color:0xffc72c,wireframe:true,transparent:true,opacity:.9})); system.add(shell);
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.88,1),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.44})); system.add(core);
      const rings: THREE.Mesh[]=[]; [[2.0,.3,.9],[2.55,1.0,.2],[3.08,2.2,.7]].forEach(([r,x,y],i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.018,8,100),new THREE.MeshBasicMaterial({color:i===1?0xe51b3e:0xffffff,transparent:true,opacity:.72}));ring.rotation.set(x,y,i*.5);system.add(ring);rings.push(ring)});
      const colors=[0x4285f4,0xea4335,0xfbbc04,0x34a853,0xffffff]; colors.forEach((color,i)=>{const a=i*1.256;const dot=new THREE.Mesh(new THREE.SphereGeometry(.11,16,16),new THREE.MeshBasicMaterial({color}));dot.position.set(Math.cos(a)*2.55,Math.sin(a)*1.6,Math.sin(a*2)*.45);system.add(dot)});
      let pointerX=0,pointerY=0,frame=0; const move=(event:PointerEvent)=>{const r=host.getBoundingClientRect();pointerX=((event.clientX-r.left)/r.width-.5)*.8;pointerY=((event.clientY-r.top)/r.height-.5)*.6}; host.addEventListener("pointermove",move);
      const animate=()=>{frame=requestAnimationFrame(animate);system.rotation.y+=(pointerX-system.rotation.y)*.035;system.rotation.x+=(pointerY-system.rotation.x)*.035;shell.rotation.x+=.004;core.rotation.y-=.007;rings.forEach((ring,i)=>ring.rotation.z+=(i%2?.004:-.003));renderer.render(scene,camera)};animate();
      const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight)};addEventListener("resize",resize);dispose=()=>{cancelAnimationFrame(frame);removeEventListener("resize",resize);host.removeEventListener("pointermove",move);renderer.dispose();host.replaceChildren()};
    }); return()=>dispose();
  },[]);
  return <div className="gdg-signal" aria-label="Interactive GDG signal core"><div ref={mount} className="gdg-canvas"/><div className="gdg-core-label"><span>GOOGLE DEVELOPER GROUPS</span><b>GDG</b><i/><strong>ON CAMPUS · KU</strong></div><p className="signal-hint">MOVE TO EXPLORE <em>↗</em></p></div>;
}
