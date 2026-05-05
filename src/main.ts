import * as THREE from 'three';
import { ARManager } from './core/ARManager';
import { ParticleEngine } from './core/ParticleEngine';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 双光源系统
const lightMain = new THREE.PointLight(0x00ffff, 60, 20);
const lightRim = new THREE.PointLight(0xff00ff, 30, 25);
scene.add(lightMain, lightRim);
scene.add(new THREE.AmbientLight(0x111111));

camera.position.z = 8;

const ar = new ARManager();
const engine = new ParticleEngine(scene);

function animate() {
  requestAnimationFrame(animate);
  const hand = ar.handWorldPosition;
  
  if (hand) {
    lightMain.position.lerp(new THREE.Vector3(hand.x, hand.y, hand.z), 0.2);
    lightRim.position.set(hand.x + 2, hand.y - 1, hand.z - 2);
    // 抓取时光效增强
    lightMain.intensity = ar.isGrabbing ? 100 : 60;
  } else {
    lightMain.intensity = lightRim.intensity = 0;
  }

  engine.update(hand, ar.isGrabbing);
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});