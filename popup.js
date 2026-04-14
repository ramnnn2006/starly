// VIT Feedback Filler — Popup Script

// Delay after injecting content.js before sending a message
const SCRIPT_INJECTION_DELAY_MS = 350;

document.addEventListener("DOMContentLoaded", async () => {

  // ── State ────────────────────────────────────────────────────────────────
  let selectedStars   = 5;
  let selectedComment = "";

  // ── Element refs ─────────────────────────────────────────────────────────
  const pill      = document.getElementById("pill");
  const pillDot   = document.getElementById("pillDot");
  const pillText  = document.getElementById("pillText");
  const statQ     = document.getElementById("statQ");
  const statR     = document.getElementById("statR");
  const statP     = document.getElementById("statP");
  const loader    = document.getElementById("loader");
  const loaderTxt = document.getElementById("loaderText");
  const statusBox = document.getElementById("statusBox");
  const statusTxt = document.getElementById("statusText");
  const fillBtn   = document.getElementById("fillBtn");
  const batchBtn  = document.getElementById("batchBtn");
  const scanBtn   = document.getElementById("scanBtn");

  const ratingHead  = document.getElementById("ratingHead");
  const ratingPanel = document.getElementById("ratingPanel");
  const ratingChev  = document.getElementById("ratingChev");
  const ratingVal   = document.getElementById("ratingVal");
  const commentHead  = document.getElementById("commentHead");
  const commentPanel = document.getElementById("commentPanel");
  const commentChev  = document.getElementById("commentChev");
  const commentVal   = document.getElementById("commentVal");

  const starChips    = document.querySelectorAll("[data-v]");
  const commentChips = document.querySelectorAll("[data-c]");
  const customTa     = document.getElementById("customTa");
  const charHint     = document.getElementById("charHint");

  // ── Initialise ───────────────────────────────────────────────────────────
  await runScan();

  // ── Expanders ────────────────────────────────────────────────────────────
  ratingHead.addEventListener("click", () => {
    const opened = ratingPanel.classList.toggle("open");
    ratingChev.textContent = opened ? "⌃" : "›";
    if (opened) { commentPanel.classList.remove("open"); commentChev.textContent = "›"; }
  });

  commentHead.addEventListener("click", () => {
    const opened = commentPanel.classList.toggle("open");
    commentChev.textContent = opened ? "⌃" : "›";
    if (opened) { ratingPanel.classList.remove("open"); ratingChev.textContent = "›"; }
  });

  // ── Star chips ────────────────────────────────────────────────────────────
  starChips.forEach(chip => {
    chip.addEventListener("click", () => {
      selectedStars = parseInt(chip.dataset.v, 10);
      starChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      ratingVal.textContent = `${selectedStars} Star${selectedStars > 1 ? "s" : ""}`;
      statR.textContent = `${selectedStars}★`;
      clearStatus();
    });
  });

  // ── Comment chips ─────────────────────────────────────────────────────────
  commentChips.forEach(chip => {
    chip.addEventListener("click", () => {
      commentChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const val = chip.dataset.c;
      if (val === "__custom__") {
        customTa.classList.add("show");
        selectedComment = customTa.value.trim();
        commentVal.textContent = "Custom";
        customTa.focus();
      } else {
        customTa.classList.remove("show");
        selectedComment = val;
        commentVal.textContent = val === "" ? "None" : val;
      }
    });
  });

  customTa.addEventListener("input", () => {
    selectedComment = customTa.value.trim();
    charHint.textContent = `${customTa.value.length} / 250`;
    commentVal.textContent = selectedComment || "Custom";
  });

  // ── Button handlers ───────────────────────────────────────────────────────
  fillBtn.addEventListener("click",  doFill);
  batchBtn.addEventListener("click", doBatch);
  scanBtn.addEventListener("click",  runScan);

  // ── Auto-fill single form ─────────────────────────────────────────────────
  async function doFill() {
    setLoading(true, "Filling form…");
    clearStatus();

    const tab = await activeTab();
    if (!tab) { setLoading(false); showStatus("err", "❌ No active tab found."); return; }

    const res = await sendMsg(tab.id, { action: "fill", stars: selectedStars, note: selectedComment });
    setLoading(false);

    if (!res) {
      showStatus("err", "❌ Could not reach the VTOP page.\nTry refreshing VTOP and clicking again.");
      return;
    }

    if (res.starsSet > 0) {
      statQ.textContent = res.starsSet;
      statR.textContent = `${selectedStars}★`;
      showStatus("ok",
        `✅ Filled ${res.starsSet} question(s) with ${selectedStars} stars` +
        (res.notesSet > 0 ? `\n📝 Comment added to ${res.notesSet} text box(es)` : "")
      );
      setPill("green", `${res.starsSet} question(s) filled — ${res.label}`);
    } else {
      showStatus("warn", "⚠️ No rating fields were found on this page.\nNavigate to a feedback form on VTOP first.");
    }
  }

  // ── Batch mode ────────────────────────────────────────────────────────────
  async function doBatch() {
    setLoading(true, "Scanning for pending forms…");
    clearStatus();

    const tab = await activeTab();
    if (!tab) { setLoading(false); showStatus("err", "❌ No active tab found."); return; }

    await injectScript(tab.id);
    const scan = await sendMsg(tab.id, { action: "scan" }, 5000);
    const total = scan?.pendingForms ?? 0;

    if (!total) {
      setLoading(false);
      showStatus("warn",
        "⚠️ No pending POST buttons found.\nGo to the feedback listing page (where all course rows show a 'Post' button)."
      );
      return;
    }

    // Send batch command — don't await (it runs on VTOP tab independently)
    chrome.tabs.sendMessage(tab.id, { action: "batch", stars: selectedStars, note: selectedComment });

    setLoading(false);
    statP.textContent = total;
    setPill("blue", `Batch running — ${total} course(s) queued`);
    showStatus("warn",
      `🚀 Batch started for ${total} course(s).\n\n` +
      `After each form is filled:\n` +
      `  🔔 A chime plays + an overlay appears\n` +
      `  👁  Review the stars carefully\n` +
      `  ✅ Click "I REVIEWED — SUBMIT NOW"\n\n` +
      `The extension then moves to the next course automatically.`
    );
  }

  // ── Scan page ─────────────────────────────────────────────────────────────
  async function runScan() {
    setPill("grey", "Scanning…");
    clearStatus();

    try {
      const tab = await activeTab();
      if (!tab) { setPill("red", "No active tab"); return; }

      const info = await sendMsg(tab.id, { action: "scan" });
      if (!info) { setPill("yellow", "Open a VTOP feedback page first"); return; }

      if (info.isListingPage) {
        statP.textContent = info.pendingForms;
        statQ.textContent = "—";
        setPill("blue", `${info.pendingForms} pending form(s) — use 🚀 BATCH FILL`);
        batchBtn.classList.add("primary");
        fillBtn.classList.remove("primary");
      } else if (info.hasFeedback) {
        statQ.textContent = info.ratingCount;
        statP.textContent = "—";
        const label = info.formNames[0] || "Feedback Form";
        setPill("green", `${info.ratingCount} rating question(s) — ${label}`);
        fillBtn.classList.add("primary");
        batchBtn.classList.remove("primary");
      } else {
        setPill("yellow", "No feedback form detected on current page");
        fillBtn.classList.add("primary");
        batchBtn.classList.remove("primary");
      }
    } catch (err) {
      console.warn("[VFF] Scan error:", err.message);
      setPill("yellow", "Open a VTOP feedback page first");
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setPill(type, text) {
    const colorMap = {
      grey: ["grey", "dot-grey"], yellow: ["yellow", "dot-yellow"],
      green: ["green", "dot-green"], blue: ["blue", "dot-blue"],
      red: ["red", "dot-red"],
    };
    const [bg, dot] = colorMap[type] ?? colorMap.grey;
    pill.className = `pill ${bg}`;
    pillDot.className = `pill-dot ${dot}`;
    pillText.textContent = text;
  }

  function showStatus(type, text) {
    statusBox.className = `status-box show ${type}`;
    statusTxt.textContent = text;
  }

  function clearStatus() {
    statusBox.className = "status-box";
    statusTxt.textContent = "";
  }

  function setLoading(on, text = "Working…") {
    loader.className   = on ? "loader show" : "loader";
    loaderTxt.textContent = text;
    fillBtn.disabled   = on;
    batchBtn.disabled  = on;
    scanBtn.disabled   = on;
  }

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  }

  async function injectScript(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, { action: "scan" });
    } catch (err) {
      console.warn("[VFF] Content script not ready, injecting:", err.message);
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await new Promise(r => setTimeout(r, SCRIPT_INJECTION_DELAY_MS));
    }
  }

  async function sendMsg(tabId, payload, timeout = 15000) {
    try {
      return await Promise.race([
        chrome.tabs.sendMessage(tabId, payload),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeout)),
      ]);
    } catch (e) {
      if (e.message === "timeout") return null;
      // Content script may not be injected yet — try injecting then retry
      try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
        await new Promise(r => setTimeout(r, SCRIPT_INJECTION_DELAY_MS));
        return await chrome.tabs.sendMessage(tabId, payload);
      } catch (injectErr) {
        console.warn("[VFF] Script injection failed:", injectErr.message);
        return null;
      }
    }
  }
});
