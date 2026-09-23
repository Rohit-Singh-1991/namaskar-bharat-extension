# Namaskar Bharat Form Assistant (Chrome / Edge, Manifest V3)

A user-controlled extension for transferring prepared Namaskar Bharat application data into supported official registration portals.

**Current coverage:** Udyam is the only official portal adapter enabled in this release. The shared matcher is designed for reuse across registrations, but a portal must be explicitly registered before autofill runs there.

## Install / update

1. Download this repository as ZIP and extract it (or update the existing extracted folder with the latest files).
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`. For an existing install, click **Reload**.
5. Pin **Namaskar Bharat Form Assistant**.
6. Refresh any already-open Namaskar Bharat and official portal tabs.

## Udyam workflow

1. In Namaskar Bharat, complete the Udyam guided form through **Review your details**.
2. Click **Open Udyam portal**.
3. On the Namaskar Bharat application page, click **Send saved details to Form Assistant**.
4. Open the extension popup on the official Udyam tab and choose **Fill supported fields on this page**.
5. Review every populated field and continue manually.
6. OTP, CAPTCHA, consent/declarations, payment, verification and final submission remain user-controlled.

## Shared autofill architecture

- `portal-fill.js` contains the common field discovery, alias matching, select/input value setting, and framework-compatible input/change event dispatch.
- Portal-specific field aliases are centralized in the `ADAPTERS` registry in that file. Add an adapter keyed by the exact official portal hostname to support another portal.
- Add that portal's exact HTTPS origin to the `portal-fill.js` content-script `matches` list in `manifest.json`. Keep the approved-host guard; do not inject the extension on arbitrary sites.
- Generic canonical field-key matching is a fallback; portal-specific aliases should be added for fields whose official labels/IDs differ from the app's keys.
- Test each portal adapter against its live form. Portal markup and multi-step forms can change; unmatched fields must be reviewed and completed manually.

A fix to the shared matcher in `portal-fill.js` benefits every registered adapter. Portal-specific alias/host configuration is still required where government portals use different field names or domains.

## Delete saved registration

The extension keeps the prepared form in `chrome.storage.local` on this browser only. Use **Delete saved application** in the extension popup to permanently remove that locally saved prepared form.

## Guardrails

- OTP values are never read, stored or auto-entered.
- No CAPTCHA, payment, consent/declaration or final submission automation.
- No credentials or cookies are read.
- No application data is sent to a remote server by the extension.
- Autofill is user-triggered. Always review populated values before proceeding.

## Supported app origins

- `https://namaskarbharat.shop` (canonical)
- `https://namaskarbhar.shop` (legacy)
- `https://indian-docs-desk.vercel.app` (legacy deployment)
