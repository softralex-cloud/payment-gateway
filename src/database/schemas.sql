-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  country VARCHAR(2),
  tron_address VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment cards table (encrypted)
CREATE TABLE IF NOT EXISTS payment_cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  card_last_four VARCHAR(4),
  card_type VARCHAR(20),
  encrypted_card TEXT NOT NULL,
  card_iv VARCHAR(32) NOT NULL,
  billing_address JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  card_last_four VARCHAR(4),
  card_type VARCHAR(20),
  encrypted_card TEXT,
  card_iv VARCHAR(32),
  usdt_amount DECIMAL(12, 6),
  tron_tx_hash VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  billing_address JSONB,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payments_user_id (user_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_created_at (created_at)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  first_payment_id VARCHAR(255) REFERENCES payments(id),
  next_billing_date DATE,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  last_billing_status VARCHAR(50),
  last_billing_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_status (status),
  INDEX idx_subscriptions_next_billing_date (next_billing_date)
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(255) PRIMARY KEY,
  payment_id VARCHAR(255) NOT NULL REFERENCES payments(id),
  amount DECIMAL(12, 2) NOT NULL,
  usdt_amount DECIMAL(12, 6),
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  tron_tx_hash VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refunds_payment_id (payment_id),
  INDEX idx_refunds_status (status)
);

-- Transactions table (for TRON blockchain tracking)
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  payment_id VARCHAR(255) REFERENCES payments(id),
  refund_id VARCHAR(255) REFERENCES refunds(id),
  tron_tx_hash VARCHAR(255) NOT NULL UNIQUE,
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  amount DECIMAL(12, 6),
  token_symbol VARCHAR(10),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  confirmation_count INT DEFAULT 0,
  block_number BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transactions_tron_tx_hash (tron_tx_hash),
  INDEX idx_transactions_status (status)
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_log_user_id (user_id),
  INDEX idx_audit_log_created_at (created_at)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_payment_cards_user_id ON payment_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);