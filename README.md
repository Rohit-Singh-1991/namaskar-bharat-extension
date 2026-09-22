# NamaskarBhar Form Assistant (Chrome / Edge, Manifest V3)

This is a user-controlled extension. **Udyam is the only portal adapter currently enabled.**

## Install

1. Download this repository as ZIP and extract it.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Pin **NamaskarBhar Form Assistant**.

## Udyam workflow

1. In NamaskarBhar, complete the Udyam guided form through **Review your details**.
2. Click **Open Udyam portal**.
3. On the NamaskarBhar page, click **Send saved details to Form Assistant**.
4. Open the extension popup and use **Fill supported fields on this page** on the official Udyam portal.
5. Review all populated fields and continue manually.
6. OTP, CAPTCHA, consent/declarations, payment, verification and final submission remain user-controlled.

## Delete saved registration

The extension keeps the prepared form in `chrome.storage.local` on this browser only. Use **Delete saved registration** in the extension popup to permanently remove that locally saved prepared form.

## Guardrails

- OTP values are never read, stored or auto-entered.
- No CAPTCHA, payment, consent/declaration or final submission automation.
- No credentials or cookies are read.
- No application data is sent to a remote server.
- Udyam selectors are heuristic and should be reviewed on the live portal.

## Supported app origins

- `https://namaskarbhar.shop`
- `https://indian-docs-desk.vercel.app`
