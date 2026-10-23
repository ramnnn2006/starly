<div align="center">

# ⭐ VIT Feedback Filler

### The fastest way to get through VTOP end-semester feedback — without losing control of a single submission.

[![Version](https://img.shields.io/badge/version-1.0-FFDD00?style=for-the-badge&labelColor=000000)](https://github.com/ramnnn2006/feedbackautomation/releases)
[![Manifest](https://img.shields.io/badge/Manifest-V3-00CC44?style=for-the-badge&labelColor=000000)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Platform](https://img.shields.io/badge/Platform-Chrome-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white&labelColor=000000)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/License-MIT-white?style=for-the-badge&labelColor=000000)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge&labelColor=000000)](https://github.com/ramnnn2006/feedbackautomation/pulls)

</div>

---

## 🧠 What is this?

**VIT Feedback Filler** is a Chrome extension for VIT students that automatically fills VTOP end-semester feedback forms with your chosen star rating and optional comment. It has three modes:

| Mode | What it does | Who clicks Submit |
|---|---|---|
| ⚡ **Auto-Fill** | Fills the form that's open right now | You |
| 🚀 **Batch Fill** | Goes through every pending course, pauses on each for review | You (via the overlay) |
| 😴 **Snorlax** | Goes through every pending course, fills **and submits** each one — no stops | The extension |

Built with a clean [Neobrutalism](https://hype4.academy/articles/design/neubrutalism-is-taking-over-web) UI — bold borders, high contrast, zero fluff.

---

## ✨ Features

| Feature | Description |
|---|---|
| ⭐ **Star Fill** | Choose 1–5 stars and instantly fill every rating question on the page |
| 💬 **Comment Presets** | Pick Good / Excellent / Very Good / Satisfactory or write a fully custom comment |
| 🚀 **Safe Batch Mode** | Auto-navigates each pending course, fills the form, plays a chime, then pauses for your manual Submit |
| 😴 **Snorlax Mode** | Fill + submit every pending course in one go; chimes when finished, falls back to the review overlay if a submit doesn't go through |
| 🔔 **Chime + Overlay** | Audio cue and review overlay appear before every submission so you never miss a step |
| 📊 **Live Stats** | Popup shows question count, current rating, and pending course count in real time |
| 🎨 **Neobrutalism UI** | Bold, high-contrast, monospace design — looks great, works better |

---

## 🚀 Installation

> No Chrome Web Store listing yet — load it manually in under a minute.

1. **Clone or download** this repository
   ```bash
   git clone https://github.com/ramnnn2006/feedbackautomation.git
   ```
2. Open Chrome and go to **`chrome://extensions`**
3. Toggle **Developer mode** on (top-right corner)
4. Click **Load unpacked**
5. Select the cloned folder (the one containing `manifest.json`)
6. The ⭐ **VIT Feedback Filler** icon will appear in your Chrome toolbar

---

## 🎮 How to Use

### ⚡ Fill a Single Form

1. Log in to [vtop.vit.ac.in](https://vtop.vit.ac.in)
2. Open any feedback form (click **Post** next to a course)
3. Click the extension icon in the toolbar
4. Choose your ⭐ **star rating**
5. Optionally pick or type a **comment**
6. Hit **⚡ AUTO-FILL**
7. Review the filled form, then click **Submit** on VTOP yourself

### 🚀 Batch Fill All Courses

1. Navigate to the main feedback listing page (where every course has a **Post** button)
2. Click the extension icon — it auto-detects pending forms and shows the count
3. Select your **star rating** and optional **comment**
4. Click **🚀 BATCH FILL**
5. For each course the extension will:
   - Click **Post** and wait for the form to load
   - Fill all star ratings and comments
   - Play a 🔔 chime and show a review overlay
   - Wait for you to click **"I REVIEWED — SUBMIT NOW"**
   - Automatically move to the next course

---

### 😴 Snorlax Mode (fill + submit, no stops)

1. Go to the feedback listing page (or open a single form)
2. Pick your **star rating** and optional **comment**
3. Click **😴 SNORLAX**
4. Every pending course is filled and submitted automatically — a chime plays when it's all done
5. If a submit doesn't go through within 20 seconds, the review overlay appears for that course so you can finish it manually

> ⚠️ Snorlax submits without asking. Double-check your rating and comment **before** you click it.

---

## 📋 Supported Form Types

| Form ID | Type |
|---|---|
| `CourseFeedbackPerceptionCurr` | Curriculum & Syllabus |
| `CourseFeedbackPerception` | Course / Faculty |
| `CourseOutcomeFeedbackPerception` | Course Outcome |
| `GeneralFeedbackPerception` | General Feedback |

---

## 🗂️ Project Structure

```
feedbackautomation/
├── manifest.json      # Chrome Extension Manifest V3
├── content.js         # Injected page script — finds fields, fills ratings, renders overlay
├── popup.html         # Extension popup — Neobrutalism UI (HTML + CSS)
├── popup.js           # Popup controller — wires up all buttons and state
└── icons/
    ├── icon16.png     # 16 × 16 toolbar icon
    ├── icon48.png     # 48 × 48 extension management icon
    └── icon128.png    # 128 × 128 Chrome Web Store icon
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Extension Platform | Chrome Extension **Manifest V3** |
| Permissions | `activeTab`, `scripting`, `storage` |
| Host Match | `https://*.vit.ac.in/*` |
| UI | Vanilla HTML/CSS — Neobrutalism design system |
| Scripting | Vanilla JavaScript (no build step, no dependencies) |

---

## ⚠️ Important Notes

- Feedback submission is **mandatory** for FFCS (Fully Flexible Credit System) slot registration at VIT.
- Always **review your answers** before clicking Submit — incorrect or missing feedback can impact your timetable.
- This extension is a **time-saving utility**. You remain fully responsible for every submission you make.
- This project is **not affiliated with VIT** in any way.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ☕ for VIT students who have better things to do.

</div>
