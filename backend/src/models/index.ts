export * from './user';
export * from './chart';
export * from './horary';
export * from './compatibility';

import { USER_TABLE_SQL } from './user';
import { CHART_TABLE_SQL } from './chart';
import { HORARY_TABLE_SQL } from './horary';
import { COMPATIBILITY_TABLE_SQL } from './compatibility';

// Prediction history table
export const PREDICTION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  period VARCHAR(20) NOT NULL,
  content JSONB NOT NULL,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(type);
CREATE INDEX IF NOT EXISTS idx_predictions_period ON predictions(period);
`;

// Conversation history for Q&A
export const CONVERSATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  context_chart_id UUID REFERENCES charts(id),
  context_horary_id UUID REFERENCES horary_questions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
`;

// Subscription and payment tracking
export const SUBSCRIPTION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  platform_subscription_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  platform VARCHAR(20) NOT NULL,
  platform_payment_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
`;

// All migrations
export const ALL_MIGRATIONS = [
  USER_TABLE_SQL,
  CHART_TABLE_SQL,
  HORARY_TABLE_SQL,
  COMPATIBILITY_TABLE_SQL,
  PREDICTION_TABLE_SQL,
  CONVERSATION_TABLE_SQL,
  SUBSCRIPTION_TABLE_SQL,
];
