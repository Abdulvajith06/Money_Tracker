
# Friendsy Money Tracker (PWA)

A Friends-inspired, voice-based money tracker with:
- Interactive, animated background
- Voice input (Web Speech API) and spoken playback (Speech Synthesis)
- Offline-ready PWA (manifest + service worker)
- "Export to Excel (.csv)" — opens cleanly in Excel
- Installable on desktop and mobile

## Quick Start
1. Unzip and host the folder with any static server (e.g., `python -m http.server`).
2. Open in Chrome/Edge. You'll see an **Install** button when PWA criteria are met.
3. Try the mic button and say:
   - `add expense 200 for coffee`
   - `add income 5000 salary`
   - `delete last`
   - `summary`

## Notes
- Voice recognition uses the Web Speech API (works best in Chromium-based browsers).
- Data persists in `localStorage` on the device.
- The export is CSV, which opens directly in Microsoft Excel, Google Sheets, and Numbers.
