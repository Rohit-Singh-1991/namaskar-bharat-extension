/* Portal adapter registry. Udyam is the only enabled adapter. */
(() => {
  const HOST = location.hostname.toLowerCase();
  const ADAPTERS = {
    "udyamregistration.gov.in": {
      aliases: {
        aadhaar: ["aadhaarnumber","aadhaarno","aadhaar","uid"],
        full_name: ["nameofentrepreneur","nameasperaadhaar","entrepreneurname","fullname"],
        legal_name: ["nameofenterprise","enterprisename"],
        constitution: ["organisationtype","organizationtype"],
        social_category: ["socialcategory"],
        specially_abled: ["speciallyabled","divyangjan"],
        pan: ["pan","pannumber"],
        gstin: ["gstin","gstnumber"],
        commencement_date: ["dateofcommencement","commencementdate"],
        incorporation_date: ["dateofincorporation","incorporationdate"],
        major_activity: ["majoractivity"],
        enterprise_type: ["typeofenterprise","enterprisetype"],
        employees: ["totalnumberofworkers","numberofemployees","employees"],
        investment: ["investment","plantmachinery"],
        turnover: ["turnover","annualturnover"],
        mobile: ["mobile","mobilenumber"],
        email: ["email","emailid"],
        bank_account: ["bankaccount","accountnumber"],
        ifsc: ["ifsc","ifsccode"],
        address_line1: ["flatdoorblockno","addressline1","house","building"],
        address_line2: ["nameofpremises","roadstreetlane","area","locality"],
        city: ["city"],
        district: ["district"],
        state: ["state","stateut"],
        pincode: ["pin","pincode","postalcode"],
        unit_name: ["unitname","plantname"],
        unit_address: ["unitaddress","plantaddress"],
        nic_code: ["niccode","nic"]
      }
    }
  };

  const adapter = ADAPTERS[HOST];
  if (!adapter) return;
  const clean = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const describe = (el) => {
    const id = el.id || "";
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent || "" : "";
    const wrappingLabel = el.closest("label")?.textContent || "";
    return [id, el.name, el.getAttribute("aria-label"), el.placeholder, label, wrappingLabel]
      .filter(Boolean).map(clean);
  };

  const setValue = (el, value) => {
    if (!el || value === "" || value == null || el.disabled || el.readOnly) return false;

    if (el instanceof HTMLSelectElement) {
      const wanted = clean(value);
      const option = [...el.options].find(o => {
        const text = clean(o.textContent), val = clean(o.value);
        return text === wanted || val === wanted || (text && wanted && (text.includes(wanted) || wanted.includes(text)));
      });
      if (!option) return false;
      el.value = option.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
    if (["password", "file", "hidden"].includes(el.type)) return false;

    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, String(value));
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (![ "NB_FILL_ACTIVE_PORTAL", "NB_FILL_AND_REQUEST_OTP" ].includes(message?.type)) return;

    chrome.storage.local.get(["preparedForm"], ({ preparedForm }) => {
      if (!preparedForm?.form) {
        sendResponse({ ok: false, message: "No prepared form. Return to NamaskarBhar and send the saved details first." });
        return;
      }

      let filled = 0;
      const matched = {};
      const notMatched = [];
      const controls = [...document.querySelectorAll("input,select,textarea")];

      for (const [field, value] of Object.entries(preparedForm.form)) {
        const aliases = (adapter.aliases[field] || []).map(clean);
        if (!aliases.length || value === "") continue;
        const target = controls.find(el => describe(el).some(key => aliases.some(a => key === a || key.includes(a))));
        if (setValue(target, value)) {
          filled++;
          matched[field] = target;
        } else {
          notMatched.push(field);
        }
      }

      if (message.type === "NB_FILL_AND_REQUEST_OTP") {
        if (!matched.aadhaar || !matched.full_name) {
          sendResponse({
            ok: true, filled, notMatched,
            message: "Fields filled where matched, but Aadhaar and name were not both matched. Review/fill them manually; OTP was not requested."
          });
          return;
        }

        const buttons = [...document.querySelectorAll("button,input[type=button],input[type=submit]")];
        const otpButton = buttons.find(el => {
          if (el.disabled) return false;
          const text = clean(el.innerText || el.value || el.getAttribute("aria-label"));
          return text.includes("generateotp") || text.includes("validateandgenerateotp") || text.includes("getotp");
        });

        if (!otpButton) {
          sendResponse({
            ok: true, filled, notMatched,
            message: "Aadhaar/name fields filled, but a recognizable OTP-request button was not found. Review the page and click its OTP button manually."
          });
          return;
        }

        const proceed = confirm("NamaskarBhar filled the Aadhaar and name fields. Request an Aadhaar OTP from the official portal now? The OTP itself will remain private and must be entered by you.");
        if (!proceed) {
          sendResponse({ ok: true, filled, notMatched, message: "Fields filled. OTP request cancelled; no OTP was requested." });
          return;
        }

        otpButton.click();
        sendResponse({ ok: true, filled, notMatched, message: "OTP request button clicked after your confirmation. Retrieve the OTP on your registered device and enter it yourself." });
        return;
      }

      sendResponse({ ok: true, filled, notMatched, message: "Review all populated fields. Verification and submission remain manual." });
    });
    return true;
  });
})();
