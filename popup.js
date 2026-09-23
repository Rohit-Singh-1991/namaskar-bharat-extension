const status = document.getElementById("status");
const fill = document.getElementById("fill");
const fillOtp = document.getElementById("fillOtp");
const clear = document.getElementById("clear");

function renderSavedStatus() {
  chrome.storage.local.get(["preparedForm"], ({ preparedForm }) => {
    if (preparedForm?.form) {
      const savedAt = preparedForm.preparedAt ? new Date(preparedForm.preparedAt).toLocaleString() : "unknown time";
      status.textContent = `Saved: ${preparedForm.serviceTitle || preparedForm.serviceId || "Registration"} · ${Object.keys(preparedForm.form).length} fields · ${savedAt}`;
    } else {
      status.textContent = "No saved application. Open a Namaskar Bharat application, prepare its details, and send them to Form Assistant.";
    }
  });
}

renderSavedStatus();

async function sendFillMessage(type) {
  status.textContent = "Checking current page…";
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  // Udyam is the only portal currently registered in manifest.json. Add a portal adapter
  // and its approved host match there to enable the same shared engine on another portal.
  if (!tab?.id || !tab.url?.startsWith("https://udyamregistration.gov.in/")) {
    status.textContent = "This build currently has the Udyam portal adapter enabled. Open the official Udyam registration page first.";
    return;
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type });
    status.textContent = result?.ok
      ? `Filled ${result.filled} matching fields. ${result.notMatched?.length ? `Unmatched: ${result.notMatched.join(", ")}. ` : ""}${result.message}`
      : (result?.message || "Could not fill this page. Reload it and try again.");
  } catch {
    status.textContent = "Reload the official portal after installing/updating the extension, then try again.";
  }
}

fill.addEventListener("click", () => sendFillMessage("NB_FILL_ACTIVE_PORTAL"));
fillOtp.addEventListener("click", () => sendFillMessage("NB_FILL_AND_REQUEST_OTP"));

clear.addEventListener("click", async () => {
  const { preparedForm } = await chrome.storage.local.get(["preparedForm"]);
  if (!preparedForm?.form) {
    status.textContent = "No saved application to delete.";
    return;
  }

  const registration = preparedForm.serviceTitle || preparedForm.serviceId || "saved application";
  const confirmed = confirm(`Delete ${registration} from this browser? This cannot be undone.`);
  if (!confirmed) {
    status.textContent = "Deletion cancelled.";
    return;
  }

  await chrome.storage.local.remove("preparedForm");
  status.textContent = "Saved application deleted from this browser.";
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.preparedForm) renderSavedStatus();
});
