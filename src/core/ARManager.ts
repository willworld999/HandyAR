import { Hands, Results } from '@mediapipe/hands';

export class ARManager {
  private video: HTMLVideoElement;
  private hands: Hands;
  // 引入高阶平滑缓存
  private smoothedPos = { x: 0.5, y: 0.5, z: 0 }; 
  private lerpFactor = 0.15; // 平滑系数，越小越稳，越大越灵敏（建议 0.1 - 0.2）

  public handWorldPosition: { x: number; y: number; z: number } | null = null;

  constructor() {
    this.video = document.createElement('video');
    this.video.style.display = 'none';
    document.body.appendChild(this.video);

    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    // 核心优化：提升模型等级与置信度阈值
    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1, // 0 为轻量，1 为全量。软件工程权衡：精度 vs 功耗
      minDetectionConfidence: 0.85, // 仅当识别度超过 85% 才初始化
      minTrackingConfidence: 0.85,  // 追踪过程中更严格，防止误判
    });

    this.hands.onResults(this.onResults.bind(this));
    this.startCamera();
  }

  private async startCamera() {
    // 增加分辨率有助于小范围内的指尖捕捉更精准
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
      // 获取食指指尖 (Tip)
      const rawLandmark = results.multiHandLandmarks[0][8];
      
      // 核心平滑逻辑：Current = Current + (Target - Current) * Factor
      // 这能有效过滤掉传感器采集时的微小高频噪声
      this.smoothedPos.x += (rawLandmark.x - this.smoothedPos.x) * this.lerpFactor;
      this.smoothedPos.y += (rawLandmark.y - this.smoothedPos.y) * this.lerpFactor;
      this.smoothedPos.z += (rawLandmark.z - this.smoothedPos.z) * this.lerpFactor;

      // 镜像坐标系转换
      this.handWorldPosition = {
        x: (0.5 - this.smoothedPos.x) * 14, 
        y: (0.5 - this.smoothedPos.y) * 10,
        z: -this.smoothedPos.z * 12
      };
    } else {
      this.handWorldPosition = null;
    }
  }
}