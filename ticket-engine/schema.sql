PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ticket_sequences (
  year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL CHECK (last_value >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_number TEXT NOT NULL UNIQUE,
  ticket_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  customer_name TEXT,
  customer_company TEXT,
  customer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('NEW','OPEN','WAITING_CUSTOMER','WAITING_INTERNAL','IN_PROGRESS','RESOLVED','CLOSED','SPAM_DUPLICATE')),
  short_summary TEXT,
  last_action TEXT,
  next_action TEXT,
  last_response_at TEXT,
  owner_agent TEXT NOT NULL DEFAULT 'Nexorait AI',
  related_thread_id TEXT,
  resolution_note TEXT,
  UNIQUE (ticket_year, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  provider TEXT NOT NULL,
  provider_email_id TEXT,
  internet_message_id TEXT,
  in_reply_to TEXT,
  references_header TEXT,
  subject TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  received_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE RESTRICT,
  UNIQUE (provider, provider_email_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_message_id ON ticket_messages(internet_message_id);

CREATE TABLE IF NOT EXISTS inbound_events (
  event_id TEXT PRIMARY KEY,
  claim_token TEXT NOT NULL,
  provider_email_id TEXT,
  internet_message_id TEXT,
  received_at TEXT,
  sender_email TEXT,
  raw_subject TEXT,
  classification TEXT,
  disposition TEXT NOT NULL DEFAULT 'PROCESSING',
  ticket_number TEXT,
  processed_at TEXT,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_inbound_events_provider_email_id ON inbound_events(provider_email_id);
