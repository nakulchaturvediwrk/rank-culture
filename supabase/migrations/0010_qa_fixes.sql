-- QA pass: index foreign keys, tighten one grant, remove two ambiguous questions.
create index if not exists battles_host on public.battles (host);
create index if not exists knockout_matches_p1 on public.knockout_matches (p1);
create index if not exists knockout_matches_p2 on public.knockout_matches (p2);
create index if not exists knockout_matches_winner on public.knockout_matches (winner);
create index if not exists knockouts_champion on public.knockouts (champion);
create index if not exists knockouts_host on public.knockouts (host);

-- aal_ok() is only used by policies for signed-in users.
revoke execute on function public.aal_ok() from public, anon;
grant execute on function public.aal_ok() to authenticated;

-- India's labour codes changed gratuity rules for fixed-term staff; ask about permanent staff only.
update public.bank_questions
set prompt = 'In India, a permanent employee generally becomes eligible for gratuity after'
where prompt like 'Under India''s Payment of Gratuity Act%';

-- "Which ad gets the most?" had two defensible answers (B on CPA, or the split). Ask the budgeting question directly.
update public.questions
set prompt = '₹2 lakh for a two-week launch. How do you spend it?',
    options = '["All on Ad C — highest CTR means most attention", "All on Ad B — lowest cost per acquisition", "Mostly B, some D — scale the best CPA and keep testing the runner-up", "All on Ad A — gym audience fits the product best"]'::jsonb
where tournament_id = 'growth' and position = 4;
