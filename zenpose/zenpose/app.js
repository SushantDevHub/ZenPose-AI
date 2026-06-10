/* ============================================================
   ZenPose AI — app.js
   ENTRY POINT: Bootstraps the app on page load
   ============================================================

   Load order (defined in index.html):
     db.js → auth.js → poses.js → ui.js → camera.js → app.js

   This file is intentionally minimal — it just wires together
   the other modules by opening the database and restoring
   any existing login session.
   ============================================================ */

/**
 * App initialisation.
 * Runs once the page and all scripts have loaded.
 *
 * 1. Opens IndexedDB (creates schema on first run)
 * 2. Checks sessionStorage for a saved login
 * 3. If found, re-hydrates the user and skips to the main app
 * 4. Otherwise, the auth screen is shown (default HTML state)
 */
openDB()
  .then(() => {
    // Restore session if user was previously logged in this tab
    restoreSession();
  })
  .catch(err => {
    // Surface any IndexedDB errors as a toast
    showToast('Database error: ' + err.message);
    console.error('IndexedDB failed to open:', err);
  });
