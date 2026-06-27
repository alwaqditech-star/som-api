-- شغّل هذا على Railway PostgreSQL مرة واحدة
CREATE TABLE IF NOT EXISTS auction_interest_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  auction_id UUID NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, auction_id)
);

CREATE INDEX IF NOT EXISTS idx_interest_reminders_due
  ON auction_interest_reminders (remind_at)
  WHERE cancelled = false AND sent_at IS NULL;
