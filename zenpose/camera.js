/* ============================================================
   ZenPose AI — camera.js
   BACKEND / ML LAYER: MediaPipe Pose, WebRTC camera, frame loop
   ============================================================

   Responsibilities:
   - Initialise MediaPipe Pose model
   - Request webcam access via getUserMedia (WebRTC)
   - Drive the requestAnimationFrame render loop
   - Handle pose results callback (draw skeleton + classify)
   - Session timer & score tracking

   Depends on: poses.js (POSES, classifyPose)
               ui.js    (updateCurrentPose, showToast, setStatus)
   ============================================================ */

/* ---- STATE ------------------------------------------------ */
let poseDetector = null;   // MediaPipe Pose instance
let cameraStream = null;   // Active MediaStream from webcam
let isRunning    = false;  // Whether detection loop is active

// Session tracking
let sessionStart       = null;
let sessionTimer       = null;
let posesDetectedCount = 0;
let sessionScore       = 0;
let lastPoseId         = null;
let holdStart          = null;
let holdSeconds        = 0;
let detectedPoseIds    = new Set(); // Poses completed this session

// DOM references (resolved after DOMContentLoaded)
let video, canvas, ctx;

/* ---- INIT DOM REFS ---------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  video  = document.getElementById('video-feed');
  canvas = document.getElementById('output-canvas');
  ctx    = canvas.getContext('2d');
});

/* ---- CAMERA CONTROL --------------------------------------- */

/**
 * startCamera()
 * 1. Shows loading overlay
 * 2. Initialises MediaPipe Pose (lazy, only once)
 * 3. Requests webcam via getUserMedia
 * 4. Starts the frame processing loop
 */
async function startCamera() {
  if (isRunning) return;

  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('loader-msg').textContent = 'Loading AI model...';
  setStatus('loading');

  try {
    // ---- Initialise MediaPipe Pose (once) ----
    if (!poseDetector) {
      poseDetector = new Pose({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
      });

      poseDetector.setOptions({
        modelComplexity         : 1,     // 0=fast 1=balanced 2=accurate
        smoothLandmarks         : true,  // EMA temporal smoothing
        enableSegmentation      : false,
        smoothSegmentation      : false,
        minDetectionConfidence  : 0.55,
        minTrackingConfidence   : 0.55
      });

      poseDetector.onResults(onPoseResults);

      document.getElementById('loader-msg').textContent = 'Warming up model...';
      await poseDetector.initialize();
    }

    // ---- Request webcam (requires localhost or HTTPS) ----
    document.getElementById('loader-msg').textContent = 'Requesting camera access...';
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false
    });

    video.srcObject = cameraStream;
    await video.play();

    // ---- Setup canvas dimensions ----
    document.getElementById('video-placeholder').style.display = 'none';
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;

    // ---- Start session ----
    isRunning    = true;
    sessionStart = Date.now();
    sessionTimer = setInterval(updateTimer, 1000);

    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-stop').disabled  = false;

    processFrame(); // Kick off rAF loop

    document.getElementById('loading-overlay').style.display = 'none';
    setStatus('active');
    showToast('Camera started! Strike a pose 🧘');

  } catch (e) {
    document.getElementById('loading-overlay').style.display = 'none';
    setStatus('');
    showToast('Error: ' + e.message);
    console.error(e);
  }
}

/**
 * stopCamera()
 * Stops webcam tracks, cancels timers, resets UI to idle state.
 */
function stopCamera() {
  isRunning = false;

  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }

  if (sessionTimer) { clearInterval(sessionTimer); sessionTimer = null; }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('video-placeholder').style.display = 'flex';
  document.getElementById('pose-badge').classList.remove('visible');
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-stop').disabled  = true;

  setStatus('');
  updateCurrentPose(null, 0);
}

/* ---- FRAME LOOP ------------------------------------------- */

/**
 * processFrame()
 * Runs every animation frame via requestAnimationFrame.
 * Sends the current video frame to MediaPipe for inference.
 * MediaPipe calls onPoseResults() asynchronously with landmarks.
 */
async function processFrame() {
  if (!isRunning) return;

  if (video.readyState >= 2) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    try { await poseDetector.send({ image: video }); } catch (e) { /* silent */ }
  }

  requestAnimationFrame(processFrame);
}

/* ---- POSE RESULTS CALLBACK -------------------------------- */

/**
 * onPoseResults(results)
 * Called by MediaPipe after each frame is processed.
 * - Draws skeleton onto canvas
 * - Classifies pose using classifyPose() from poses.js
 * - Updates UI and tracks hold duration for scoring
 *
 * @param {Object} results - MediaPipe results containing poseLandmarks
 */
function onPoseResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) {
    updateCurrentPose(null, 0);
    return;
  }

  // ---- Draw skeleton (from MediaPipe drawing_utils) ----
  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
    color: 'rgba(122,158,126,0.7)',
    lineWidth: 2.5
  });
  drawLandmarks(ctx, results.poseLandmarks, {
    color: 'rgba(196,132,90,0.9)',
    lineWidth: 1,
    radius: 4
  });

  // ---- Classify current pose ----
  const { poseId, confidence } = classifyPose(results.poseLandmarks);
  updateCurrentPose(poseId, confidence);

  // ---- Update video overlay badge ----
  const badge = document.getElementById('pose-badge');

  if (poseId && confidence > 0.55) {
    const pose = POSES.find(p => p.id === poseId);
    badge.classList.add('visible');
    document.getElementById('badge-name').textContent    = pose.emoji + ' ' + pose.name;
    document.getElementById('badge-bar').style.width     = (confidence * 100) + '%';

    // ---- Hold tracking & scoring ----
    if (poseId === lastPoseId) {
      holdSeconds++;

      // Award points after 3-second hold (fires once per pose)
      if (holdSeconds === 3 && !detectedPoseIds.has(poseId)) {
        detectedPoseIds.add(poseId);
        posesDetectedCount++;
        sessionScore += 10;

        document.getElementById('stat-poses').textContent = posesDetectedCount;
        document.getElementById('stat-score').textContent = sessionScore;
        document.getElementById('chip-' + poseId).classList.add('detected');

        showToast(pose.emoji + ' ' + pose.name + ' — well done! +10 pts');
      }
    } else {
      // New pose detected — reset hold counter & show tip
      lastPoseId  = poseId;
      holdStart   = Date.now();
      holdSeconds = 0;
      document.getElementById('tip-text').innerHTML =
        `<strong>${pose.name}:</strong> ${pose.tip}`;
    }

  } else {
    badge.classList.remove('visible');
    if (lastPoseId) { lastPoseId = null; holdSeconds = 0; }
  }
}

/* ---- SESSION TIMER ---------------------------------------- */

/**
 * updateTimer()
 * Called every second by setInterval.
 * Updates the elapsed seconds counter in the stats card.
 */
function updateTimer() {
  if (!sessionStart) return;
  const s = Math.floor((Date.now() - sessionStart) / 1000);
  document.getElementById('stat-time').textContent = s;
}

/**
 * resetStats()
 * Resets all session counters. Called on logout.
 */
function resetStats() {
  posesDetectedCount = 0;
  sessionScore       = 0;
  detectedPoseIds    = new Set();
  document.getElementById('stat-poses').textContent = '0';
  document.getElementById('stat-time').textContent  = '0';
  document.getElementById('stat-score').textContent = '0';
  sessionStart = null;
}
