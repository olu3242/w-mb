alter table events
  add column occasion_type text,
  add column theme_id text,
  add column ai_plan_seed jsonb not null default '{}',
  add column modules jsonb not null default '[]';
