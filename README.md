# VIT Feedback Filler — Chrome Extension

> Automatically fills VIT VTOP end-semester feedback star ratings with safe batch mode.
> You always control the final Submit click — the extension never submits on your behalf.

---

## Features

- ⭐ **Star fill** — choose 1–5 stars and fill every rating question in one click
- 💬 **Comment presets** — pick a preset (Good, Excellent, Very Good…) or type a custom comment
- 🚀 **Safe Batch Mode** — navigates each pending course, fills the form, plays a chime, shows a review overlay, then waits for you to manually submit before proceeding
- 🔒 **Never auto-submits** — you always review and click Submit yourself
- 🎨 **Neobrutalism UI** — bold, high-contrast, minimal design

---

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the repository folder (where `manifest.json` lives)
6. The **VIT Feedback Filler** star icon appears in your toolbar

---

## How to Use

### Fill a Single Form
1. Log in to `vtop.vit.ac.in`
2. Open any feedback form by clicking **Post** on a course
3. Click the extension icon
4. Select your star rating and an optional comment
5. Click **⚡ AUTO-FILL** — review the form — then click **Submit** on VTOP

### Batch Fill All Courses
1. Go to the main feedback listing page (where all course rows have a **Post** button)
2. Click the extension icon — it detects pending forms and shows the count
3. Select your star rating and optional comment
4. Click **🚀 BATCH FILL**
5. For each course the extension will:
   - Click **Post** and wait for the form to load
   - Fill all star ratings (and comments if set)
   - Play a chime 🔔 and show a review overlay
   - Wait for you to verify and click **"I REVIEWED — SUBMIT NOW"**
   - Automatically advance to the next course after your submission

---

## Supported Form Types

| Form ID | Type |
|---|---|
| `CourseFeedbackPerceptionCurr` | Curriculum & Syllabus |
| `CourseFeedbackPerception` | Course / Faculty |
| `CourseOutcomeFeedbackPerception` | Course Outcome |
| `GeneralFeedbackPerception` | General Feedback |

---

## ⚠️ Important

Feedback submission is **mandatory** for FFCS slot registration.
Always verify your answers before submitting — incorrect or missing feedback can affect your schedule.
This extension is a time-saving tool; you are fully responsible for the final Submit.

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome extension manifest (v3) |
| `content.js` | Page script — finds fields, fills ratings, shows overlay |
| `popup.html` | Extension popup — neobrutalism UI |
| `popup.js` | Popup controller |
| `icons/` | 16 × 16, 48 × 48, 128 × 128 PNG icons |
