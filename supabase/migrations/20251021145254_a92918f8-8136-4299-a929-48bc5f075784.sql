-- Add discount and shipping fields to budget_items
ALTER TABLE budget_items 
ADD COLUMN desconto numeric DEFAULT 0,
ADD COLUMN tipo_desconto text DEFAULT 'percentual' CHECK (tipo_desconto IN ('percentual', 'valor'));

-- Add shipping and discount fields to budgets
ALTER TABLE budgets 
ADD COLUMN frete numeric DEFAULT 0,
ADD COLUMN desconto_total numeric DEFAULT 0;

-- Add profile fields for company information
ALTER TABLE profiles
ADD COLUMN cpf_cnpj text,
ADD COLUMN telefone text,
ADD COLUMN email text,
ADD COLUMN endereco text,
ADD COLUMN logo_url text;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for logos
CREATE POLICY "Users can view all logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Users can upload their own logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);