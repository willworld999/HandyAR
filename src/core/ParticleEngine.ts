import * as THREE from 'three';

export class ParticleEngine {
  public mesh: THREE.InstancedMesh;
  private count: number = 32000;
  private dummy = new THREE.Object3D();
  private particles: { pos: THREE.Vector3; origin: THREE.Vector3; seed: number }[] = [];
  private velocities: THREE.Vector3[] = [];
  private colorAttribute: THREE.InstancedBufferAttribute;

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.TetrahedronGeometry(0.015, 0);
    const material = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.8,
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
      this.particles.push({ pos, origin: pos.clone(), seed: Math.random() * 100 });
      this.velocities.push(new THREE.Vector3());
    }
  }

  // 计算三维卷曲噪声，产生流体效果
  private curlNoise(v: THREE.Vector3, time: number) {
    const s = 0.4; // 空间频率
    const t = time * 0.6;
    return new THREE.Vector3(
      Math.sin(v.y * s + t) - Math.sin(v.z * s + t),
      Math.sin(v.z * s + t) - Math.sin(v.x * s + t),
      Math.sin(v.x * s + t) - Math.sin(v.y * s + t)
    );
  }

  public update(handPos: { x: number; y: number; z: number } | null, isGrabbing: boolean) {
    const time = performance.now() * 0.001;
    const colors = this.colorAttribute.array as Float32Array;
    const tempColor = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      const vel = this.velocities[i];
      const accel = new THREE.Vector3();

      if (handPos) {
        const handVec = new THREE.Vector3(handPos.x, handPos.y, handPos.z);
        const distVec = handVec.clone().sub(p.pos);
        const d = distVec.length();

        // 1. 动态引力：抓取时引力翻倍
        const pull = isGrabbing ? 4.5 : 2.2;
        accel.add(distVec.normalize().multiplyScalar(pull / (d * d + 1.0)));

        // 2. 流体卷曲感
        const noise = this.curlNoise(p.pos, time);
        accel.add(noise.multiplyScalar(0.08));

        // 3. 动态变色：HSL 能量感
        const hue = 0.55 + (d * 0.04); 
        const brightness = Math.max(0.3, 0.9 - d * 0.1);
        tempColor.setHSL(hue % 1.0, 1.0, brightness).toArray(colors, i * 3);
      } else {
        // 无手状态：回归初始位置并带有微弱漂浮
        accel.add(p.origin.clone().sub(p.pos).multiplyScalar(0.005));
        accel.add(new THREE.Vector3(Math.sin(time + p.seed), Math.cos(time + p.seed), 0).multiplyScalar(0.01));
        tempColor.setHex(0x001144).toArray(colors, i * 3);
      }

      vel.add(accel).multiplyScalar(0.92);
      p.pos.add(vel);

      this.dummy.position.copy(p.pos);
      // 靠近手指时粒子因受激而变大
      const scale = handPos ? Math.max(0.5, 2.0 - p.pos.distanceTo(new THREE.Vector3(handPos.x, handPos.y, handPos.z)) * 0.4) : 0.7;
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.colorAttribute.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}