# Google Drive backup of player data

A Google Apps Script in Nakul's Google account copies all player data into his Drive:

- **When:** within an hour of every 50th sign-up (50, 100, 150 …), plus every Sunday at 3 AM IST, plus whenever you run `backupNow()`.
- **What:** one new Google Sheet per backup (tabs: users, ratings, tournament_entries, registrations, applications, skill_stats, arena_ratings, paths, path_attempts, contact_messages, feedback) plus an `.xlsx` copy, in the Drive folder **Rank Culture backups**. Passwords, login tokens and MFA secrets are never included.
- **Why it can't be corrupted:** it never edits or deletes an old backup — every run makes new files. Before a backup gets its normal name it re-counts every tab against the data it received; a mismatch renames it `FAILED — …` and emails you. Values are written as plain text (no date/number re-interpretation) and anything that looks like a formula is neutralised so a player can't plant one. Finished files are **locked** in Drive (read-only until someone deliberately unlocks them). Every run is listed in the **Rank Culture backup log** sheet.
- **How it reads the data:** the database functions `backup_status` and `backup_snapshot` (migration 0018). They only answer to a secret token that lives in the script's properties; the database stores just its SHA-256 hash. The functions are read-only and rate-limited (status every 20 s, snapshot every 5 min).

## Setup (once, ~5 minutes)

1. Migration `0018_data_safety_and_backups.sql` must be applied to the live database.
2. In the Google account whose Drive should hold the backups, open https://script.google.com → **New project** → name it `Rank Culture backup`.
3. Replace the contents of `Code.gs` with `ops/backup/Code.gs`.
4. Project Settings → tick **Show "appsscript.json" manifest file in editor** → replace `appsscript.json` with `ops/backup/appsscript.json`.
5. Select `setup` in the function menu → **Run** → allow the permissions Google asks for (Drive, Sheets, external requests, triggers, send email as you).
6. Copy the 64-character hash from the execution log and give it to Claude (it is not the secret). Claude registers it with `select public.set_backup_token_hash('<hash>');`.
7. Run `backupNow` once and check the new files in Drive → **Rank Culture backups**.

## Running it

- Check the **Rank Culture backup log** sheet now and then; every row should say `OK`.
- A failure sends an email to the script owner. Fix the cause (usually the token or a database change) and run `backupNow`.
- Retention: the privacy policy promises Drive backups are kept for up to **12 months**. The script never deletes anything, so once a month delete backups older than 12 months (see SECURITY-CHECKLIST.md).
- Rotating the token: delete the `BACKUP_TOKEN` script property, run `setup` again, give Claude the new hash.
- Restoring: open the backup sheet (or the `.xlsx`) — every column matches the database column of the same name.

## Limits

Apps Script runs for at most 6 minutes and a web response can be up to 50 MB; with today's tables that is far beyond tens of thousands of players. When the user count reaches the tens of thousands, move to paged exports or Supabase Pro backups as well.

## Tests

`supabase/tests/backup-script.test.mjs` runs this script in Node against mocked Google services and a real snapshot from the replica database (first backup, 50-sign-up trigger, no-op hours, formula neutralising, `.xlsx` copy, locking, log, and a forced corruption that must fail and alert).
