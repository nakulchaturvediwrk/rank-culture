// Contact form → email routing (0019).
import { makeDb } from "./harness.mjs";
const MIG = new URL("../migrations", import.meta.url).pathname;
const db = await makeDb(MIG);
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  ok  " : "  FAIL"} ${name}${!cond && extra ? " — " + extra : ""}`); };
const su = async (s, p) => (await db.query(s, p)).rows;
const anon = async (sql, p) => { await db.exec(`reset role; select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;`); try { return (await db.query(sql, p)).rows; } finally { await db.exec("reset role"); } };
const send = (topic, name, email, msg) => anon(`select public.send_contact($1, $2, $3, $4)`, [topic, name, email, msg]);
const sent = async () => su(`select body from net.sent where url like '%resend%' order by ctid`);

console.log("1. Without the Resend key, messages are still saved");
await send("candidate", "Asha", "asha@example.com", "Can't log in");
ok("message saved", Number((await su(`select count(*) n from public.contact_messages`))[0].n) === 1);
ok("no email attempted", (await sent()).length === 0);

console.log("2. With the key, each message goes to the right inbox");
await su(`insert into vault.decrypted_secrets values ('resend_api_key', 're_test')`);
const cases = [["candidate", "support@rankculture.in"], ["dispute", "support@rankculture.in"], ["pro-waitlist", "support@rankculture.in"], ["other", "support@rankculture.in"],
  ["employer", "talks@rankculture.in"], ["investor", "talks@rankculture.in"], ["press", "talks@rankculture.in"], ["college", "campus@rankculture.in"]];
for (const [i, [topic]] of cases.entries()) await send(topic, `Sender ${i}`, `s${i}@example.com`, `Hello about ${topic}`);
const mails = (await sent()).map(r => r.body);
ok("one email per message", mails.length === cases.length, String(mails.length));
cases.forEach(([topic, inbox], i) => ok(`${topic} → ${inbox}`, mails[i] && mails[i].to[0] === inbox, JSON.stringify(mails[i] && mails[i].to)));
ok("reply-to is the sender", mails[0].reply_to === "s0@example.com");
ok("sent from noreply@rankculture.in", /noreply@rankculture\.in/.test(mails[0].from));
ok("plain text only (no html field)", mails.every(m => !("html" in m) && typeof m.text === "string"));
ok("message text included", mails[4].text.includes("Hello about employer"));
ok("subject names the topic", mails[1].subject.startsWith("[Score dispute]"));

console.log("3. Hostile input");
await send("other", "Eve\r\nBcc: x@evil.test", "eve@example.com", "<script>alert(1)</script>");
const last = (await sent()).at(-1).body;
ok("no line breaks in the subject", !/[\r\n]/.test(last.subject), JSON.stringify(last.subject));
ok("markup stays inert text", last.text.includes("<script>") && !("html" in last));

console.log("4. Email failure never loses the message");
await su(`create or replace function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint language plpgsql as $$ begin raise exception 'network down'; end $$`);
await send("candidate", "Ravi", "ravi@example.com", "Still saved?");
ok("message saved even though sending failed", Number((await su(`select count(*) n from public.contact_messages where email = 'ravi@example.com'`))[0].n) === 1);

console.log("5. Nobody can call the notifier directly");
try { await anon(`select public._contact_notify()`); ok("anon blocked", false, "no error"); } catch (e) { ok("anon can't call the notifier", true); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
