-- Add missing column for payment intent tracking
ALTER TABLE public.post_boosts ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Fix the pending boost that already paid
UPDATE public.post_boosts 
SET status = 'succeeded', stripe_payment_intent_id = 'pi_3SqELOEZ5vGMIG5X01F4SlQi'
WHERE id = 'e148b598-3f84-4bfa-8e1a-49783283fddd' AND status = 'pending';