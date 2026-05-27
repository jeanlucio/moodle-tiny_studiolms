# Change log

## 1.0.0 (2026-05-27)

- Fixed: Studio button was still appearing for students after the capability
  restriction in `db/access.php`. The old `user → CAP_ALLOW` grant in
  `mdl_role_capabilities` persisted from the initial install and was not
  removed automatically. Two upgrade steps were added: one to remove the
  stale grant, and one to grant the capability to editingteacher, teacher,
  and manager roles that were never provisioned.
