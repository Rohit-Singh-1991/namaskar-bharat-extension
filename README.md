# Namaskar Bharat Form Assistant (Chrome / Edge, Manifest V3)

A user-triggered helper that transfers a Namaskar Bharat application into the extension and attempts to populate matching fields on approved official portal hosts. It also includes a reusable, editable personal profile stored locally in the browser. Autofill is heuristic and not a guarantee of compatibility.

## Install / update

1. Download this repository as ZIP and extract it.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json` (or click **Reload** on the existing extension).
5. Refresh the Namaskar Bharat application tab and official portal tab.

## Save and use personal data

1. Open the extension popup and click **Manage / customize personal data**.
2. Add or edit field labels and values (for example, Full name, Mobile number, Email, PAN, Address, or a custom field).
3. Click **Save personal data**. The profile is stored in this browser's extension storage.
4. On a supported official HTTPS portal, open the extension and click **Fill personal profile on this page**.
5. Review every populated field. Unmatched fields are shown in the popup. Edit the profile labels to better match portal wording when needed.
6. Use **Clear all personal data** in the manager to remove the profile. This is a local reusable profile, not an automatic fetch/scrape of information from arbitrary websites.

## Test a prepared application

1. Open `https://namaskarbharat.shop/` and sign in.
2. Open a service/application, complete its guided form, and go to **Review your details**.
3. Click **Open [portal]**. On the Namaskar Bharat application page, click **Send saved details to Form Assistant**.
4. Switch to the official portal tab and open the extension popup.
5. Click **Fill prepared application** and review the result.
6. Repeat with other service cards. The shared matcher is in `portal-fill.js`; reusable profile matching is in `profile-fill.js`.

## Approved portal roots

The current host allowlist includes UIDAI, GST, Udyam, ECI Voter Services, NSDL, UTIITSL, FSSAI, Parivahan, Passport Seva, Income Tax, MCA, EPFO, e-Shram, GeM, Startup India, ICEGATE, DGFT, CRS and India.gov.in subdomains. Review `manifest.json` for exact match patterns. Arbitrary websites are not granted access.

## Guardrails / limitations

- Udyam is the only portal with specialized aliases and OTP-request assistance. Other listed portals use shared/common aliases and may need tuning.
- OTP values are never read, stored or auto-entered. OTP-request assistance is user-confirmed and limited to Udyam.
- No CAPTCHA, payment, consent/declaration, verification or final-submission automation.
- Profile and prepared form data are stored locally in this browser extension; the extension does not send them to a remote server. Browser extension storage is not an encrypted password vault.
- Never store passwords, OTPs, or payment credentials. Start with dummy/test values; avoid real Aadhaar, PAN or bank details for initial testing.
- Government portals may change markup, use embedded frames/custom widgets, or require manual entry. Always review before continuing.

## Clear saved data

Use **Delete saved application** in the popup to remove the prepared application. Use **Manage / customize personal data → Clear all personal data** to remove the reusable profile.
