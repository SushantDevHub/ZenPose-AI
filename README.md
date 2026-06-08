# ZenPose AI — Real-Time Yoga Pose Detection

A fully browser-based, AI-powered yoga pose detection web app. No installation, no backend, no data uploaded anywhere — everything runs locally on your device.

![ZenPose AI](https://img.shields.io/badge/AI-MediaPipe%20Pose-4a6b4e?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Browser-c4845a?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-7a9e7e?style=for-the-badge)

---

## 📸 Features

-  **User Authentication** — Register & login with password hashing, stored in browser IndexedDB
-  **Real-Time AI Detection** — Detects 8 yoga poses live via webcam using Google MediaPipe
-  **Skeleton Overlay** — Draws joints and bones on your live video feed
-  **Session Stats** — Tracks poses completed, time elapsed, and score
- **Pose Library** — Visual grid that highlights poses you've successfully held
-  **Coaching Tips** — Contextual tips for each detected pose
-  **Scoring System** — Earn 10 points for every pose held for 3+ seconds
-  **Responsive Design** — Works on desktop and mobile browsers

---

##  Supported Yoga Poses

| Emoji | Pose Name     | Sanskrit Name       |
|-------|---------------|---------------------|
| 🌳    | Tree Pose     | Vrksasana           |
| ⚔️    | Warrior I     | Virabhadrasana I    |
| 🗡️    | Warrior II    | Virabhadrasana II   |
| ✈️    | T-Pose        | Reference Pose      |
| 🏔️    | Mountain Pose | Tadasana            |
| 🙇    | Forward Fold  | Uttanasana          |
| 📐    | Triangle Pose | Trikonasana         |
| 🪑    | Chair Pose    | Utkatasana          |

---

##  Getting Started

### Prerequisites

- A modern browser (Chrome, Edge, or Firefox recommended)
- A webcam
- Python 3 installed (to run local server)

### Run Locally

**1. Clone or download the project**

```bash
git clone https://github.com/YOUR_USERNAME/zenpose-ai.git
cd zenpose-ai
```

Or simply download `yoga-pose-detection.html` and place it in a folder.

**2. Start a local server**

```bash
python -m http.server 8080
```

>  You **must** use a local server. Opening the file directly via `file://` will block camera access due to browser security policies.

**3. Open in your browser**

```
http://localhost:8080/yoga-pose-detection.html
```

**4. Register an account and start detecting!**

---

##  Tech Stack

| Technology | Purpose |
|---|---|
| **MediaPipe Pose** | AI body landmark detection (33 keypoints) |
| **WebRTC / getUserMedia** | Live webcam video capture |
| **Canvas 2D API** | Skeleton and joint rendering overlay |
| **IndexedDB** | Local persistent user database |
| **FNV-1a Hash** | Client-side password hashing |
| **sessionStorage** | Session persistence across page refreshes |
| **HTML5 / CSS3 / Vanilla JS** | UI, animations, and application logic |
| **Google Fonts** | Cormorant Garamond + DM Mono typography |

---

##  How the AI Works

### 1. Landmark Detection (MediaPipe)
Google's **BlazePose** neural network analyses each video frame and outputs **33 body keypoints** — nose, shoulders, elbows, wrists, hips, knees, ankles, and more — each with normalised `x`, `y`, `z` coordinates and a visibility confidence score.

### 2. Angle-Based Classification
A custom geometric classifier computes **8 joint angles** per frame using the dot-product formula:

```
angle(A, B, C) = arccos( (BA · BC) / (|BA| × |BC|) )
```

Key angles computed: left/right elbow, left/right knee, left/right shoulder, left/right hip.

### 3. Pose Matching Rules
Boolean feature flags (e.g. `armsUp`, `kneesStr`, `feetFar`, `oneKneeBent`) are combined into pose decision rules:

```
Tree Pose   → oneKneeBent AND (armsUp OR armsWide)
Warrior I   → feetFar AND armsUp AND kneeDiff > 20°
Mountain    → feetClose AND armsDown AND kneesStr AND hipStraight
...etc
```

### 4. Hold Detection
A pose must be held for **3 continuous seconds** before it's registered as complete and points are awarded. MediaPipe's `smoothLandmarks` applies temporal smoothing to reduce jitter between frames.

---

##  Project Structure

```
zenpose-ai/
│
├── yoga-pose-detection.html    # Entire app in one file
└── README.md                   # This file
```

> The entire application — HTML, CSS, and JavaScript — is contained in a **single file**. No build tools, no npm, no dependencies to install.

---

##  Authentication Details

- Accounts are stored in **IndexedDB** in your browser (local only)
- Passwords are hashed using **FNV-1a** before storage — plaintext is never saved
- Sessions persist via **sessionStorage** — refreshing the page keeps you logged in
- Data is tied to your browser profile — clearing browser data will remove accounts

> **Note:** This is a client-side only auth system suitable for personal/demo use. For production, use a backend with bcrypt/Argon2 and a proper database.

---

##  Configuration

The MediaPipe model can be tuned inside `startCamera()`:

```javascript
poseDetector.setOptions({
  modelComplexity: 1,          // 0 = fastest, 1 = balanced, 2 = most accurate
  smoothLandmarks: true,       // Reduces jitter between frames
  minDetectionConfidence: 0.55, // Minimum score to detect a person
  minTrackingConfidence: 0.55  // Minimum score to keep tracking
});
```

---

##  Deploy to GitHub Pages (Free Hosting)

Once pushed to GitHub, enable GitHub Pages for a live HTTPS URL:

1. Go to your repo → **Settings** → **Pages**
2. Set Source to **main branch / root**
3. Your app will be live at:

```
https://YOUR_USERNAME.github.io/zenpose-ai/yoga-pose-detection.html
```

> GitHub Pages serves over **HTTPS**, so the camera will work without a local server.

---

##  Known Issues & Limitations

- **Camera permission error** — Must be served over `localhost` or HTTPS, not `file://`
- **Occlusion** — Poses where limbs overlap (e.g. arms crossed) may reduce accuracy
- **Similar poses** — Warrior I vs II can occasionally be confused at certain camera angles
- **Body proportions** — Fixed angle thresholds may need adjustment for different body types
- **Single file deployment** — No offline support / PWA yet

---

##  Future Improvements

- [ ] Train an MLP classifier on the Yoga-82 dataset for 82 pose support
- [ ] Add rep counting and hold-time display per pose
- [ ] Voice feedback using the Web Speech API
- [ ] Backend API with bcrypt auth and cloud sync
- [ ] Progressive Web App (PWA) with offline support
- [ ] Export session history as PDF report

---

##  License

This project is open source under the [MIT License](LICENSE).

---

##  Acknowledgements

- [Google MediaPipe](https://ai.google.dev/edge/mediapipe) — Pose landmark model
- [BlazePose paper](https://arxiv.org/abs/2006.10204) — Bazarevsky et al., 2020
- [Yoga-82 Dataset](https://arxiv.org/abs/2004.10362) — Pose classification research
- [Google Fonts](https://fonts.google.com) — Cormorant Garamond & DM Mono

---

<p align="center">Made with by ZenPose AI</p>
