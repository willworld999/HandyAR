import * as THREE from 'three';
import { ARManager } from './core/ARManager';
import { ParticleEngine } from './core/ParticleEngine';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 使用多个微弱光源组合，增加空间感
const light = new THREE.PointLight(0x00ffff, 40, 20);
scene.add(light);
scene.add(new THREE.AmbientLight(0x050505));

camera.position.z = 8;

const ar = new ARManager();
const engine = new ParticleEngine(scene);

function animate() {
  requestAnimationFrame(animate);
  const hand = ar.handWorldPosition;
  
  if (hand) {
    // 物理平滑：光源位置稍微落后于手，增加视觉上的“粘滞感”，更显高级
    light.position.lerp(new THREE.Vector3(hand.x, hand.y, hand.z), 0.2);
    light.intensity = 40;
  } else {
    light.intensity = 0;
  }

  engine.update(hand);
  renderer.render(scene, camera);
}
animate();