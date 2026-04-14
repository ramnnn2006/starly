// VIT Feedback Filler — Content Script
// Fills star ratings and text fields on VTOP feedback pages.
// Safe Batch Mode: fills forms but NEVER auto-submits.
// The user must click Submit themselves for each course.

// ─── Timing / limit constants ────────────────────────────────────────────────
const FORM_LOAD_SETTLE_MS         = 400;   // wait after stars appear before filling
const POST_SUBMISSION_DELAY_MS    = 700;   // pause between batch courses
const SUBMISSION_CHECK_INITIAL_MS = 1500;  // initial delay before polling for submit
const SUBMISSION_TIMEOUT_MS       = 300000; // 5 minutes max wait for user to submit
const MAX_BATCH_ROUNDS            = 50;    // upper bound on batch loop iterations
const SCRIPT_INJECTION_DELAY_MS   = 350;  // delay after injecting content script

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.action === "fill")   { reply(fillForm(msg.stars, msg.note)); return true; }
  if (msg.action === "scan")   { reply(inspectPage()); return true; }
  if (msg.action === "batch")  { runBatch(msg.stars, msg.note, reply); return true; }
  return true;
});

// ─── Page inspection ────────────────────────────────────────────────────────

function inspectPage() {
  const ratingGroups = gatherRatingGroups();
  const postButtons  = findPendingPostButtons();
  return {
    formNames:     identifyForms(),
    ratingCount:   ratingGroups.length,
    textareaCount: document.querySelectorAll("textarea").length,
    hasFeedback:   ratingGroups.length > 0,
    isListingPage: postButtons.length > 0 && ratingGroups.length === 0,
    pendingForms:  postButtons.length,
  };
}

// ─── Form identification ─────────────────────────────────────────────────────

function identifyForms() {
  const knownForms = {
    CourseFeedbackPerceptionCurr:    "Curriculum & Syllabus",
    CourseFeedbackPerception:        "Course / Faculty",
    CourseOutcomeFeedbackPerception: "Course Outcome",
    GeneralFeedbackPerception:       "General Feedback",
  };
  const found = [];
  for (const [id, label] of Object.entries(knownForms)) {
    if (document.getElementById(id) || document.forms[id]) found.push(label);
  }
  if (!found.length && document.querySelectorAll("fieldset.rating").length > 0) {
    found.push("Feedback Form");
  }
  return found;
}

// ─── Star rating discovery ───────────────────────────────────────────────────

function gatherRatingGroups() {
  const byName = new Map();

  // Strategy 1: fieldset.rating wrappers
  document.querySelectorAll("fieldset.rating").forEach(fieldset => {
    fieldset.querySelectorAll('input[type="radio"]').forEach(radio => {
      if (!radio.name) return;
      if (!byName.has(radio.name)) byName.set(radio.name, []);
      byName.get(radio.name).push(radio);
    });
  });

  // Strategy 2: any radio with numeric value 1–5
  if (!byName.size) {
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      const val = parseInt(radio.value, 10);
      if (radio.name && val >= 1 && val <= 5) {
        if (!byName.has(radio.name)) byName.set(radio.name, []);
        byName.get(radio.name).push(radio);
      }
    });
  }

  return Array.from(byName.entries());
}

// ─── Post button discovery ───────────────────────────────────────────────────

function findPendingPostButtons() {
  const buttons = [];
  document.querySelectorAll("button, input[type='button'], a.btn").forEach(el => {
    const label = (el.textContent || el.value || "").trim().toLowerCase();
    if (label === "post") buttons.push(el);
  });
  return buttons;
}

// ─── Submit button discovery ─────────────────────────────────────────────────

function findSubmitButton() {
  for (const el of document.querySelectorAll("button, input[type='submit'], input[type='button']")) {
    const label = (el.textContent || el.value || "").trim().toLowerCase();
    if (label === "submit") return el;
  }
  return null;
}

// ─── Form filling ────────────────────────────────────────────────────────────

function fillForm(stars, note) {
  let starsSet  = 0;
  let notesSet  = 0;
  const issues  = [];

  try {
    // Fill star ratings
    gatherRatingGroups().forEach(([name, radios]) => {
      const target = radios.find(r => parseInt(r.value, 10) === stars);
      if (target) {
        radios.forEach(r => (r.checked = false));
        target.checked = true;
        ["change", "click", "input"].forEach(type =>
          target.dispatchEvent(new Event(type, { bubbles: true }))
        );
        starsSet++;
      } else {
        issues.push(`Group "${name}": no option for ${stars} stars`);
      }
    });

    // CSS-only star widget fallback (label click)
    if (!starsSet) {
      document.querySelectorAll(`fieldset.rating label[for^="star${stars}_"]`).forEach(lbl => {
        lbl.click();
        starsSet++;
      });
    }

    // Fill text areas
    document.querySelectorAll("form textarea, textarea.form-control").forEach(ta => {
      if (note) {
        ta.value = note;
        ["input", "change"].forEach(type => ta.dispatchEvent(new Event(type, { bubbles: true })));
        notesSet++;
      }
    });

    const label = identifyForms().join(" + ") || "Feedback Form";
    return starsSet > 0
      ? { ok: true, starsSet, notesSet, label, issues }
      : { ok: false, starsSet: 0, notesSet: 0, label: "None detected", issues };
  } catch (err) {
    return { ok: false, starsSet: 0, notesSet: 0, label: "Error", issues: [err.message] };
  }
}

// ─── Notification sound (Web Audio) ─────────────────────────────────────────

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Three-note ascending chime
    [[440, 0], [550, 0.15], [660, 0.3]].forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);
    });
  } catch (err) {
    console.warn("[VFF] Chime playback failed:", err.message);
  }
}

// ─── Review overlay (neobrutalism) ──────────────────────────────────────────

function showReviewOverlay(starsSet, notesSet, stars, courseIndex, courseTotal) {
  removeReviewOverlay();

  const starBar = "★".repeat(stars) + "☆".repeat(5 - stars);

  // Inject keyframe animation
  const styleEl = document.createElement("style");
  styleEl.id = "vff-style";
  styleEl.textContent = `
    @keyframes vffDrop {
      from { transform: translateY(-40px) scale(0.96); opacity: 0; }
      to   { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes vffPop {
      0%,100% { transform: scale(1); }
      50%     { transform: scale(1.04); }
    }
    #vff-overlay * { box-sizing: border-box; font-family: 'Courier New', monospace; }
  `;
  document.head.appendChild(styleEl);

  const overlay = document.createElement("div");
  overlay.id = "vff-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: rgba(0,0,0,0.6);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 60px;
  `;

  overlay.innerHTML = `
    <div style="
      background: #FFFBE6;
      border: 3px solid #000;
      box-shadow: 6px 6px 0 #000;
      border-radius: 4px;
      padding: 24px 28px;
      max-width: 420px;
      width: calc(100% - 32px);
      animation: vffDrop 0.35s ease;
      position: relative;
    ">

      <!-- Course badge -->
      <div style="
        position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
        background: #FFDD00; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
        font-weight: 900; font-size: 11px; padding: 3px 14px;
        white-space: nowrap; letter-spacing: 0.5px;
      ">COURSE ${courseIndex} / ${courseTotal}</div>

      <!-- Title row -->
      <div style="text-align: center; margin-bottom: 18px; margin-top: 6px;">
        <div style="font-size: 36px; line-height: 1;">✅</div>
        <div style="font-size: 20px; font-weight: 900; margin-top: 6px; letter-spacing: -0.5px;">FORM FILLED!</div>
        <div style="font-size: 12px; color: #555; margin-top: 2px;">Review before you submit</div>
      </div>

      <!-- Stats row -->
      <div style="display: flex; gap: 10px; margin-bottom: 18px;">
        <div style="
          flex: 1; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
          background: #FFDD00; padding: 10px 6px; text-align: center;
        ">
          <div style="font-size: 26px; font-weight: 900;">${starsSet}</div>
          <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">QUESTIONS<br>FILLED</div>
        </div>
        <div style="
          flex: 1; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
          background: #fff; padding: 10px 6px; text-align: center;
        ">
          <div style="font-size: 18px; font-weight: 900; letter-spacing: 2px;">${starBar}</div>
          <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">RATING<br>GIVEN</div>
        </div>
        ${notesSet > 0 ? `
        <div style="
          flex: 1; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
          background: #d4f5d4; padding: 10px 6px; text-align: center;
        ">
          <div style="font-size: 26px; font-weight: 900;">${notesSet}</div>
          <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">TEXT BOX(ES)<br>FILLED</div>
        </div>` : ""}
      </div>

      <!-- Warning box -->
      <div style="
        border: 2px solid #000; box-shadow: 3px 3px 0 #000;
        background: #fff3cd; padding: 10px 12px; margin-bottom: 16px;
        display: flex; align-items: flex-start; gap: 8px;
      ">
        <span style="font-size: 18px; flex-shrink: 0;">⚠️</span>
        <div>
          <div style="font-weight: 900; font-size: 11px; margin-bottom: 3px;">VERIFY BEFORE SUBMITTING</div>
          <div style="font-size: 11px; color: #444; line-height: 1.5;">
            Scroll down and check every star is correct. Wrong feedback can affect FFCS registration!
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div style="display: flex; gap: 10px;">
        <button id="vff-hide" style="
          flex: 1; padding: 10px; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
          background: #fff; font-weight: 900; font-size: 12px; cursor: pointer;
          font-family: inherit; letter-spacing: 0.5px;
          transition: transform 0.1s;
        " onmousedown="this.style.transform='translate(2px,2px)'; this.style.boxShadow='1px 1px 0 #000';"
          onmouseup="this.style.transform=''; this.style.boxShadow='3px 3px 0 #000';">
          HIDE OVERLAY
        </button>
        <button id="vff-submit" style="
          flex: 2; padding: 10px; border: 2px solid #000; box-shadow: 3px 3px 0 #000;
          background: #FFDD00; font-weight: 900; font-size: 13px; cursor: pointer;
          font-family: inherit; letter-spacing: 0.5px;
          animation: vffPop 1.8s ease-in-out infinite;
          transition: transform 0.1s;
        " onmousedown="this.style.transform='translate(2px,2px)'; this.style.boxShadow='1px 1px 0 #000';"
          onmouseup="this.style.transform=''; this.style.boxShadow='3px 3px 0 #000';">
          ✅ I REVIEWED — SUBMIT NOW
        </button>
      </div>

      <div style="text-align: center; font-size: 10px; color: #777; margin-top: 12px;">
        After you submit, the extension moves to the next course automatically
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("vff-hide").addEventListener("click", () => {
    overlay.style.display = "none";
  });

  document.getElementById("vff-submit").addEventListener("click", () => {
    removeReviewOverlay();
    const submitBtn = findSubmitButton();
    if (submitBtn) {
      submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => submitBtn.click(), 300);
    }
  });
}

function removeReviewOverlay() {
  document.getElementById("vff-overlay")?.remove();
  document.getElementById("vff-style")?.remove();
}

// ─── Async wait helpers ──────────────────────────────────────────────────────

function waitForRatings(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const groups = gatherRatingGroups();
      if (groups.length > 0) return resolve(groups);
      if (Date.now() - start > timeoutMs) return reject(new Error("Timed out waiting for ratings"));
      setTimeout(poll, 300);
    };
    poll();
  });
}

// Resolved when the form has been submitted (stars gone, result table present)
function waitForSubmission(timeoutMs = SUBMISSION_TIMEOUT_MS) {
  return new Promise(resolve => {
    const start = Date.now();
    const poll = () => {
      const stillHasRatings = gatherRatingGroups().length > 0;
      const hasResultTable  = !!document.querySelector("table");
      if (!stillHasRatings && hasResultTable) return resolve("submitted");
      if (Date.now() - start > timeoutMs) return resolve("timeout");
      setTimeout(poll, 500);
    };
    setTimeout(poll, SUBMISSION_CHECK_INITIAL_MS);
  });
}

// ─── Batch mode ──────────────────────────────────────────────────────────────

async function runBatch(stars, note, reply) {
  let submitted = 0;
  let skipped   = 0;

  try {
    const initialCount = findPendingPostButtons().length;
    let courseIndex = 0;

    for (let round = 0; round < MAX_BATCH_ROUNDS; round++) {
      const pending = findPendingPostButtons();
      if (!pending.length) break;

      courseIndex++;
      pending[0].click();

      // Wait for ratings to load
      try {
        await waitForRatings(10000);
      } catch (err) {
        console.warn("[VFF] Ratings not found after timeout:", err.message);
        await new Promise(r => setTimeout(r, 2000));
        if (!gatherRatingGroups().length) { skipped++; continue; }
      }

      await new Promise(r => setTimeout(r, FORM_LOAD_SETTLE_MS));

      const result = fillForm(stars, note);
      if (!result.ok) { skipped++; continue; }

      playChime();
      showReviewOverlay(result.starsSet, result.notesSet, stars, courseIndex, initialCount);
      window.scrollTo({ top: 0, behavior: "smooth" });

      const outcome = await waitForSubmission(SUBMISSION_TIMEOUT_MS);
      removeReviewOverlay();

      if (outcome === "timeout") skipped++;
      else submitted++;

      await new Promise(r => setTimeout(r, POST_SUBMISSION_DELAY_MS));
    }

    const msg = submitted > 0
      ? `Done! ${submitted} form(s) submitted.${skipped ? ` ${skipped} skipped/timed out.` : ""}`
      : "No forms submitted. Check that you are on the VTOP feedback listing page.";

    reply({ ok: true, submitted, skipped, msg });
  } catch (err) {
    removeReviewOverlay();
    reply({ ok: false, submitted, skipped, msg: `Error: ${err.message}` });
  }
}
