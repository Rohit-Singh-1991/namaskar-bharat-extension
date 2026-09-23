# Namaskar Bharat Form Assistant (Chrome / Edge, Manifest V3)

A user-triggered helper that transfers the current Namaskar Bharat application into the extension and attempts to populate matching fields on explicitly approved official portal hosts. The shared matcher supports common text, date, number, select, radio and checkbox controls. Each portal may need selector/alias tuning after live testing; this is heuristic autofill, not a guarantee of compatibility.

## Install / update

1. Download this repository as ZIP and extract it.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json` (or click **Reload** on the existing extension).
5. Refresh the Namaskar Bharat application tab and the official portal tab.

## Test any supported application

1. Open `https://namaskarbharat.shop/` and sign in.
2. Open a service/application, complete its guided form, and go to **Review your details**.
3. Click **Open [portal]**. On the Namaskar Bharat application page, click **Send saved details to Form Assistant**.
4. Switch to the official portal tab and open the extension popup.
5. Click **Fill supported fields on this page**. Review every field carefully; use the unmatched-field report to identify gaps.
6. Repeat with other service cards. The same matcher is shared across approved hosts; improvements to matching/event dispatch apply globally. Portal-specific aliases are centralized in `portal-fill.js`.

## Approved portal roots

The current host allowlist includes UIDAI, GST, Udyam, ECI Voter Services, NSDL, UTIITSL, FSSAI, Parivahan, Passport Seva, Income Tax, MCA, EPFO, e-Shram, GeM, Startup India, ICEGATE, DGFT, CRS and India.gov.in subdomains. Only explicitly listed roots are handled by the content script; a listed host may still require portal-specific fixes. Review `manifest.json` for exact match patterns.

## Guardrails / limitations

- Udyam is the only portal with specialized aliases and OTP-request assistance. Other listed portals use shared/common aliases and may need tuning.
- OTP values are never read, stored or auto-entered. OTP-request assistance is user-confirmed and limited to Udyam.
- No CAPTCHA, payment, consent/declaration, verification or final-submission automation.
- No credentials or cookies are read. Form data is stored locally in this browser extension; it is not sent to a remote server by this extension.
- Do not use real Aadhaar, PAN, bank or other sensitive data for initial testing. Start with dummy/test values where the portal permits them.
- Government portals may change their markup, use inaccessible embedded frames, custom widgets, or require manual entry. Always review before continuing.

## Delete locally saved form

Use **Delete saved registration** in the extension popup to remove the prepared form from this browser.
