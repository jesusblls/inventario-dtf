/*
  # Seed Amazon Products

  1. Changes
    - Add initial seed data for amazon_products table
    - Include a variety of products with different categories
    - Use realistic ASINs and titles
*/

INSERT INTO amazon_products (asin, title, created_at, updated_at)
VALUES
  ('B08F1ZZQM4', 'Gildan Men''s Ultra Cotton T-Shirt, Style G2000, Multipack', now(), now()),
  ('B08F2HHWK9', 'Hanes Men''s EcoSmart Sweatshirt', now(), now()),
  ('B08F3JJQN5', 'Champion Men''s Classic Jersey T-Shirt', now(), now()),
  ('B08F4KKRM6', 'Fruit of the Loom Men''s Eversoft Cotton T-Shirt', now(), now()),
  ('B08F5LLSN7', 'Amazon Essentials Men''s Regular-Fit Cotton Pique Polo Shirt', now(), now()),
  ('B08F6MMTP8', 'Under Armour Men''s Tech 2.0 Short-Sleeve T-Shirt', now(), now()),
  ('B08F7NNUQ9', 'Nike Men''s Legend Short-Sleeve T-Shirt', now(), now()),
  ('B08F8PPVR1', 'Adidas Men''s Badge of Sport Basic Tee', now(), now()),
  ('B08F9QQWS2', 'Russell Athletic Men''s Cotton Performance T-Shirt', now(), now()),
  ('B08F1RRXT3', 'Jerzees Men''s Dri-Power Active T-Shirt', now(), now()),
  ('B08F2SSYU4', 'Port & Company Men''s Essential T-Shirt', now(), now()),
  ('B08F3TTZV5', 'Next Level Men''s Premium Fitted CVC Crew Tee', now(), now()),
  ('B08F4UUAW6', 'Bella + Canvas Unisex Jersey Short-Sleeve T-Shirt', now(), now()),
  ('B08F5VVBX7', 'American Apparel Men''s Fine Jersey Crewneck T-Shirt', now(), now()),
  ('B08F6WWCY8', 'Comfort Colors Men''s Adult Short-Sleeve Tee', now(), now())
ON CONFLICT (asin) DO UPDATE
SET 
  title = EXCLUDED.title,
  updated_at = now();