
-- Create app_settings table for configuration
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can manage settings, anyone can read non-sensitive
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read app settings"
  ON public.app_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create legal_pages table for CMS-editable legal content
CREATE TABLE public.legal_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  markdown_content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read published legal pages"
  ON public.legal_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can read all legal pages"
  ON public.legal_pages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage legal pages"
  ON public.legal_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create events table for first-party analytics
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}',
  ip_hash text,
  user_agent text,
  route text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own events"
  ON public.events FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text,
  category text NOT NULL DEFAULT 'bug',
  subject text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  route text,
  app_version text,
  browser_info jsonb,
  status text NOT NULL DEFAULT 'open',
  priority text DEFAULT 'normal',
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets"
  ON public.support_tickets FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Create rate_limits table for server-side rate limiting
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_hash text,
  action_type text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, action_type, window_start),
  UNIQUE(ip_hash, action_type, window_start)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Insert default app settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('production_domain', '{"domain": "", "configured": false}'::jsonb, 'Production domain configuration'),
  ('auth_redirect_urls', '{"urls": ["http://localhost:3000", "https://whistle-connect-hub.lovable.app"]}'::jsonb, 'Allowed auth redirect URLs'),
  ('emergency_mode', '{"enabled": false, "message": "Site is temporarily in read-only mode for maintenance."}'::jsonb, 'Emergency read-only mode'),
  ('new_account_restrictions', '{"enabled": true, "hours": 24, "max_links": 1, "max_dms": 5, "post_cooldown_minutes": 5}'::jsonb, 'Restrictions for new accounts'),
  ('captcha_enabled', '{"signup": false, "posting": false}'::jsonb, 'CAPTCHA/honeypot settings'),
  ('require_email_verification', '{"enabled": true}'::jsonb, 'Require verified email before posting'),
  ('backups_enabled', '{"enabled": false, "last_backup": null}'::jsonb, 'Backup status'),
  ('monitoring_enabled', '{"enabled": false}'::jsonb, 'Monitoring status'),
  ('legal_pages_published', '{"published": false}'::jsonb, 'Legal pages publication status');

-- Insert default legal pages
INSERT INTO public.legal_pages (slug, title, markdown_content, is_published) VALUES
  ('terms', 'Terms of Service', '# Terms of Service\n\nWelcome to Whistle. By using our service, you agree to these terms.\n\n## 1. Acceptance of Terms\n\nBy accessing or using Whistle, you agree to be bound by these Terms of Service.\n\n## 2. User Accounts\n\nYou are responsible for maintaining the security of your account.\n\n## 3. Content Guidelines\n\nUsers must follow our content policy when posting.\n\n## 4. Termination\n\nWe may terminate or suspend your account at any time for violations.\n\n## 5. Changes to Terms\n\nWe may update these terms from time to time.', false),
  ('privacy', 'Privacy Policy', '# Privacy Policy\n\n## Information We Collect\n\nWe collect information you provide when creating an account and using our services.\n\n## How We Use Information\n\nWe use your information to provide and improve our services.\n\n## Data Security\n\nWe implement security measures to protect your data.\n\n## Your Rights\n\nYou have the right to access, correct, or delete your personal data.\n\n## Contact Us\n\nFor privacy inquiries, contact us through our support page.', false),
  ('content-policy', 'Content Policy', '# Content Policy\n\n## Community Guidelines\n\nWhistle is a platform for meaningful discussions. Please follow these guidelines:\n\n### Prohibited Content\n\n- Harassment or bullying\n- Hate speech\n- Spam or misleading content\n- Illegal content\n- NSFW content without proper labeling\n\n### Enforcement\n\nViolations may result in content removal or account suspension.', false),
  ('cookies', 'Cookie Notice', '# Cookie Notice\n\n## What Are Cookies\n\nCookies are small text files stored on your device.\n\n## How We Use Cookies\n\nWe use cookies for:\n- Authentication\n- Preferences\n- Analytics\n\n## Managing Cookies\n\nYou can manage cookie preferences in your browser settings.', false),
  ('copyright', 'Copyright & DMCA', '# Copyright & DMCA Policy\n\n## DMCA Takedown Process\n\nIf you believe content infringes your copyright:\n\n1. Send a written notice to our designated agent\n2. Include identification of the copyrighted work\n3. Include identification of the infringing material\n4. Include your contact information\n5. Include a statement of good faith belief\n\n## Counter-Notification\n\nIf your content was removed and you believe it was a mistake, you may submit a counter-notification.', false),
  ('contact', 'Contact Us', '# Contact Us\n\n## Support\n\nFor general support, please use our in-app bug report feature.\n\n## Business Inquiries\n\nFor business inquiries, please reach out through our official channels.\n\n## Report Abuse\n\nTo report abuse or violations, use the report feature on any content.', false),
  ('refunds', 'Refund Policy', '# Refund Policy\n\n## Boost Purchases\n\nBoost purchases are generally non-refundable once the boost has been applied.\n\n## Exceptions\n\nRefunds may be issued in cases of:\n- Technical errors\n- Duplicate charges\n- Unauthorized transactions\n\n## How to Request a Refund\n\nContact our support team with your transaction details.', false),
  ('advertiser-terms', 'Advertiser Terms', '# Advertiser Terms\n\n## Advertising on Whistle\n\nBy advertising on Whistle, you agree to these terms.\n\n## Prohibited Ads\n\n- Misleading content\n- Adult content\n- Illegal products or services\n- Scams or fraud\n\n## Ad Review\n\nAll ads are subject to review before going live.\n\n## Payment Terms\n\nPayment is required before campaigns are activated.', false),
  ('creator-terms', 'Creator Terms', '# Creator Terms\n\n## Monetization Program\n\nCreators can earn through the Whistle monetization program.\n\n## Eligibility\n\n- Account in good standing\n- Minimum activity requirements\n\n## Payouts\n\nPayouts are processed according to our payout schedule.\n\n## Tax Obligations\n\nCreators are responsible for their own tax obligations.', false);

-- Create indexes for performance
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_created_at ON public.events(created_at);
CREATE INDEX idx_events_event_name ON public.events(event_name);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_rate_limits_action ON public.rate_limits(action_type, window_start);

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_pages_updated_at
  BEFORE UPDATE ON public.legal_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
