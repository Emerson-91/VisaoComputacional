const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// Ajusta tamanho do canvas corretamente
function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
}

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

// Polegar correto
function isThumbUp(landmarks, handedness) {
  if (handedness === "Right") {
    return landmarks[4].x < landmarks[3].x;
  } else {
    return landmarks[4].x > landmarks[3].x;
  }
}

// Contagem de dedos
function countFingers(landmarks, handedness) {
  let fingers = 0;

  const tips = [8, 12, 16, 20];
  const dips = [6, 10, 14, 18];

  for (let i = 0; i < tips.length; i++) {
    if (landmarks[tips[i]].y < landmarks[dips[i]].y) {
      fingers++;
    }
  }

  if (isThumbUp(landmarks, handedness)) {
    fingers++;
  }

  return fingers;
}

// Joinha
function isThumbsUp(landmarks, handedness) {
  const thumb = isThumbUp(landmarks, handedness);

  const fingersDown =
    landmarks[8].y > landmarks[6].y &&
    landmarks[12].y > landmarks[10].y &&
    landmarks[16].y > landmarks[14].y &&
    landmarks[20].y > landmarks[18].y;

  return thumb && fingersDown;
}

// Resultado
hands.onResults(results => {
  if (!videoElement.videoWidth) return;

  resizeCanvas();

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  let texto = "Nenhuma mão";
  let total = 0;

  if (results.multiHandLandmarks && results.multiHandedness) {

    for (let i = 0; i < results.multiHandLandmarks.length; i++) {

      const landmarks = results.multiHandLandmarks[i];
      const handedness = results.multiHandedness[i].label;

      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 2
      });

      drawLandmarks(canvasCtx, landmarks, {
        color: '#FF0000',
        lineWidth: 1
      });

      total = countFingers(landmarks, handedness);
      const thumbsUp = isThumbsUp(landmarks, handedness);

      // Lógica de gestos
      if (thumbsUp) {
        texto = "Joinha";
      } else if (total === 0) {
        texto = "Mão fechada";
      } else if (total === 5) {
        texto = "Mão aberta";
      } else {
        texto = total + " dedos";
      }
    }
  }

  // Atualiza UI
  const fingerEl = document.getElementById("fingerCount");
  const gestureEl = document.getElementById("gesture");

  if (fingerEl) fingerEl.innerText = total + " dedos";
  if (gestureEl) gestureEl.innerText = texto;

  // Texto no canvas
  canvasCtx.font = "30px Arial";
  canvasCtx.fillStyle = "yellow";
  canvasCtx.fillText(texto, 10, 40);

  canvasCtx.restore();
});

// Webcam (evita duplicação)
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  }
});

// Só inicia UMA vez
camera.start();

// Garante que resize acontece
videoElement.onloadedmetadata = () => {
  resizeCanvas();
};