# Change log

## 1.0.3 (2026-06-15)

- Changed: AI provider resolution now follows the shared PlayerGames ecosystem
  ladder, level-first: own personal key → PlayerGames hub personal key → own site
  key → hub site key → Moodle `core_ai`. `core_ai` moved from priority-0 to the
  bottom, so an explicitly configured personal or site key always wins over the
  institutional default.
- Added: personal and site keys configured in `local_playergames` are now read at
  the matching level (the editor is no longer an isolated key silo). The
  integration stays optional via `class_exists` and needs `local_playergames`
  0.1.1+; the editor's own keys keep working unchanged.
- Both AI modes (block/preset generation and the multi-turn chat) use the same
  ladder. Behaviour with personal keys is unchanged; the only difference is that a
  configured site/hub key now wins over `core_ai`.

## 1.0.2 (2026-06-05)

- Added: Moodle `core_ai` probed as priority-0 provider when no personal keys are
  configured; no API key is needed when core_ai is already set up at site level.
- Added: Custom AI URL is now normalised automatically — supplying a base URL (e.g.
  `https://integrate.api.nvidia.com/v1`) appends `/chat/completions` transparently.
- Security: Gemini API key moved from querystring to `x-goog-api-key` request header,
  preventing exposure in server access logs and HTTP referrer headers.
- Security: SSRF protection upgraded — `is_safe_url()` now resolves all A and AAAA DNS
  records via `dns_get_record()` and rejects any record that maps to a private or
  reserved IP, closing a DNS rebinding attack vector.
- Security: personal API keys configured by a teacher now always take full priority over
  institution-level defaults; both sets are no longer silently merged.
- Updated: Gemini model changed to `gemini-flash-latest`.
- Updated: `custom_baseurl` admin setting now uses `PARAM_URL` validation.

## 1.0.0 (2026-05-27)

- Fixed: Studio button was still appearing for students after the capability
  restriction in `db/access.php`. The old `user → CAP_ALLOW` grant in
  `mdl_role_capabilities` persisted from the initial install and was not
  removed automatically. Two upgrade steps were added: one to remove the
  stale grant, and one to grant the capability to editingteacher, teacher,
  and manager roles that were never provisioned.
