"use strict";

const STORAGE_KEY_AUTO = "autoGroupEnabled";
const STORAGE_KEY_EXCLUDED = "excludedHosts";

const autoToggle = document.getElementById("auto-group-toggle");
const exclusionForm = document.getElementById("exclusion-form");
const exclusionInput = document.getElementById("exclusion-input");
const exclusionError = document.getElementById("exclusion-error");
const exclusionList = document.getElementById("exclusion-list");
const exclusionEmpty = document.getElementById("exclusion-empty");

function applyI18n() {
  document.documentElement.lang = browser.i18n.getUILanguage();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = browser.i18n.getMessage(key);
    if (msg) el.textContent = msg;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const msg = browser.i18n.getMessage(key);
    if (msg) el.setAttribute("placeholder", msg);
  });
}

function showError(messageKey) {
  exclusionError.textContent = browser.i18n.getMessage(messageKey);
  exclusionError.hidden = false;
}

function clearError() {
  exclusionError.hidden = true;
  exclusionError.textContent = "";
}

function renderExclusions(hosts) {
  exclusionList.innerHTML = "";
  const sorted = [...hosts].sort((a, b) => a.localeCompare(b));

  if (sorted.length === 0) {
    exclusionEmpty.hidden = false;
    return;
  }
  exclusionEmpty.hidden = true;

  const removeLabel = browser.i18n.getMessage("optionsRemoveButtonLabel");
  for (const host of sorted) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = host;
    li.appendChild(span);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.setAttribute("aria-label", `${removeLabel}: ${host}`);
    btn.title = `${removeLabel}: ${host}`;
    btn.addEventListener("click", () => removeExclusion(host));
    li.appendChild(btn);

    exclusionList.appendChild(li);
  }
}

async function getExclusions() {
  const stored = await browser.storage.local.get(STORAGE_KEY_EXCLUDED);
  return Array.isArray(stored[STORAGE_KEY_EXCLUDED]) ? stored[STORAGE_KEY_EXCLUDED] : [];
}

async function setExclusions(hosts) {
  await browser.storage.local.set({ [STORAGE_KEY_EXCLUDED]: hosts });
}

async function addExclusion(rawInput) {
  clearError();
  const host = parseHostInput(rawInput);
  if (!host) {
    showError("optionsInvalidHost");
    return;
  }
  const hosts = await getExclusions();
  if (hosts.includes(host)) {
    showError("optionsDuplicateHost");
    return;
  }
  const updated = [...hosts, host];
  await setExclusions(updated);
  renderExclusions(updated);
  exclusionInput.value = "";
  exclusionInput.focus();
}

async function removeExclusion(host) {
  const hosts = await getExclusions();
  const updated = hosts.filter((h) => h !== host);
  await setExclusions(updated);
  renderExclusions(updated);
}

async function loadAutoToggle() {
  const stored = await browser.storage.local.get(STORAGE_KEY_AUTO);
  autoToggle.checked = stored[STORAGE_KEY_AUTO] !== false; // по умолчанию включено
}

autoToggle.addEventListener("change", () => {
  browser.storage.local.set({ [STORAGE_KEY_AUTO]: autoToggle.checked });
});

exclusionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addExclusion(exclusionInput.value);
});

exclusionInput.addEventListener("input", clearError);

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STORAGE_KEY_EXCLUDED]) {
    renderExclusions(changes[STORAGE_KEY_EXCLUDED].newValue || []);
  }
  if (changes[STORAGE_KEY_AUTO]) {
    autoToggle.checked = changes[STORAGE_KEY_AUTO].newValue !== false;
  }
});

async function init() {
  applyI18n();
  await loadAutoToggle();
  renderExclusions(await getExclusions());
}

init();
