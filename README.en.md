# Tab Grouper by Site (Firefox)

This extension groups Firefox tabs by website, using **Firefox's built-in tab
groups** (the `tabGroups` WebExtensions API, available since Firefox 139;
the manifest requires Firefox **142+** because of the now-mandatory data
collection declaration).

The UI is fully available in Russian and English — the language is picked
automatically from Firefox's own UI language (see "Localization" below).

## What it does

- **Automatically** groups a tab with other tabs from the same site as soon
  as it finishes loading. This only kicks in once there's at least one other
  tab from that site open — a group of a single tab is never created. Can be
  turned off from the options page.
- A group is named after the site's domain (e.g. `github.com`) and gets a
  stable color — the same site always gets the same color.
- **Toolbar button** — clicking it immediately groups **all** tabs in the
  current window by site (handy if automatic grouping is off, or you just
  want to tidy up tabs you already have open). Works regardless of the
  automatic-grouping setting.
- **Context menu**:
  - "Group tabs by site" — available on the page, on a tab (right-click in
    the tab strip), and on the extension's toolbar button; does the same
    thing as clicking the button.
  - "Options…" on the toolbar button — opens the options page.
- **Exclusion list** — sites that are never grouped, neither automatically
  nor manually. Managed from the options page.
- **Options page** (open it via `about:addons` → gear icon next to the
  extension → "Options", or from the context menu on the toolbar button): a
  toggle for automatic grouping and an exclusion list with an add field and
  remove buttons. Changes save immediately, no "Save" button needed.

## Assumptions made

- **"One site" means the full hostname** (e.g. `mail.google.com` and
  `docs.google.com` are different sites, different groups), not the
  top-level registered domain. The `www.` prefix is ignored, so
  `www.example.com` and `example.com` count as the same site. This also
  applies to the exclusion list: adding `example.com` excludes exactly that
  hostname (a subdomain like `shop.example.com` needs its own entry).
- Pinned tabs are never grouped — `tabs.group` unpins tabs as a side effect,
  which would be surprising, so pinned tabs are skipped on purpose.
- The "close tabs by site name" idea from the project's original description
  is not part of this extension — it currently only groups tabs.

## Localization

UI strings (name, button, context menu, options page) live in
`_locales/ru/messages.json` and `_locales/en/messages.json` — the standard
WebExtensions localization mechanism. Firefox picks the right file based on
the browser's UI language; if that language isn't available, it falls back
to Russian (`default_locale` in the manifest). To add another language, copy
one of the `messages.json` files into a new `_locales/<language-code>/`
folder and translate the `message` values.

## Installation

Firefox won't let you permanently install an unsigned extension — there are
two paths.

### Quick way — temporary install (for testing)

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click "Load Temporary Add-on…".
3. Select the `tab-site-grouper.zip` file.
4. The icon appears in the toolbar.

This lasts until Firefox restarts — after that, repeat steps 1–3.

### Permanent install — signing via addons.mozilla.org

For a permanent install, Mozilla needs to sign the extension (even if you
never intend to publish it publicly — there's an "unlisted" self-distribution
mode that signs automatically, with no manual review). Steps:

1. Go to https://addons.mozilla.org/ and sign in (or create a free Firefox
   account).
2. Open the developer API key management page:
   https://addons.mozilla.org/developers/addon/api/key/ — generate a `JWT
   issuer` (this is your API key) and `JWT secret` (API secret) pair. You
   can revoke and regenerate these at any time from the same page.
3. Install the `web-ext` tool if you don't have it yet:
   `npm install -g web-ext`
4. From the extension's folder, run:
   ```
   web-ext sign --channel=unlisted \
     --api-key=<your JWT issuer> \
     --api-secret=<your JWT secret>
   ```
   This uploads the extension to Mozilla's servers, waits for automated
   validation (usually 1–5 minutes), and saves the signed `.xpi` into the
   `web-ext-artifacts/` folder.
5. Open the resulting `.xpi` in Firefox (drag the file into the browser
   window, or `about:addons` → gear icon → "Install Add-on From File…") — it
   will install permanently and survive browser restarts.

Whenever you bump the version (`version` in `manifest.json`), repeat step 4
— every signed version is stored separately in your developer account.

## Checking the minimum Firefox version

The extension uses `browser.tabs.group` / `browser.tabGroups`, which don't
exist in older Firefox versions. On startup it checks for their presence
and, if the API is missing, does nothing and logs a warning to the
extension's console (visible from `about:debugging`, "Inspect" button).

## Files

- `manifest.json` — the extension manifest (Manifest V3, Firefox-only).
- `common.js` — shared logic (hostname extraction, validation, group color),
  used by both the background script and the options page.
- `background.js` — automatic grouping, the toolbar button, the context menu.
- `options/` — the options page (`options.html`, `options.css`, `options.js`).
- `_locales/ru/`, `_locales/en/` — UI translations.
- `icons/` — toolbar icons (generated by `make_icons.py`).
- `make_icons.py` — icon-generation script (only needed if you tweak the design).

Russian version of this document: `README.md`.
