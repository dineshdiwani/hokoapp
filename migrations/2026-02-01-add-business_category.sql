-- Add business_category column to users table to store seller's chosen category.
-- Uses IF NOT EXISTS to be safe when running multiple times.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS business_category text;