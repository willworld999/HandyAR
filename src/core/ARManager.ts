import { Hands, Results } from '@mediapipe/hands';

export class ARManager {
  private video: HTMLVideoElement;
  private hands: Hands;
  // 缓存上一次的坐标，用于计算速度并进行平滑
  private lastPos = { x: 0.5, y: 0.5, z: 0 };
  private smoothedPos = { x: 0.5, y: 0.5, z: 0 };
  
  public handWorldPosition: { x: number; y: number; z: number } | null = null;
  public isGrabbing: boolean = false;

  constructor() {
    this.video = document.createElement('video');
    this.video.style.display = 'none';
    document.body.appendChild(this.video);

    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    // 性能优化配置
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // 软工建议：1 在移动端表现最稳，0 虽快但精度低
      minDetectionConfidence: 0.75, // 初始化阈值
      minTrackingConfidence: 0.85,  // 追踪阈值：提高此值可减少误识别产生的“瞬移”
    });

    this.hands.onResults(this.onResults.bind(this));
    this.startCamera();
  }

  private async startCamera() {
    // 强制使用 HD 分辨率提高识别细节
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user', 
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      } 
    });
    this.video.srcObject = stream;
    this.video.play();
    
    const predict = async () => {
      await this.hands.send({ image: this.video });
      requestAnimationFrame(predict);
    };
    predict();
  }

  private onResults(results: Results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const tip = landmarks[8]; // 食指尖
      
      // 1. 自适应平滑系数：根据手指移动速度动态调整平滑度
      // 移动快时降低平滑（减小延迟），移动慢时增强平滑（减小抖动）
      const dx = Math.abs(tip.x - this.lastPos.x);
      const dy = Math.abs(tip.y - this.lastPos.y);
      const speed = dx + dy;
      const alpha = Math.min(0.35, 0.1 + speed * 5); // 动态 Alpha 逻辑

      this.smoothedPos.x += (tip.x - this.smoothedPos.x) * alpha;
      this.smoothedPos.y += (tip.y - this.smoothedPos.y) * alpha;
      this.smoothedPos.z += (tip.z - this.smoothedPos.z) * alpha;

      this.lastPos = { ...tip };

      // 2. 坐标空间映射
      this.handWorldPosition = {
        x: (0.5 - this.smoothedPos.x) * 16, // 放大操作空间
        y: (0.5 - this.smoothedPos.y) * 10,
        z: -this.smoothedPos.z * 15
      };

      // 3. 逻辑判定：握拳检测
      const wrist = landmarks[0];
      const middleTip = landmarks[12];
      const dist = Math.sqrt(Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2));
      this.isGrabbing = dist < 0.25; // 判定手掌是否收缩
    } else {
      this.handWorldPosition = null;
    }
  }
}