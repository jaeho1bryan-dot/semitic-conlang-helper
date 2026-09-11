-- Semitic Conlang Helper — add pattern arity
--
-- Semitic roots are not always triconsonantal: biconsonantal (2) and
-- quadriconsonantal (4) roots exist too. `arity` records how many distinct
-- root consonants a pattern consumes so the UI can offer only the patterns
-- that match the length of the root a user types.
--
-- The app also derives arity from the template (the highest 1..9 slot used),
-- so this column is a persisted convenience: existing rows may leave it null.

alter table public.patterns
  add column if not exists arity integer;

-- Backfill arity for existing rows from the highest digit used in the template.
update public.patterns
set arity = sub.arity
from (
  select id, coalesce(max(digit::int), 0) as arity
  from public.patterns,
       lateral regexp_matches(template, '[1-9]', 'g') as m(digit)
  group by id
) as sub
where public.patterns.id = sub.id
  and public.patterns.arity is null;
