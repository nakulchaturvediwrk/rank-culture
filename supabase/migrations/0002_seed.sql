-- Season 3 content: tournaments, tasks, answer keys and partner jobs (fictional companies).
insert into public.tournaments (id, name, cat, blurb, tasks, prize, opens_at, closes_at, duration_min, cap, ranked, sort) values
 ('practice', 'Placement Sprint (practice)', 'marketing', 'A 20-minute warm-up. Doesn''t affect your rank.', 'Three quick calls a junior marketer makes every week', 'Practice only', '2026-01-01 00:00+05:30', '2027-12-31 23:59+05:30', 20, 100000, false, 0),
 ('growth', 'Growth Marketing Cup', 'marketing', 'Three real tasks from three D2C brands, anonymised.', 'Write a launch email · Fix a leaky funnel · Pick the winning ad', 'Interview fast-track at 6 companies + ₹50,000 pool', '2026-11-03 10:00+05:30', '2026-11-16 23:59+05:30', 60, 3000, true, 1),
 ('sql', 'SQL Sprint', 'data', 'Clean data, answer business questions, defend your query.', 'Clean a messy sales table · Answer business questions', 'Analyst fast-track at 4 companies', '2026-11-01 10:00+05:30', '2026-11-14 23:59+05:30', 45, 4000, true, 2),
 ('ops', 'Ops Case Showdown', 'ops', 'A D2C brand''s delivery promise is breaking. Fix it.', 'Fix a delivery delay · Build a vendor scorecard', 'Ops associate fast-track at 3 D2C brands', '2026-11-04 10:00+05:30', '2026-11-11 23:59+05:30', 60, 2000, true, 3),
 ('product', 'Product Teardown Clash', 'product', 'Tear down an app, prioritise a backlog, write the PRD.', 'Teardown a real app · Prioritise a backlog · Write a 1-page PRD', 'APM interview at 3 startups + mentor session', '2026-11-12 10:00+05:30', '2026-11-22 23:59+05:30', 75, 2000, true, 4),
 ('sales', 'Sales Pitch Arena', 'sales', 'Cold outreach and objection handling for a SaaS product.', 'Cold email · Objection handling · Discovery call script', 'BDR offers from 5 SaaS teams', '2026-11-14 10:00+05:30', '2026-11-24 23:59+05:30', 40, 1500, true, 5),
 ('design', 'UI Craft Battle', 'design', 'Redesign a checkout and critique a flow.', 'Redesign a checkout · Critique a flow', 'Design interviews at 4 product companies', '2026-11-18 10:00+05:30', '2026-11-28 23:59+05:30', 90, 1200, true, 6),
 ('code', 'Backend Bug Hunt', 'tech', 'Find and fix production bugs in a Node API.', 'Find & fix 4 production bugs in a Node API', 'SDE-1 fast-track at 7 companies', '2026-11-20 10:00+05:30', '2026-11-30 23:59+05:30', 60, 5000, true, 7),
 ('hr', 'People Ops Challenge', 'hr', 'Hiring plans and escalations.', 'Draft a hiring plan · Handle an escalation', 'HR associate roles at 3 companies', '2026-10-10 10:00+05:30', '2026-10-18 23:59+05:30', 45, 800, true, 8);

-- q(tournament, position, kind, label, prompt, context, table, options, points, correct)
create temporary table seed_q (t text, pos int, kind text, label text, prompt text, context text, tbl jsonb, opts jsonb, pts int, correct int) on commit drop;
insert into seed_q values
 ('practice',1,'mcq','Copywriting','Which push notification is most likely to get opened?','A food delivery app, Friday 7 PM, user ordered biryani twice last month.',null,'["Order now and save!","Biryani o''clock? Your usual is 20 min away.","New restaurants added near you","Rate your last order"]',100,1),
 ('practice',2,'mcq','Metrics','Signups doubled but revenue is flat. What do you check first?',null,null,'["Ad spend","Signup → first purchase conversion","Website load time","Social media followers"]',100,1),
 ('practice',3,'mcq','Prioritisation','You have one day. Which task first?',null,null,'["Redesign the logo","Fix the broken checkout button","Write next month''s blog plan","Update the team wiki"]',100,1),

 ('growth',1,'mcq','Task 1 · Copywriting','Which subject line should go to 80,000 subscribers?','A new protein bar ("Haldi Crunch") launches Monday. Last 5 launch emails averaged 18% open rate. Audience: 22–34, mostly gym-goers in metros.',null,'["Introducing Haldi Crunch — our newest protein bar","Your 4 PM slump called. It wants Haldi Crunch.","NEW LAUNCH!!! 20% OFF HALDI CRUNCH TODAY ONLY","We made a protein bar that tastes like dadi''s haldi doodh"]',300,1),
 ('growth',2,'mcq','Task 2 · Funnel analysis','Where is the funnel leaking?','Note: 64% of checkout traffic is mobile. COD was removed 3 weeks ago.','{"head":["Step","Users","Drop"],"rows":[["Landing page","42,000",""],["Product page","18,900","55%"],["Add to cart","6,050","68%"],["Checkout started","5,320","12%"],["Payment success","1,590","70%"]]}','["The product page — 55% drop is the biggest leak","Add-to-cart — the price is probably too high","Payment — COD removal is hurting mobile buyers","Landing page — traffic quality is poor"]',400,2),
 ('growth',3,'text','Task 2b · Written answer','What would you fix first, and how will you know it worked?','3–5 sentences. Reviewers score clarity, reasoning and measurability.',null,null,0,null),
 ('growth',4,'mcq','Task 3 · Paid ads','₹2 lakh budget. Which ad gets the most?',null,'{"head":["Ad","CTR","CPC","Conv. rate","CPA"],"rows":[["A · Gym reel","2.1%","₹9","1.8%","₹500"],["B · Office snack","1.4%","₹7","3.2%","₹219"],["C · Influencer","3.6%","₹14","1.1%","₹1,273"],["D · Dadi recipe","2.8%","₹8","2.4%","₹333"]]}','["Ad C — highest CTR means most attention","Ad B — lowest cost per acquisition","Split 60/40 between B and D to keep learning","Ad A — gym audience fits the product best"]',300,2),

 ('sql',1,'mcq','Task 1 · Cleaning','The orders table has duplicate rows from a retry bug. Which query counts real orders?','Each real order has a unique order_id; duplicates share it.',null,'["SELECT COUNT(*) FROM orders","SELECT COUNT(DISTINCT order_id) FROM orders","SELECT COUNT(order_id) FROM orders WHERE order_id IS NOT NULL","SELECT MAX(order_id) FROM orders"]',300,1),
 ('sql',2,'mcq','Task 2 · Joins','You need every customer, including those with zero orders, with their order count. Which join?',null,null,'["INNER JOIN orders","LEFT JOIN orders, COUNT(orders.id)","LEFT JOIN orders, COUNT(*)","CROSS JOIN orders"]',400,1),
 ('sql',3,'mcq','Task 3 · Business question','Revenue fell 12% in October. Which cut explains it fastest?','Orders were flat month on month.',null,'["Revenue by city","Average order value by category","Number of signups","Page views by device"]',300,1),
 ('sql',4,'text','Task 3b · Written answer','Write the query (or describe the steps) you''d use to find which category drove the AOV drop.','Plain SQL or bullet steps are both fine.',null,null,0,null),

 ('ops',1,'mcq','Task 1 · Delivery delay','On-time delivery fell from 94% to 78% in Pune only. First move?','Same courier partner nationally. Pune warehouse moved to a new site 10 days ago.',null,'["Switch courier partner nationally","Audit the new Pune warehouse pick-pack times","Offer customers a discount code","Increase the promised delivery time everywhere"]',300,1),
 ('ops',2,'mcq','Task 2 · Vendor scorecard','Which metric matters most for a packaging vendor of a food brand?',null,null,'["Number of SKUs they offer","Defect rate per 1,000 units and on-time supply","Their social media presence","Office location"]',400,1),
 ('ops',3,'mcq','Task 3 · Capacity','Diwali orders will be 3× normal for 10 days. Best plan?',null,null,'["Hire permanent staff now","Add temporary shifts and pre-pack top 20 SKUs","Stop taking orders after a cap","Do nothing — it''s only 10 days"]',300,1),
 ('ops',4,'text','Task 3b · Written answer','Write the 3-line update you''d send the founder about the Pune delay.','Be specific: cause, fix, date.',null,null,0,null),

 ('product',1,'mcq','Task 1 · Teardown','A grocery app''s repeat rate is low. Which feature most likely helps?',null,null,'["Dark mode","One-tap reorder of last basket","A new splash screen","More push notifications"]',300,1),
 ('product',2,'mcq','Task 2 · Prioritise','Which backlog item ships first? (impact ÷ effort)','A: high impact, 6 weeks · B: medium impact, 1 week · C: low impact, 1 day · D: high impact, 2 weeks',null,'["A","B","C","D"]',400,3),
 ('product',3,'mcq','Task 3 · Metric','North-star metric for a habit-tracking app?',null,null,'["Downloads","Weekly users who complete at least one habit","Number of habits created","App store rating"]',300,1),
 ('product',4,'text','Task 3b · PRD','Write the problem statement and success metric for one-tap reorder.','Max 150 words.',null,null,0,null),

 ('sales',1,'mcq','Task 1 · Cold email','Best opening line to a D2C founder for an inventory tool?',null,null,'["We are the leading inventory platform in India","Saw you sold out of the Masala Kit twice last month — want to see what that cost you?","Do you have 30 minutes this week?","Hope you are doing well!"]',300,1),
 ('sales',2,'mcq','Task 2 · Objection','"It''s too expensive." Best reply?',null,null,'["Offer 50% off immediately","Ask what they compare it against and show cost of stock-outs","Agree and end the call","Send more feature brochures"]',400,1),
 ('sales',3,'mcq','Task 3 · Discovery','Which question uncovers real pain?',null,null,'["Do you like our product?","Walk me through what happened the last time you ran out of stock.","What''s your budget?","Who is your current vendor?"]',300,1),
 ('sales',4,'text','Task 3b · Follow-up','Write a 3-line follow-up email after a no-show.',null,null,null,0,null),

 ('design',1,'mcq','Task 1 · Checkout','Mobile checkout abandonment is 70%. Biggest likely fix?',null,null,'["Add more colours","Allow guest checkout and autofill address","Add an animated mascot","Move the pay button below the fold"]',300,1),
 ('design',2,'mcq','Task 2 · Accessibility','Light grey text on white fails contrast. Minimum ratio for body text (WCAG AA)?',null,null,'["2:1","3:1","4.5:1","7:1"]',400,2),
 ('design',3,'mcq','Task 3 · Hierarchy','A pricing page has 3 equal-weight plans. Users stall. Best change?',null,null,'["Highlight one recommended plan","Add a fourth plan","Make all buttons red","Remove prices"]',300,0),
 ('design',4,'text','Task 3b · Critique','Critique a signup flow that asks for 12 fields on one screen.',null,null,null,0,null),

 ('code',1,'mcq','Bug 1 · Async','An Express route returns before the DB call finishes. Fix?',null,null,'["Add a setTimeout","await the query inside an async handler","Wrap it in try/catch only","Increase the server timeout"]',300,1),
 ('code',2,'mcq','Bug 2 · Security','Login uses string-concatenated SQL. Fix?',null,null,'["Escape quotes manually","Use parameterised queries","Hide the error message","Rate-limit the endpoint"]',400,1),
 ('code',3,'mcq','Bug 3 · Performance','A list endpoint does one query per item (N+1). Fix?',null,null,'["Cache nothing","Fetch related rows in one query with a join or IN list","Add more servers","Paginate to 1 item"]',300,1),
 ('code',4,'text','Bug 4 · Write-up','Explain how you''d prevent the SQL bug from coming back.',null,null,null,0,null),

 ('hr',1,'mcq','Task 1 · Hiring plan','Startup needs 10 sales hires in 60 days. First step?',null,null,'["Post on every job board","Define the role scorecard and interview loop","Raise salaries","Hire an agency for all roles"]',300,1),
 ('hr',2,'mcq','Task 2 · Escalation','An employee reports harassment by a manager. First action?',null,null,'["Ask them to sort it out directly","Document, ensure safety, start a formal POSH inquiry","Wait for more complaints","Move the employee to another team"]',400,1),
 ('hr',3,'mcq','Task 3 · Retention','Attrition spiked in one team. Best first data point?',null,null,'["Company-wide engagement score","Exit interview themes for that team","Office snack budget","Industry average salary"]',300,1);

insert into public.questions (tournament_id, position, kind, label, prompt, context, table_data, options, points)
select t, pos, kind, label, prompt, context, tbl, opts, pts from seed_q order by t, pos;
insert into public.answer_keys (question_id, correct)
select q.id, s.correct from seed_q s join public.questions q on q.tournament_id = s.t and q.position = s.pos where s.kind = 'mcq';

insert into public.jobs (id, role, company, city, salary, min_rank, cat, type, fast_track, about, duties, hiring_from) values
 ('kirana-growth', 'Growth Associate', 'Kirana Club', 'Bengaluru', '8–12 LPA', 700, 'marketing', 'Full-time', true, 'A 60-person startup helping neighbourhood stores sell online. Series A.', '{"Own WhatsApp and email campaigns to 2 lakh kirana store owners","Run weekly A/B tests and report what moved retention","Work with the founder on launch plans for new cities"}', 'growth'),
 ('bluepine-perf', 'Performance Marketer', 'Bluepine Foods', 'Mumbai', '10–14 LPA', 720, 'marketing', 'Full-time', true, 'A D2C snacks brand selling across 40 cities.', '{"Run Meta and Google campaigns with a ₹40 lakh monthly budget","Own CAC and ROAS reporting","Brief creatives with the brand team"}', 'growth'),
 ('paperlane-content', 'Content Lead', 'Paperlane', 'Remote', '12–16 LPA', 780, 'marketing', 'Full-time', false, 'A remote-first stationery brand.', '{"Own the content calendar","Grow the newsletter","Manage two freelance writers"}', null),
 ('saltpan-ba', 'Business Analyst', 'Saltpan Labs', 'Pune', '7–10 LPA', 650, 'data', 'Full-time', true, 'An analytics consultancy for D2C brands.', '{"Build weekly dashboards in SQL and Power BI","Answer business questions for 3 client brands","Present findings to founders"}', 'sql'),
 ('northwind-apm', 'APM', 'Northwind D2C', 'Gurugram', '14–18 LPA', 800, 'product', 'Full-time', false, 'A home-goods brand building its own app.', '{"Own the reorder and loyalty roadmap","Write PRDs and run sprint reviews","Talk to 10 customers a week"}', 'product'),
 ('ledgerly-bdr', 'BDR', 'Ledgerly', 'Hyderabad', '6–9 LPA + incentives', 600, 'sales', 'Full-time', true, 'Accounting software for small businesses.', '{"Book 15 qualified demos a month","Run outbound to D2C founders","Keep the CRM clean"}', 'sales'),
 ('haldi-ops', 'Ops Associate', 'Haldi & Co', 'Jaipur', '5–8 LPA', 600, 'ops', 'Full-time', true, 'A spice brand with 3 warehouses.', '{"Track daily dispatch SLAs","Manage 6 vendors","Plan festive capacity"}', 'ops'),
 ('paperlane-intern', 'Marketing Intern', 'Paperlane', 'Remote', '₹25k / month', 500, 'marketing', 'Internship', false, 'A remote-first stationery brand.', '{"Support social media","Write product descriptions","Research competitors"}', null);
