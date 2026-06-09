/* ============================================================
   ZenPose AI — ui.js
   FRONTEND LAYER: UI update functions, toast, status dot
   ============================================================

   Responsibilities:
   - updateCurrentPose() — updates the side panel pose card
   - setStatus()         — controls the live status indicator dot
   - showToast()         — shows temporary notification messages
   ============================================================ */

/* ---- STATUS INDICATOR ------------------------------------- */

/**
 * setStatus(state)
 * Controls the coloured status dot and label in the video header.
 *
 * @param {string} state - 'active' | 'loading' | '' (off)
 */
function setStatus(state) {
  const dot   = document.getElementById('status-dot');
  const label = document.getElementById('status-label');

  dot.className = 'status-dot ' + state;

  label.textContent =
    state === 'active'  ? 'Detecting'  :
    state === 'loading' ? 'Loading...' :
    'Camera off';
}

/* ---- CURRENT POSE CARD ------------------------------------ */

/**
 * updateCurrentPose(poseId, confidence)
 * Updates the side panel "Current Pose" card with:
 * - Pose emoji, English name, Sanskrit name
 * - Animated confidence progress bar
 *
 * @param {string|null} poseId     - Matched pose id or null
 * @param {number}      confidence - Confidence score [0, 1]
 */
function updateCurrentPose(poseId, confidence) {
  const pose = poseId ? POSES.find(p => p.id === poseId) : null;
  const pct  = Math.round(confidence * 100);

  // Emoji
  document.getElementById('cur-emoji').textContent =
    pose ? pose.emoji : '🧘';

  // Pose name
  document.getElementById('cur-pose-name').textContent =
    pose        ? pose.name :
    isRunning   ? 'No pose detected' :
    'Waiting...';

  // Sanskrit subtitle
  document.getElementById('cur-sanskrit').textContent =
    pose        ? pose.sanskrit :
    isRunning   ? 'Stand in frame' :
    'Start camera to detect';

  // Confidence bar
  document.getElementById('conf-pct').textContent  = pct + '%';
  document.getElementById('conf-fill').style.width = pct + '%';
}

/* ---- TOAST NOTIFICATION ----------------------------------- */

let toastTimer;

/**
 * showToast(msg)
 * Shows a brief floating notification at the bottom-right.
 * Auto-dismisses after 3.5 seconds.
 *
 * @param {string} msg - Message text to display
 */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
