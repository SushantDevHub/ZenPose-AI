/* ============================================================
   ZenPose AI — poses.js
   BACKEND / ML LAYER: Pose data, geometry math, classifier
   ============================================================

   Responsibilities:
   - POSES data array (name, sanskrit, emoji, tips)
   - Vector angle computation (dot-product formula)
   - Angle-based pose classification engine
   - buildPoseGrid() — renders pose library chips in the UI
   ============================================================ */

/* ---- POSE DEFINITIONS ------------------------------------- */

/**
 * POSES[]
 * Master list of all detectable yoga poses.
 * Each entry contains display info + a coaching tip.
 */
const POSES = [
  {
    id: 'tree',
    name: 'Tree Pose',
    sanskrit: 'Vrksasana',
    emoji: '🌳',
    color: '#7a9e7e',
    tip: 'Press the sole of your foot into your inner thigh. Focus your gaze on a fixed point.'
  },
  {
    id: 'warrior1',
    name: 'Warrior I',
    sanskrit: 'Virabhadrasana I',
    emoji: '⚔️',
    color: '#c4845a',
    tip: 'Keep your hips squared forward. Raise your arms overhead, shoulder-width apart.'
  },
  {
    id: 'warrior2',
    name: 'Warrior II',
    sanskrit: 'Virabhadrasana II',
    emoji: '🗡️',
    color: '#c4845a',
    tip: 'Extend your arms parallel to the floor. Gaze over your front hand.'
  },
  {
    id: 'tpose',
    name: 'T-Pose',
    sanskrit: 'Reference Pose',
    emoji: '✈️',
    color: '#5a7ec4',
    tip: 'Stand tall with arms extended. Used for AI calibration.'
  },
  {
    id: 'mountain',
    name: 'Mountain Pose',
    sanskrit: 'Tadasana',
    emoji: '🏔️',
    color: '#6b6b8a',
    tip: 'Stand tall, feet together. Engage your core and roll your shoulders back.'
  },
  {
    id: 'forwardfold',
    name: 'Forward Fold',
    sanskrit: 'Uttanasana',
    emoji: '🙇',
    color: '#8a6b4e',
    tip: 'Hinge from your hips, not your waist. Keep your spine long.'
  },
  {
    id: 'triangle',
    name: 'Triangle Pose',
    sanskrit: 'Trikonasana',
    emoji: '📐',
    color: '#4e8a7a',
    tip: 'Extend your torso over the front leg. Reach down with one hand, up with the other.'
  },
  {
    id: 'chair',
    name: 'Chair Pose',
    sanskrit: 'Utkatasana',
    emoji: '🪑',
    color: '#7a4e8a',
    tip: 'Sink your hips as if sitting in a chair. Keep your knees behind your toes.'
  },
];

/* ---- UI: POSE LIBRARY GRID -------------------------------- */

/**
 * buildPoseGrid()
 * Renders all pose chips into #pose-grid.
 * Called once after login.
 */
function buildPoseGrid() {
  const grid = document.getElementById('pose-grid');
  grid.innerHTML = POSES.map(p => `
    <div class="pose-chip" id="chip-${p.id}">
      <span class="chip-icon">${p.emoji}</span>
      <span class="chip-name">${p.name}</span>
      <span class="chip-san">${p.sanskrit}</span>
    </div>
  `).join('');
}

/* ---- GEOMETRY HELPERS ------------------------------------- */

/**
 * getLandmark(lms, idx)
 * Extracts a single MediaPipe landmark as a plain object.
 * @param {Array}  lms - Full landmarks array from MediaPipe
 * @param {number} idx - Landmark index (0–32)
 * @returns {{ x, y, z, v }} Normalised coordinates + visibility
 */
function getLandmark(lms, idx) {
  const l = lms[idx];
  return { x: l.x, y: l.y, z: l.z, v: l.visibility };
}

/**
 * angle(A, B, C)
 * Computes the interior angle at joint B using the dot-product formula:
 *   θ = arccos( (BA · BC) / (|BA| × |BC|) )
 *
 * Returns degrees in range [0, 180].
 * ~180° = straight/extended limb
 * ~90°  = right-angle bend
 * ~60°  = deep bend
 *
 * @param {{ x, y }} A - First point
 * @param {{ x, y }} B - Vertex (joint) point
 * @param {{ x, y }} C - Third point
 * @returns {number} Angle in degrees
 */
function angle(A, B, C) {
  const ba = { x: A.x - B.x, y: A.y - B.y };
  const bc = { x: C.x - B.x, y: C.y - B.y };
  const dot   = ba.x * bc.x + ba.y * bc.y;
  const magBA = Math.hypot(ba.x, ba.y);
  const magBC = Math.hypot(bc.x, bc.y);
  if (magBA * magBC === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))) * (180 / Math.PI);
}

/* ---- POSE CLASSIFIER -------------------------------------- */

/**
 * classifyPose(lms)
 * Main classification function.
 * Computes joint angles and boolean feature flags from MediaPipe
 * landmarks, then matches against pose rule definitions.
 *
 * Pose priority order (first match wins):
 *   Tree → T-Pose → Warrior I → Warrior II →
 *   Forward Fold → Chair → Triangle → Mountain
 *
 * @param  {Array} lms - MediaPipe poseLandmarks array (33 items)
 * @returns {{ poseId: string|null, confidence: number }}
 */
function classifyPose(lms) {
  if (!lms || lms.length < 33) return { poseId: null, confidence: 0 };

  /* --- Extract key landmarks --- */
  const nose      = getLandmark(lms, 0);
  const lShoulder = getLandmark(lms, 11);
  const rShoulder = getLandmark(lms, 12);
  const lElbow    = getLandmark(lms, 13);
  const rElbow    = getLandmark(lms, 14);
  const lWrist    = getLandmark(lms, 15);
  const rWrist    = getLandmark(lms, 16);
  const lHip      = getLandmark(lms, 23);
  const rHip      = getLandmark(lms, 24);
  const lKnee     = getLandmark(lms, 25);
  const rKnee     = getLandmark(lms, 26);
  const lAnkle    = getLandmark(lms, 27);
  const rAnkle    = getLandmark(lms, 28);

  /* --- Compute joint angles --- */
  const lElbowAngle    = angle(lShoulder, lElbow,    lWrist);
  const rElbowAngle    = angle(rShoulder, rElbow,    rWrist);
  const lKneeAngle     = angle(lHip,      lKnee,     lAnkle);
  const rKneeAngle     = angle(rHip,      rKnee,     rAnkle);
  const lShoulderAngle = angle(lElbow,    lShoulder, lHip);
  const rShoulderAngle = angle(rElbow,    rShoulder, rHip);
  const lHipAngle      = angle(lShoulder, lHip,      lKnee);
  const rHipAngle      = angle(rShoulder, rHip,      rKnee);

  /* --- Boolean feature flags --- */
  const armsExtended = lElbowAngle > 150 && rElbowAngle > 150;
  const armsUp       = lWrist.y < lShoulder.y - 0.05 && rWrist.y < rShoulder.y - 0.05;
  const armsDown     = lWrist.y > lHip.y && rWrist.y > rHip.y;
  const armsWide     = Math.abs(lWrist.x - rWrist.x) > 0.5;
  const kneesStr     = lKneeAngle > 155 && rKneeAngle > 155;
  const hipStraight  = lHipAngle  > 155 && rHipAngle  > 155;
  const feetClose    = Math.abs(lAnkle.y - rAnkle.y) < 0.04;
  const feetFar      = Math.abs(lAnkle.x - rAnkle.x) > 0.25;
  const torsoForward = nose.y > lHip.y - 0.05;
  const oneKneeBent  = (lKneeAngle < 140 && rKneeAngle > 155) ||
                       (rKneeAngle < 140 && lKneeAngle > 155);
  const oneArmUp     = (lWrist.y < lShoulder.y && rWrist.y > rHip.y) ||
                       (rWrist.y < rShoulder.y && lWrist.y > lHip.y);
  const armsHoriz    = Math.abs(lShoulder.y - lWrist.y) < 0.12 &&
                       Math.abs(rShoulder.y - rWrist.y) < 0.12;

  /* --- TREE POSE ---
     One knee bent + arms up OR arms wide & extended              */
  if (oneKneeBent && (armsUp || (armsExtended && armsWide))) {
    const conf = 0.65
      + (armsUp ? 0.2 : 0.1)
      + (Math.min(lKneeAngle, rKneeAngle) < 100 ? 0.1 : 0);
    return { poseId: 'tree', confidence: Math.min(conf, 0.95) };
  }

  /* --- T-POSE ---
     Arms extended wide & level, knees straight                    */
  if (armsExtended && armsWide && kneesStr &&
      lShoulderAngle > 70 && rShoulderAngle > 70 &&
      Math.abs(lShoulder.y - rShoulder.y) < 0.05) {
    const conf = 0.70 + (Math.abs(lShoulder.y - rShoulder.y) < 0.025 ? 0.15 : 0);
    return { poseId: 'tpose', confidence: Math.min(conf, 0.95) };
  }

  /* --- WARRIOR I ---
     Wide stance, arms up & extended, one knee more bent           */
  if (feetFar && armsUp && armsExtended) {
    const kneeDiff = Math.abs(lKneeAngle - rKneeAngle);
    if (kneeDiff > 20 && Math.min(lKneeAngle, rKneeAngle) < 140) {
      return { poseId: 'warrior1', confidence: 0.72 + (kneeDiff > 40 ? 0.1 : 0) };
    }
  }

  /* --- WARRIOR II ---
     Wide stance, arms extended horizontal & wide, knee difference  */
  if (feetFar && armsExtended && armsWide) {
    const kneeDiff = Math.abs(lKneeAngle - rKneeAngle);
    if (kneeDiff > 15 && Math.min(lKneeAngle, rKneeAngle) < 150 && armsHoriz) {
      return { poseId: 'warrior2', confidence: 0.75 };
    }
  }

  /* --- FORWARD FOLD ---
     Nose drops below hip level, knees straight, arms hanging down  */
  if (torsoForward && kneesStr && armsDown) {
    return { poseId: 'forwardfold', confidence: 0.78 };
  }

  /* --- CHAIR POSE ---
     Feet close, arms up, both knees bent 90–155°                   */
  if (!feetFar && armsUp && lKneeAngle < 155 && rKneeAngle < 155 &&
      lKneeAngle > 90 && rKneeAngle > 90) {
    const avgKnee = (lKneeAngle + rKneeAngle) / 2;
    return { poseId: 'chair', confidence: 0.65 + (avgKnee < 130 ? 0.2 : 0) };
  }

  /* --- TRIANGLE POSE ---
     Wide stance, knees straight, one arm up & one arm down         */
  if (feetFar && oneArmUp && kneesStr) {
    return { poseId: 'triangle', confidence: 0.72 };
  }

  /* --- MOUNTAIN POSE ---
     Feet close, arms down, fully upright                           */
  if (feetClose && armsDown && kneesStr && hipStraight) {
    return { poseId: 'mountain', confidence: 0.75 };
  }

  // No pose matched
  return { poseId: null, confidence: 0 };
}
