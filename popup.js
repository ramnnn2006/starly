// VTOP Feedback Filler — Popup

const INJECT_SETTLE_MS = 350;
const DEFAULT_RATING   = 3;

document.addEventListener("DOMContentLoaded", async () => {

  // ── State ────────────────────────────────────────────────────────────────
  let currentRating  = DEFAULT_RATING;
  let currentComment = "";

  // ── Element refs ─────────────────────────────────────────────────────────
  const stripEl    = document.getElementById("pill");
  const stripDot   = document.getElementById("pillDot");
  const stripText  = document.getElementById("pillText");
  const qStat      = document.getElementById("statQ");
  const rStat      = document.getElementById("statR");
  const pStat      = document.getElementById("statP");
  const busyBar    = document.getElementById("loader");
  const busyLabel  = document.getElementById("loaderText");
  const msgBox     = document.getElementById("statusBox");
  const msgText    = document.getElementById("statusText");
  const fillBtn    = document.getElementById("fillBtn");
  const batchBtn   = document.getElementById("batchBtn");
  const scanBtn    = document.getElementById("scanBtn");

  const ratingToggle  = document.getElementById("ratingHead");
  const ratingDrawer  = document.getElementById("ratingPanel");
  const ratingArrow   = document.getElementById("ratingChev");
  const ratingDisplay = document.getElementById("ratingVal");
  const commentToggle  = document.getElementById("commentHead");
  const commentDrawer  = document.getElementById("commentPanel");
  const commentArrow   = document.getElementById("commentChev");
  const commentDisplay = document.getElementById("commentVal");

  const starBadges    = document.querySelectorAll("[data-v]");
  const commentBadges = document.querySelectorAll("[data-c]");
  const noteArea      = document.getElementById("customTa");
  const counterHint   = document.getElementById("charHint");

  // ── Restore persisted settings ───────────────────────────────────────────
  const saved = await chrome.storage.local.get(["rating", "comment", "customNote"]);
  currentRating  = saved.rating  ?? DEFAULT_RATING;
  currentComment = saved.comment ?? "";

  restoreRatingUI(currentRating);
  restoreCommentUI(saved.comment ?? "", saved.customNote ?? "");

  // ── Run initial page scan ────────────────────────────────────────────────
  await runPageScan();

  // ── Drawer toggles ───────────────────────────────────────────────────────
  ratingToggle.addEventListener("click", () => {
    const nowOpen = ratingDrawer.classList.toggle("open");
    ratingArrow.textContent = nowOpen ? "⌃" : "›";
    if (nowOpen) { commentDrawer.classList.remove("open"); commentArrow.textContent = "›"; }
  });

  commentToggle.addEventListener("click", () => {
    const nowOpen = commentDrawer.classList.toggle("open");
    commentArrow.textContent = nowOpen ? "⌃" : "›";
    if (nowOpen) { ratingDrawer.classList.remove("open"); ratingArrow.textContent = "›"; }
  });

  // ── Star badge clicks ────────────────────────────────────────────────────
  starBadges.forEach(badge => {
    badge.addEventListener("click", () => {
      currentRating = parseInt(badge.dataset.v, 10);
      starBadges.forEach(b => b.classList.remove("active"));
      badge.classList.add("active");
      ratingDisplay.textContent = `${currentRating} Star${currentRating > 1 ? "s" : ""}`;
      rStat.textContent = `${currentRating}★`;
      chrome.storage.local.set({ rating: currentRating });
      clearMessage();
    });
  });

  // ── Comment badge clicks ─────────────────────────────────────────────────
  commentBadges.forEach(badge => {
    badge.addEventListener("click", () => {
      commentBadges.forEach(b => b.classList.remove("active"));
      badge.classList.add("active");
      const val = badge.dataset.c;
      if (val === "__custom__") {
        noteArea.classList.add("show");
        currentComment = noteArea.value.trim();
        commentDisplay.textContent = "Custom";
        noteArea.focus();
      } else {
        noteArea.classList.remove("show");
        currentComment = val;
        commentDisplay.textContent = val === "" ? "None" : val;
        chrome.storage.local.set({ comment: currentComment });
      }
    });
  });

  noteArea.addEventListener("input", () => {
    currentComment = noteArea.value.trim();
    counterHint.textContent = `${noteArea.value.length} / 250`;
    commentDisplay.textContent = currentComment || "Custom";
    chrome.storage.local.set({ comment: currentComment, customNote: noteArea.value });
  });

  // ── Button handlers ───────────────────────────────────────────────────────
  fillBtn.addEventListener("click",  doFill);
  batchBtn.addEventListener("click", doBatch);
  scanBtn.addEventListener("click",  runPageScan);

  // ── Single-form fill ──────────────────────────────────────────────────────
  async function doFill() {
    setBusy(true, "Filling form…");
    clearMessage();

    const tab = await getActiveTab();
    if (!tab) { setBusy(false); showMessage("err", "❌ No active tab found."); return; }

    const res = await dispatchMsg(tab.id, { action: "fill", stars: currentRating, note: currentComment });
    setBusy(false);

    if (!res) {
      showMessage("err", "❌ Could not reach the VTOP page.\nTry refreshing VTOP and clicking again.");
      return;
    }

    if (res.starsSet > 0) {
      qStat.textContent = res.starsSet;
      rStat.textContent = `${currentRating}★`;
      showMessage("ok",
        `✅ Filled ${res.starsSet} question(s) with ${currentRating} stars` +
        (res.notesSet > 0 ? `\n📝 Comment added to ${res.notesSet} text box(es)` : "")
      );
      setStrip("green", `${res.starsSet} question(s) filled — ${res.label}`);
    } else {
      showMessage("warn", "⚠️ No rating fields were found on this page.\nNavigate to a feedback form on VTOP first.");
    }
  }

  // ── Batch fill ────────────────────────────────────────────────────────────
  async function doBatch() {
    setBusy(true, "Scanning for pending forms…");
    clearMessage();

    const tab = await getActiveTab();
    if (!tab) { setBusy(false); showMessage("err", "❌ No active tab found."); return; }

    await ensureScript(tab.id);
    const scan  = await dispatchMsg(tab.id, { action: "scan" }, 5000);
    const total = scan?.pendingForms ?? 0;

    if (!total) {
      setBusy(false);
      showMessage("warn",
        "⚠️ No pending POST buttons found.\nGo to the feedback listing page (where all course rows show a 'Post' button)."
      );
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: "batch", stars: currentRating, note: currentComment });

    setBusy(false);
    pStat.textContent = total;
    setStrip("blue", `Batch running — ${total} course(s) queued`);
    showMessage("warn",
      `🚀 Batch started for ${total} course(s).\n\n` +
      `After each form is filled:\n` +
      `  🔔 A chime plays + an overlay appears\n` +
      `  👁  Review the stars carefully\n` +
      `  ✅ Click "I REVIEWED — SUBMIT NOW"\n\n` +
      `The extension then moves to the next course automatically.`
    );
  }

  // ── Page scan ─────────────────────────────────────────────────────────────
  async function runPageScan() {
    setStrip("grey", "Scanning…");
    clearMessage();

    try {
      const tab = await getActiveTab();
      if (!tab) { setStrip("red", "No active tab"); return; }

      const info = await dispatchMsg(tab.id, { action: "scan" });
      if (!info) { setStrip("yellow", "Open a VTOP feedback page first"); return; }

      if (info.isListingPage) {
        pStat.textContent = info.pendingForms;
        qStat.textContent = "—";
        setStrip("blue", `${info.pendingForms} pending form(s) — use 🚀 BATCH FILL`);
        batchBtn.classList.add("primary");
        fillBtn.classList.remove("primary");
      } else if (info.hasFeedback) {
        qStat.textContent = info.ratingCount;
        pStat.textContent = "—";
        const label = info.formNames[0] || "Feedback Form";
        setStrip("green", `${info.ratingCount} rating question(s) — ${label}`);
        fillBtn.classList.add("primary");
        batchBtn.classList.remove("primary");
      } else {
        setStrip("yellow", "No feedback form detected on current page");
        fillBtn.classList.add("primary");
        batchBtn.classList.remove("primary");
      }
    } catch (err) {
      console.warn("[VFF] Scan error:", err.message);
      setStrip("yellow", "Open a VTOP feedback page first");
    }
  }

  // ── UI restore helpers ────────────────────────────────────────────────────

  function restoreRatingUI(rating) {
    starBadges.forEach(b => {
      const match = parseInt(b.dataset.v, 10) === rating;
      b.classList.toggle("active", match);
    });
    ratingDisplay.textContent = `${rating} Star${rating > 1 ? "s" : ""}`;
  }

  function restoreCommentUI(comment, customNote) {
    if (comment === "__custom__" || (comment && !["", "Good", "Excellent", "Very Good", "Satisfactory"].includes(comment))) {
      commentBadges.forEach(b => b.classList.toggle("active", b.dataset.c === "__custom__"));
      noteArea.value = customNote || comment;
      noteArea.classList.add("show");
      counterHint.textContent = `${noteArea.value.length} / 250`;
      commentDisplay.textContent = noteArea.value.trim() || "Custom";
      currentComment = noteArea.value.trim();
    } else {
      commentBadges.forEach(b => b.classList.toggle("active", b.dataset.c === comment));
      commentDisplay.textContent = comment === "" ? "None" : comment;
    }
  }

  // ── Generic helpers ───────────────────────────────────────────────────────

  function setStrip(kind, text) {
    const map = {
      grey:   ["s-grey",   "dot-grey"],
      yellow: ["s-yellow", "dot-yellow"],
      green:  ["s-green",  "dot-green"],
      blue:   ["s-blue",   "dot-blue"],
      red:    ["s-red",    "dot-red"],
    };
    const [bg, dot] = map[kind] ?? map.grey;
    stripEl.className  = `status-strip ${bg}`;
    stripDot.className = `strip-dot ${dot}`;
    stripText.textContent = text;
  }

  function showMessage(kind, text) {
    msgBox.className  = `msg-box show ${kind}`;
    msgText.textContent = text;
  }

  function clearMessage() {
    msgBox.className  = "msg-box";
    msgText.textContent = "";
  }

  function setBusy(on, text = "Working…") {
    busyBar.className     = on ? "busy-bar show" : "busy-bar";
    busyLabel.textContent = text;
    fillBtn.disabled      = on;
    batchBtn.disabled     = on;
    scanBtn.disabled      = on;
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  }

  async function ensureScript(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "scan" });
    } catch (err) {
      console.warn("[VFF] Content script not ready, injecting:", err.message);
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await new Promise(r => setTimeout(r, INJECT_SETTLE_MS));
    }
  }

  async function dispatchMsg(tabId, payload, timeout = 15000) {
    try {
      return await Promise.race([
        chrome.tabs.sendMessage(tabId, payload),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeout)),
      ]);
    } catch (e) {
      if (e.message === "timeout") return null;
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
        await new Promise(r => setTimeout(r, INJECT_SETTLE_MS));
        return await chrome.tabs.sendMessage(tabId, payload);
      } catch (injectErr) {
        console.warn("[VFF] Script injection failed:", injectErr.message);
        return null;
      }
    }
  }
});

