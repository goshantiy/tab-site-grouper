"use strict";

/**
 * Расширение группирует вкладки Firefox по сайту (по hostname), используя
 * нативный WebExtensions API tabGroups / tabs.group (Firefox 139+).
 *
 * Функции normalizeHost / extractHostFromUrl / colorForHost определены в
 * common.js, который подключён раньше этого файла (см. manifest.json).
 *
 * Три способа запустить группировку:
 *  1. Автоматически — при завершении загрузки любой вкладки (можно выключить
 *     на странице настроек).
 *  2. Клик по кнопке на панели инструментов — группирует все вкладки
 *     текущего окна.
 *  3. Пункт в контекстном меню — на странице, на вкладке или на самой
 *     кнопке.
 *
 * Настройки (автогруппировка вкл/выкл, список исключений) живут на
 * отдельной странице настроек (options/options.html), а не в контекстном
 * меню — до неё можно дойти через about:addons или через пункт меню
 * «Настройки…» на кнопке расширения.
 */

const STORAGE_KEY_AUTO = "autoGroupEnabled";
const STORAGE_KEY_EXCLUDED = "excludedHosts";
const MENU_GROUP_NOW = "group-now";
const MENU_SEPARATOR = "sep-1";
const MENU_OPTIONS = "open-options";

// Значения по умолчанию, пока настройки не загрузились из storage.
let autoGroupEnabled = true;
let excludedHosts = new Set();

async function findGroupByTitle(windowId, title) {
  const groups = await browser.tabGroups.query({ windowId });
  return groups.find((g) => g.title === title) || null;
}

/**
 * Добавляет tabIds в группу сайта host внутри окна windowId.
 * Если подходящая группа уже есть — докидывает в неё.
 * Если группы нет — ищет в окне другие негруппированные вкладки того же
 * сайта и создаёт группу сразу из всех них (группа из одной вкладки не
 * создаётся — толку в ней немного).
 */
async function addTabsToSiteGroup(windowId, host, tabIds) {
  const existingGroup = await findGroupByTitle(windowId, host);

  if (existingGroup) {
    const tabsInfo = await Promise.all(tabIds.map((id) => browser.tabs.get(id)));
    const toAdd = tabsInfo
      .filter((t) => t.groupId !== existingGroup.id)
      .map((t) => t.id);
    if (toAdd.length > 0) {
      await browser.tabs.group({ tabIds: toAdd, groupId: existingGroup.id });
    }
    return existingGroup.id;
  }

  const NONE = browser.tabGroups.TAB_GROUP_ID_NONE;
  const allTabs = await browser.tabs.query({ windowId });
  const siblingIds = allTabs
    .filter(
      (t) =>
        !t.pinned &&
        extractHostFromUrl(t.url) === host &&
        (t.groupId === undefined || t.groupId === NONE)
    )
    .map((t) => t.id);

  const combined = Array.from(new Set([...siblingIds, ...tabIds]));
  if (combined.length < 2) {
    return null; // одна вкладка — группировать пока незачем
  }

  const groupId = await browser.tabs.group({ tabIds: combined });
  await browser.tabGroups.update(groupId, { title: host, color: colorForHost(host) });
  return groupId;
}

/** Реакция на одну вкладку (используется автогруппировкой). */
async function ensureTabGrouped(tab) {
  if (!autoGroupEnabled) return;
  if (!tab || tab.pinned) return;
  const host = extractHostFromUrl(tab.url);
  if (!host || excludedHosts.has(host)) return;
  try {
    await addTabsToSiteGroup(tab.windowId, host, [tab.id]);
  } catch (err) {
    console.error("Tab Site Grouper: ensureTabGrouped failed", err);
  }
}

/** Группирует все вкладки окна по сайтам (ручной запуск: кнопка / меню). */
async function groupAllTabsInWindow(windowId) {
  const tabs = await browser.tabs.query({ windowId });
  const byHost = new Map();

  for (const tab of tabs) {
    if (tab.pinned) continue;
    const host = extractHostFromUrl(tab.url);
    if (!host || excludedHosts.has(host)) continue;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(tab.id);
  }

  for (const [host, tabIds] of byHost) {
    try {
      await addTabsToSiteGroup(windowId, host, tabIds);
    } catch (err) {
      console.error(`Tab Site Grouper: groupAllTabsInWindow failed for ${host}`, err);
    }
  }
}

async function resolveTargetWindowId(tab) {
  if (tab && typeof tab.windowId === "number") return tab.windowId;
  const win = await browser.windows.getLastFocused();
  return win.id;
}

// --- Автогруппировка при загрузке вкладок -----------------------------

browser.tabs.onCreated.addListener((tab) => {
  if (tab.status === "complete") {
    ensureTabGrouped(tab);
  }
});

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      ensureTabGrouped(tab);
    }
  },
  { properties: ["status"] }
);

// --- Кнопка на панели инструментов -------------------------------------

browser.action.onClicked.addListener(async (tab) => {
  const windowId = await resolveTargetWindowId(tab);
  groupAllTabsInWindow(windowId);
});

// --- Контекстное меню ----------------------------------------------------

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_GROUP_NOW) {
    const windowId = await resolveTargetWindowId(tab);
    groupAllTabsInWindow(windowId);
    return;
  }
  if (info.menuItemId === MENU_OPTIONS) {
    browser.runtime.openOptionsPage();
  }
});

// --- Синхронизация настроек -----------------------------------------------

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STORAGE_KEY_AUTO]) {
    autoGroupEnabled = changes[STORAGE_KEY_AUTO].newValue;
  }
  if (changes[STORAGE_KEY_EXCLUDED]) {
    excludedHosts = new Set(changes[STORAGE_KEY_EXCLUDED].newValue || []);
  }
});

async function init() {
  if (!browser.tabs.group || !browser.tabGroups) {
    console.warn(browser.i18n.getMessage("consoleNoApiWarning"));
    return;
  }

  const stored = await browser.storage.local.get([STORAGE_KEY_AUTO, STORAGE_KEY_EXCLUDED]);
  if (typeof stored[STORAGE_KEY_AUTO] === "boolean") {
    autoGroupEnabled = stored[STORAGE_KEY_AUTO];
  }
  if (Array.isArray(stored[STORAGE_KEY_EXCLUDED])) {
    excludedHosts = new Set(stored[STORAGE_KEY_EXCLUDED]);
  }

  await browser.menus.removeAll();
  await browser.menus.create({
    id: MENU_GROUP_NOW,
    title: browser.i18n.getMessage("menuGroupNow"),
    contexts: ["page", "tab", "action"],
  });
  await browser.menus.create({
    id: MENU_SEPARATOR,
    type: "separator",
    contexts: ["action"],
  });
  await browser.menus.create({
    id: MENU_OPTIONS,
    title: browser.i18n.getMessage("menuOptions"),
    contexts: ["action"],
  });
}

init();
