const fieldsEl = document.getElementById('fields');
const statusEl = document.getElementById('status');
function addRow(key = '', value = '') {
  const row = document.createElement('div'); row.className = 'entry';
  const keyInput = document.createElement('input'); keyInput.placeholder = 'Field label (e.g. Full name)'; keyInput.value = key; keyInput.setAttribute('aria-label','Field label');
  const valueInput = document.createElement('input'); valueInput.placeholder = 'Your value'; valueInput.value = value; valueInput.setAttribute('aria-label','Your value'); valueInput.type = 'text';
  const remove = document.createElement('button'); remove.className = 'btn danger'; remove.textContent = 'Remove'; remove.type = 'button'; remove.onclick = () => row.remove();
  row.append(keyInput, valueInput, remove); fieldsEl.append(row);
}
function load() { chrome.storage.local.get(['personalProfile'], ({personalProfile}) => { fieldsEl.replaceChildren(); const profile = personalProfile && typeof personalProfile === 'object' ? personalProfile : {}; Object.entries(profile).forEach(([k,v]) => addRow(k, String(v ?? ''))); if (!fieldsEl.children.length) ['Full name','Mobile number','Email','Date of birth','Gender','Address','City','State','PIN code','PAN'].forEach(k => addRow(k,'')); }); }
document.getElementById('add').onclick = () => addRow();
document.getElementById('save').onclick = async () => { const profile = {}; for (const row of fieldsEl.children) { const [k,v] = row.querySelectorAll('input'); const key = k.value.trim(), value = v.value.trim(); if (key && value) profile[key] = value; } await chrome.storage.local.set({personalProfile: profile}); statusEl.textContent = `Saved ${Object.keys(profile).length} personal fields locally in this browser.`; };
document.getElementById('clear').onclick = async () => { if (!confirm('Permanently remove your saved personal profile from this browser?')) return; await chrome.storage.local.remove('personalProfile'); fieldsEl.replaceChildren(); statusEl.textContent = 'Personal profile cleared.'; };
load();