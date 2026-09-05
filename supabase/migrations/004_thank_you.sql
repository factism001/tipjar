-- 004: thank-you loop — creator thanks on tips
alter table tips add column if not exists thank_you_message text;
alter table tips add column if not exists thanked_at timestamptz;

-- public read of thank-you fields comes through service_role API only (no anon select change)
-- authenticated creators already select own tips; new columns ride along
