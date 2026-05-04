import * as THREE from 'three';

export class ParticleEngine {
  public mesh: THREE.InstancedMesh;
  private count: number = 32000; // 数量翻倍
  private dummy = new THREE.Object3D();
  private particles: { pos: THREE.Vector3; target: THREE.Vector3; phase: number }[] = [];
  private velocities: THREE.Vector3[] = [];
  private colorAttribute: THREE.InstancedBufferAttribute;

  constructor(scene: THREE.Scene) {
    // 采用极小的四面体，减少面数以维持 FPS
    const geometry = new THREE.TetrahedronGeometry(0.015, 0);
    const material = new THREE.MeshPhongMaterial({ 
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      shininess: 100
    });

    const colors = new Float32Array(this.count * 3);
    this.colorAttribute = new THREE.InstancedBufferAttribute(colors, 3);
    geometry.setAttribute('color', this.colorAttribute);

    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
    scene.add(this.mesh);

    for (let i = 0; i < this.count; i++) {
      const pos = new THREE.Vector3((Math.random()-0.5)*20, (Math.random()-0.5)*20, (Math.random()-0.5)*20);
      this.particles.push({ pos, target: pos.clone(), phase: Math.random() * Math.PI * 2 });
      this.velocities.push(new THREE.Vector3());
      new THREE.Color(0x001133).toArray(colors, i * 3);
    }
  }

  public update(handPos: { x: number; y: number; z: number } | null) {
    const time = performance.now() * 0.002;
    const colors = this.colorAttribute.array as Float32Array;

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      const vel = this.velocities[i];
      const accel = new THREE.Vector3();

      if (handPos) {
        const handVec = new THREE.Vector3(handPos.x, handPos.y, handPos.z);
        const distVec = handVec.clone().sub(p.pos);
        const distance = distVec.length();

        // 1. 引力 + 2. 切向力（旋转效果）
        const force = 2.5 / (distance * distance + 0.8);
        accel.add(distVec.normalize().multiplyScalar(force));

        // 计算切向力，让粒子绕手旋转
        const tangent = new THREE.Vector3(distVec.y, -distVec.x, 0).normalize();
        accel.add(tangent.multiplyScalar(force * 0.5));

        // 3. 动态色彩：根据距离在青、蓝、紫之间过渡
        const col = new THREE.Color();
        col.setHSL(0.5 + Math.sin(time + distance) * 0.1, 1, Math.min(0.9, 0.3 + force));
        col.toArray(colors, i * 3);
      } else {
        // 无手状态：布朗运动漂浮
        accel.add(new THREE.Vector3(Math.sin(time + p.phase)*0.01, Math.cos(time + p.phase)*0.01, 0));
        accel.add(p.target.clone().sub(p.pos).multiplyScalar(0.005));
        new THREE.Color(0x001144).toArray(colors, i * 3);
      }

      vel.add(accel).multiplyScalar(0.92); // 阻尼调低，增加丝滑感
      p.pos.add(vel);

      this.dummy.position.copy(p.pos);
      // 靠近手指的粒子会由于能量激发而变大
      const scale = handPos ? Math.max(0.4, 2.0 - p.pos.distanceTo(new THREE.Vector3(handPos.x, handPos.y, handPos.z)) * 0.5) : 0.6;
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.colorAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}