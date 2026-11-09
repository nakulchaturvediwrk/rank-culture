-- December 2026 tournaments: one per field, windows spread across the month.
-- Original questions; every MCQ tournament totals 1,000 points. Written answers are saved but not scored during the pilot.
-- Safe to re-run: existing rows are left alone.

insert into public.tournaments (id, name, cat, blurb, tasks, prize, opens_at, closes_at, duration_min, cap, ranked, sort) values
 ('growth-dec', 'Festive Campaign Cup', 'marketing', 'Run a year-end sale for a D2C brand: message, budget, test.', 'Win back lapsed buyers · Cut the wasteful channel · Read an A/B test', 'Top finishers: fast-track to pilot partner marketing roles', '2026-12-01 10:00+05:30', '2026-12-14 23:59+05:30', 45, 5000, true, 11),
 ('sql-dec', 'Data Detective Cup', 'data', 'Write the query, then explain what the numbers really say.', 'Top cities by revenue · Filter groups · Explain a strange dashboard', 'Top finishers: fast-track to pilot partner analyst roles', '2026-12-03 10:00+05:30', '2026-12-16 23:59+05:30', 45, 5000, true, 12),
 ('product-dec', 'Product Sense Showdown', 'product', 'Diagnose a drop-off, rank a backlog with RICE, pick the right metric.', 'Find the drop-off · RICE a backlog · Measure a launch', 'Top finishers: fast-track to pilot partner product roles', '2026-12-06 10:00+05:30', '2026-12-19 23:59+05:30', 45, 5000, true, 13),
 ('sales-dec', 'Closing Bell Challenge', 'sales', 'Handle the brush-off, do the pipeline maths, follow up well.', 'Handle "just email me" · Pipeline maths · Post-demo follow-up', 'Top finishers: fast-track to pilot partner sales roles', '2026-12-08 10:00+05:30', '2026-12-21 23:59+05:30', 40, 5000, true, 14),
 ('ops-dec', 'Supply Chain Sprint', 'ops', 'Keep stock flowing and returns down through the festive rush.', 'Set a reorder point · Fix picking errors · Cut returns', 'Top finishers: fast-track to pilot partner ops roles', '2026-12-10 10:00+05:30', '2026-12-23 23:59+05:30', 45, 5000, true, 15),
 ('design-dec', 'UX Rescue Battle', 'design', 'Fix forms, tame a cluttered screen, plan a usability test.', 'Fix form errors · Tame a cluttered screen · Plan a usability test', 'Top finishers: fast-track to pilot partner design roles', '2026-12-12 10:00+05:30', '2026-12-26 23:59+05:30', 45, 5000, true, 16),
 ('code-dec', 'Debug December', 'tech', 'Three production bugs and a security smell. Find them.', 'Fix a reduce bug · Stop a race condition · Store passwords safely', 'Top finishers: fast-track to pilot partner engineering roles', '2026-12-15 10:00+05:30', '2026-12-28 23:59+05:30', 45, 5000, true, 17),
 ('hr-dec', 'People Ops Cup', 'hr', 'Keep offers from ghosting, do the attrition maths, run fair interviews.', 'Stop offer drop-offs · Attrition maths · Fair interviews', 'Top finishers: fast-track to pilot partner people-ops roles', '2026-12-17 10:00+05:30', '2026-12-30 23:59+05:30', 40, 5000, true, 18)
on conflict (id) do nothing;

drop table if exists seed_dec;
create temporary table seed_dec (t text, pos int, kind text, label text, prompt text, context text, tbl jsonb, opts jsonb, pts int, correct int);
insert into seed_dec values
 ('growth-dec',1,'mcq','Task 1 · Win-back message','Which WhatsApp message should go to 40,000 customers who haven''t ordered in 6 months?','A skincare brand''s year-end sale: 25% off for 5 days. These customers opted in to WhatsApp updates.',null,'["MEGA SALE!!! 25% OFF EVERYTHING. SHOP NOW!!!","Hi Priya, your Vitamin C serum ran out a while ago — it''s 25% off till Sunday. Reorder in one tap: [link]","Dear customer, we hope you are well. Please visit our website.","New year, new you! Check out our latest launches."]',300,1),
 ('growth-dec',2,'mcq','Task 2 · Budget','Average order is ₹900 and gross margin is 40% (₹360 per order). Which channel should you cut first?',null,'{"head":["Channel","Spend","Orders","Cost per order"],"rows":[["Meta ads","₹3,00,000","1,500","₹200"],["Google Search","₹2,00,000","1,250","₹160"],["Influencers","₹2,50,000","250","₹1,000"],["Email","₹20,000","400","₹50"]]}','["Email — it brings the fewest orders","Influencers — every order costs more than it earns","Meta — it has the biggest budget","Google Search — it''s the smallest paid channel"]',400,1),
 ('growth-dec',3,'mcq','Task 3 · A/B test','Version B of the sale page converts at 3.1% vs 3.0% for A, after 2,000 visitors each. What do you do?',null,null,'["Ship B — it won","Ship A — it''s the original","Stop testing; the difference doesn''t matter","Keep the test running until it reaches the sample size you planned — 0.1 points on 2,000 visitors is noise"]',300,3),
 ('growth-dec',4,'text','Task 3b · Written answer','Plan the 3 messages you''d send in the last week of the sale. Who gets each one, and why?','3–5 sentences.',null,null,0,null),

 ('sql-dec',1,'mcq','Task 1 · Top cities','Which query returns the 5 cities with the highest total revenue?','Table: orders(order_id, city, amount)',null,'["SELECT city, amount FROM orders LIMIT 5","SELECT city, SUM(amount) FROM orders ORDER BY amount DESC LIMIT 5","SELECT city, SUM(amount) AS revenue FROM orders GROUP BY city ORDER BY revenue DESC LIMIT 5","SELECT DISTINCT city FROM orders LIMIT 5"]',300,2),
 ('sql-dec',2,'mcq','Task 2 · Filter groups','You only want cities with more than 100 orders. Which clause?',null,null,'["GROUP BY city HAVING COUNT(*) > 100","WHERE COUNT(*) > 100 GROUP BY city","GROUP BY city WHERE COUNT(*) > 100","ORDER BY COUNT(*) > 100"]',400,0),
 ('sql-dec',3,'mcq','Task 3 · Strange dashboard','Conversion rate jumped from 2% to 4% this week, but orders stayed flat. What most likely happened?',null,'{"head":["Week","Sessions","Orders","Conversion"],"rows":[["Last week","50,000","1,000","2%"],["This week","25,000","1,000","4%"]]}','["Customers suddenly started buying twice as often","The marketing team doubled ad spend","Prices were cut in half","Sessions halved — the rate rose because the bottom number fell, not because more people bought"]',300,3),
 ('sql-dec',4,'text','Task 3b · Written answer','How would you check whether the drop in sessions is real or a tracking bug?','Bullet steps are fine.',null,null,0,null),

 ('product-dec',1,'mcq','Task 1 · Drop-off','Food-app users add items to cart late at night but rarely place the order. What do you check first?',null,null,'["Whether the app icon looks good in dark mode","Whether delivery fees or \"restaurant closed\" only show up at checkout","How many items are on the menu","The app store rating"]',300,1),
 ('product-dec',2,'mcq','Task 2 · RICE','Which feature has the highest RICE score?','RICE = Reach × Impact × Confidence ÷ Effort (person-months).','{"head":["Feature","Reach / month","Impact","Confidence","Effort"],"rows":[["A · Wishlist","5,000","1","80%","2"],["B · Reorder button","2,000","3","50%","1"],["C · New onboarding","10,000","0.5","100%","5"],["D · Delivery-time estimate","1,000","2","100%","0.5"]]}','["A · Wishlist","B · Reorder button","C · New onboarding","D · Delivery-time estimate"]',400,3),
 ('product-dec',3,'mcq','Task 3 · Metric','You launched "save for later". Which number best shows it actually helped?',null,null,'["How many times the button was tapped","4-week retention of users who got the feature vs a holdout group who didn''t","The app store rating this month","Number of news articles about the launch"]',300,1),
 ('product-dec',4,'text','Task 3b · Written answer','Write a user story and two acceptance criteria for "save for later" in the cart.','Max 120 words.',null,null,0,null),

 ('sales-dec',1,'mcq','Task 1 · The brush-off','On a cold call the prospect says "Just send me the details on email." Best reply?',null,null,'["Sure — so I send only what''s useful, what''s the one problem you''d want this to solve?","Okay, bye!","Our product is the best in the market, can I explain for 10 minutes?","Can I call back in an hour instead?"]',300,0),
 ('sales-dec',2,'mcq','Task 2 · Pipeline maths','Target: ₹12 lakh of new revenue a month. Average deal ₹60,000. You win 25% of qualified opportunities. How many qualified opportunities do you need each month?',null,null,'["20","48","80","240"]',400,2),
 ('sales-dec',3,'mcq','Task 3 · After the demo','Which follow-up email is best after a good demo?',null,null,'["Thanks for your time! Let me know if you have questions.","Attaching our 40-page brochure.","Just checking in to see if you made a decision?","A recap of the two problems they told you about, how you solve each, and a proposed next step with a date"]',300,3),
 ('sales-dec',4,'text','Task 3b · Written answer','Write a 4-line LinkedIn message to an HR head about a tool that cuts time-to-hire.',null,null,null,0,null),

 ('ops-dec',1,'mcq','Task 1 · Reorder point','You sell 40 units a day. The supplier takes 7 days to deliver. You keep 60 units of safety stock. At what stock level should you reorder?','Reorder point = daily demand × lead time + safety stock.',null,'["280","340","400","60"]',300,1),
 ('ops-dec',2,'mcq','Task 2 · Picking errors','Wrong items shipped rose from 2% to 5% after 30 new products with near-identical packaging were added. Best fix?',null,null,'["Hire more packers","Ask customers to check their orders","Scan each item''s barcode at packing and give look-alike products clearly separated, labelled bins","Stop selling the new products"]',400,2),
 ('ops-dec',3,'mcq','Task 3 · Returns','Which change would cut returns the most?',null,'{"head":["Return reason","Share of returns"],"rows":[["Size or fit issue","46%"],["Changed mind","22%"],["Damaged in transit","12%"],["Late delivery","12%"],["Wrong item sent","8%"]]}','["Better size charts and fit notes on every product page","Stronger boxes","A faster courier","Double-checking orders at packing"]',300,0),
 ('ops-dec',4,'text','Task 3b · Written answer','Write the first 5 steps of an SOP for handling a "my order arrived damaged" complaint.',null,null,null,0,null),

 ('design-dec',1,'mcq','Task 1 · Form errors','A signup form shows "Error 422" at the top of the page when a phone number is wrong. Best fix?',null,null,'["Make the error text red and bold","Clear the whole form so the user starts again","Show a pop-up that must be closed first","Show the message next to the phone field, in plain words, saying exactly how to fix it"]',300,3),
 ('design-dec',2,'mcq','Task 2 · Cluttered screen','A home screen shows 14 equally sized buttons and users take long to choose. Which principle explains it, and what''s the fix?',null,null,'["Hick''s law — more choices slow decisions; group them and surface the 3–4 most used","Fitts''s law — make every button bigger","Gestalt closure — add borders to all buttons","Jakob''s law — copy a competitor''s colours"]',400,0),
 ('design-dec',3,'mcq','Task 3 · Usability test','For one round of qualitative usability testing, how many users typically reveal most of the big problems?',null,null,'["1","5","50","500"]',300,1),
 ('design-dec',4,'text','Task 3b · Written answer','A "Delete account" button looks exactly like the "Save" button next to it. What would you change, and why?',null,null,null,0,null),

 ('code-dec',1,'mcq','Bug 1 · Reduce','items.reduce((sum, i) => sum + i.price) returns "[object Object]1299…" instead of a number. Fix?','items is an array of objects like { name, price }.',null,'["Wrap the result in Number()","Use forEach instead of reduce","Pass 0 as the starting value: items.reduce((sum, i) => sum + i.price, 0)","Sort the array first"]',300,2),
 ('code-dec',2,'mcq','Bug 2 · Race condition','Two requests top up the same wallet at the same moment and one top-up disappears. The code reads the balance, adds, then writes it back. Fix?',null,null,'["Do it in one atomic update (UPDATE wallets SET balance = balance + $1 WHERE id = $2) or lock the row inside a transaction","Add a 1-second sleep before writing","Retry the request on the client","Cache the balance in memory"]',400,0),
 ('code-dec',3,'mcq','Bug 3 · Passwords','How should user passwords be stored?',null,null,'["Encrypted with AES, key kept in the code","As an MD5 hash","Base64-encoded","Hashed with a slow, salted algorithm like bcrypt or Argon2"]',300,3),
 ('code-dec',4,'text','Bug 3b · Written answer','An endpoint got 5× slower sometime in the last 20 deploys. How do you find which deploy caused it?',null,null,null,0,null),

 ('hr-dec',1,'mcq','Task 1 · Offer drop-offs','Many candidates accept offers but don''t turn up on joining day. Best fix?',null,null,'["Make offer letters longer","Stay in touch between offer and joining — a check-in every week and a call with their future manager","Cut the notice period you accept to zero","Stop hiring people who are currently employed"]',300,1),
 ('hr-dec',2,'mcq','Task 2 · Attrition maths','12 people left this quarter. Average headcount was 150. What is the quarterly attrition rate?',null,null,'["8%","12%","1.2%","80%"]',400,0),
 ('hr-dec',3,'mcq','Task 3 · Fair interviews','What does the most to reduce bias in interviews?',null,null,'["Letting each interviewer ask whatever they like","Hiring for \"culture fit\" based on gut feel","The same core questions and a written scoring rubric for every candidate","Shorter interviews"]',300,2),
 ('hr-dec',4,'text','Task 3b · Written answer','Draft the first-week onboarding plan for a new sales hire in 5 bullet points.',null,null,null,0,null);

insert into public.questions (tournament_id, position, kind, label, prompt, context, table_data, options, points)
select s.t, s.pos, s.kind, s.label, s.prompt, s.context, s.tbl, s.opts, s.pts from seed_dec s
where not exists (select 1 from public.questions q where q.tournament_id = s.t and q.position = s.pos)
order by s.t, s.pos;

insert into public.answer_keys (question_id, correct)
select q.id, s.correct from seed_dec s join public.questions q on q.tournament_id = s.t and q.position = s.pos
where s.kind = 'mcq'
on conflict (question_id) do nothing;

-- Skill tags feed per-skill leaderboards (same names as the battle question bank).
update public.questions q set skill = m.skill from (values
 ('growth-dec',1,'Copywriting'),('growth-dec',2,'Paid ads'),('growth-dec',3,'Marketing metrics'),
 ('sql-dec',1,'SQL'),('sql-dec',2,'SQL'),('sql-dec',3,'Dashboards'),
 ('product-dec',1,'Product sense'),('product-dec',2,'Prioritisation'),('product-dec',3,'Product metrics'),
 ('sales-dec',1,'Objection handling'),('sales-dec',2,'Prospecting'),('sales-dec',3,'Closing'),
 ('ops-dec',1,'Inventory'),('ops-dec',2,'Process improvement'),('ops-dec',3,'Quality'),
 ('design-dec',1,'UX'),('design-dec',2,'Interaction design'),('design-dec',3,'UX research'),
 ('code-dec',1,'JavaScript'),('code-dec',2,'Databases'),('code-dec',3,'Security'),
 ('hr-dec',1,'Hiring'),('hr-dec',2,'HR analytics'),('hr-dec',3,'Hiring')
) as m(t, pos, skill) where q.tournament_id = m.t and q.position = m.pos and q.skill is null;
drop table if exists seed_dec;
