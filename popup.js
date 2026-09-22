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
      status.textContent = "No saved registration. In NamaskarBhar, click Open Udyam portal, then Send saved details to Form Assistant.";
    }
  });
}

renderSavedStatus();

async function sendFillMessage(type) {
  status.textContent = "Checking current page…";
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://udyamregistration.gov.in/")) {
    status.textContent = "This release supports Udyam only. Open the official Udyam registration page first.";
    return;
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type });
    status.textContent = result?.ok
      ? `Filled ${result.filled} matching fields. ${result.notMatched?.length ? `Unmatched: ${result.notMatched.join(", ")}. ` : ""}${result.message}`
      : (result?.message || "Could not fill this page. Reload it and try again.");
  } catch {
    status.textContent = "Reload the Udyam page after installing/updating the extension, then try again.";
  }
}

fill.addEventListener("click", () => sendFillMessage("NB_FILL_ACTIVE_PORTAL"));
fillOtp.addEventListener("click", () => sendFillMessage("NB_FILL_AND_REQUEST_OTP"));

clear.addEventListener("click", async () => {
  const { preparedForm } = await chrome.storage.local.get(["preparedForm"]);
  if (!preparedForm?.form) {
    status.textContent = "No saved registration to delete.";
    return;
  }

  const registration = preparedForm.serviceTitle || preparedForm.serviceId || "saved registration";
  const confirmed = confirm(`Delete ${registration} from this browser? This cannot be undone.`);
  if (!confirmed) {
    status.textContent = "Deletion cancelled.";
    return;
  }

  await chrome.storage.local.remove("preparedForm");
  status.textContent = "Saved registration deleted from this browser.";
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.preparedForm) renderSavedStatus();
});
