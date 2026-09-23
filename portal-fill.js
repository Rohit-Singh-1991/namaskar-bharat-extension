/* Shared portal-fill engine. Add per-portal aliases to ADAPTERS; matching and event dispatch stay centralized. */
(() => {
  const HOST = location.hostname.toLowerCase().replace(/^www\./, "");

  // Portal-specific aliases belong here. Every adapter uses the same generic matcher below,
  // so improvements to labels, React/Vue inputs, selects, and event dispatch benefit all portals.
  const ADAPTERS = {
    "udyamregistration.gov.in": {
      aliases: {
        aadhaar: ["aadhaarnumber", "aadhaarno", "aadhaar", "uid"],
        full_name: ["nameofentrepreneur", "nameasperaadhaar", "entrepreneurname", "fullname"],
        legal_name: ["nameofenterprise", "enterprisename"],
        constitution: ["organisationtype", "organizationtype"],
        social_category: ["socialcategory"],
        specially_abled: ["speciallyabled", "divyangjan"],
        pan: ["pan", "pannumber"],
        gstin: ["gstin", "gstnumber"],
        commencement_date: ["dateofcommencement", "commencementdate"],
        incorporation_date: ["dateofincorporation", "incorporationdate"],
        major_activity: ["majoractivity"],
        enterprise_type: ["typeofenterprise", "enterprisetype"],
        employees: ["totalnumberofworkers", "numberofemployees", "employees"],
        investment: ["investment", "plantmachinery"],
        turnover: ["turnover", "annualturnover"],
        mobile: ["mobile", "mobilenumber"],
        email: ["email", "emailid"],
        bank_account: ["bankaccount", "accountnumber"],
        ifsc: ["ifsc", "ifsccode"],
        address_line1: ["flatdoorblockno", "addressline1", "house", "building"],
        address_line2: ["nameofpremises", "roadstreetlane", "area", "locality"],
        city: ["city"],
        district: ["district"],
        state: ["state", "stateut"],
        pincode: ["pin", "pincode", "postalcode"],
        unit_name: ["unitname", "plantname"],
        unit_address: ["unitaddress", "plantaddress"],
        nic_code: ["niccode", "nic"]
      }
    }
  };

  const adapter = ADAPTERS[HOST];
  if (!adapter) return; // Never run on arbitrary sites. Register approved portal hosts above.

  const clean = (v) => String(v ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

  const describe = (el) => {
    const id = el.id || "";
    const labels = el.labels ? [...el.labels].map((label) => label.textContent || "") : [];
    const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || "" : "";
    const wrappingLabel = el.closest("label")?.textContent || "";
    const describedBy = (el.getAttribute("aria-describedby") || "").split(/\s+/)
      .map((id) => id && document.getElementById(id)?.textContent || "").join(" ");
    return [id, el.name, el.getAttribute("aria-label"), el.getAttribute("data-field"),
      el.getAttribute("data-testid"), el.placeholder, explicitLabel, wrappingLabel,
      describedBy, ...labels].filter(Boolean).map(clean);
  };

  const aliasesFor = (field) => {
    const configured = adapter.aliases[field] || [];
    // Canonical form key fallback means newly added service fields can use the shared engine
    // without duplicating a selector map. Portal-specific aliases override/extend this key.
    return [...new Set([...configured, field].map(clean).filter((value) => value.length >= 3))];
  };

  const findTarget = (controls, field) => {
    const aliases = aliasesFor(field);
    if (!aliases.length) return null;
    let best = null;
    let bestScore = 0;
    for (const el of controls) {
      if (!visible(el) || el.disabled || el.readOnly || el.type === "hidden") continue;
      const keys = describe(el);
      let score = 0;
      for (const key of keys) {
        for (const alias of aliases) {
          if (key === alias) score = Math.max(score, 100 + alias.length);
          else if (alias.length >= 5 && key.includes(alias)) score = Math.max(score, 50 + alias.length);
          else if (key.length >= 5 && alias.length >= 5 && alias.includes(key)) score = Math.max(score, 20 + key.length);
        }
      }
      if (score > bestScore) { best = el; bestScore = score; }
    }
    return best;
  };

  const setNativeValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, String(value)); else el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };

  const setValue = (el, value) => {
    if (!el || value === "" || value == null || el.disabled || el.readOnly) return false;

    if (el instanceof HTMLSelectElement) {
      const wanted = clean(value);
      const option = [...el.options].find((o) => {
        const text = clean(o.textContent), val = clean(o.value);
        return text === wanted || val === wanted || (wanted.length >= 3 && (text.includes(wanted) || val.includes(wanted)));
      });
      if (!option) return false;
      el.value = option.value;
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return true;
    }

    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
    if (["password", "file", "hidden", "submit", "button", "reset"].includes(el.type)) return false;
    if (el.type === "checkbox" || el.type === "radio") {
      const wanted = clean(value);
      if (wanted !== clean(el.value) && wanted !== "true" && wanted !== "yes") return false;
      el.checked = true;
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      return true;
    }
    setNativeValue(el, value);
    return true;
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!["NB_FILL_ACTIVE_PORTAL", "NB_FILL_AND_REQUEST_OTP"].includes(message?.type)) return;

    chrome.storage.local.get(["preparedForm"], ({ preparedForm }) => {
      if (!preparedForm?.form) {
        sendResponse({ ok: false, message: "No prepared application. Return to Namaskar Bharat, prepare the saved details, and send them to the extension first." });
        return;
      }

      let filled = 0;
      const matched = {};
      const notMatched = [];
      const controls = [...document.querySelectorAll("input,select,textarea")];

      for (const [field, value] of Object.entries(preparedForm.form)) {
        if (value === "" || value == null) continue;
        const target = findTarget(controls, field);
        if (setValue(target, value)) {
          filled++;
          matched[field] = target;
        } else {
          notMatched.push(field);
        }
      }

      if (message.type === "NB_FILL_AND_REQUEST_OTP") {
        if (!matched.aadhaar || !matched.full_name) {
          sendResponse({ ok: true, filled, notMatched, message: "Fields filled where matched, but Aadhaar and name were not both matched. Review/fill them manually; OTP was not requested." });
          return;
        }

        const buttons = [...document.querySelectorAll("button,input[type=button],input[type=submit]")];
        const otpButton = buttons.find((el) => {
          if (el.disabled) return false;
          const text = clean(el.innerText || el.value || el.getAttribute("aria-label"));
          return text.includes("generateotp") || text.includes("validateandgenerateotp") || text.includes("getotp");
        });

        if (!otpButton) {
          sendResponse({ ok: true, filled, notMatched, message: "Aadhaar/name fields filled, but a recognizable OTP-request button was not found. Review the page and click its OTP button manually." });
          return;
        }

        const proceed = confirm("Namaskar Bharat filled the Aadhaar and name fields. Request an Aadhaar OTP from the official portal now? The OTP itself remains private and must be entered by you.");
        if (!proceed) {
          sendResponse({ ok: true, filled, notMatched, message: "Fields filled. OTP request cancelled; no OTP was requested." });
          return;
        }

        otpButton.click();
        sendResponse({ ok: true, filled, notMatched, message: "OTP request button clicked after your confirmation. Retrieve the OTP on your registered device and enter it yourself." });
        return;
      }

      sendResponse({ ok: true, filled, notMatched, message: `Review all populated fields on ${HOST}. Verification and submission remain manual.` });
    });
    return true;
  });
})();
