"use strict";

/**
 * Общая логика, используемая и фоновым скриптом, и страницей настроек.
 * Подключается как обычный (не модульный) скрипт, поэтому просто
 * определяет функции в глобальной области видимости.
 */

/** www. отбрасываем, чтобы www.example.com и example.com считались одним сайтом. */
function normalizeHost(rawHost) {
  return String(rawHost || "").toLowerCase().replace(/^www\./, "");
}

/**
 * Достаёт hostname из URL вкладки. Служебные страницы (about:, moz-extension:,
 * file: и т.д.) не поддерживаются — для них возвращается null.
 */
function extractHostFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return normalizeHost(parsed.hostname);
  } catch (e) {
    return null;
  }
}

/**
 * Грубая проверка, что строка похожа на доменное имя (для поля ввода на
 * странице настроек). Не претендует на полное RFC-соответствие — просто
 * отсекает явный мусор.
 */
function isLikelyDomain(str) {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(s);
}

/**
 * Приводит произвольный пользовательский ввод (домен или целый URL) к
 * hostname, который можно сохранить в список исключений.
 * Возвращает null, если распознать не удалось.
 */
function parseHostInput(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  // Пользователь мог вставить целый адрес страницы — попробуем сначала так.
  const asUrl = extractHostFromUrl(raw.includes("://") ? raw : `https://${raw}`);
  if (asUrl && isLikelyDomain(asUrl)) return asUrl;

  const normalized = normalizeHost(raw);
  return isLikelyDomain(normalized) ? normalized : null;
}

const GROUP_COLORS = [
  "blue",
  "cyan",
  "grey",
  "green",
  "orange",
  "pink",
  "purple",
  "red",
  "yellow",
];

/** Стабильный цвет для сайта: одинаковый hostname — всегда один и тот же цвет. */
function colorForHost(host) {
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = (hash * 31 + host.charCodeAt(i)) >>> 0;
  }
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}
