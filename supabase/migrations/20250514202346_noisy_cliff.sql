/*
  # Seed Amazon products data

  1. Changes
    - Add initial product catalog with ASINs and titles
    - Handle conflicts by updating existing records
    
  2. Notes
    - Uses ON CONFLICT clause to safely update existing records
    - Maintains created_at and updated_at timestamps
*/

INSERT INTO amazon_products (asin, title, created_at, updated_at)
VALUES
  ('B0DGL9QV4L', 'Playera The Killers (S, Blanco)', now(), now()),
  ('B0DGL4TWCZ', 'Playera The Killers (M, Blanco)', now(), now()),
  ('B0DGKPXXRX', 'Playera The Killers (M, Rojo)', now(), now()),
  ('B0DHYXDM32', 'Playera Metallica (M)', now(), now()),
  ('B0DFZLCJHS', 'Playera The Warning (M, Negro)', now(), now()),
  ('B0DFZS6GJF', 'Playera The Warning (S, Negro)', now(), now()),
  ('B0DHRTJTQ9', 'Playera de la banda The 1975 (M)', now(), now()),
  ('B0DJGC51SY', 'Playera Metallica (M, Rojo)', now(), now()),
  ('B0DG6LZT8K', 'Playera Retro Honda Civic (M, Beige)', now(), now()),
  ('B0DJGBX994', 'Playera Metallica (S, Blanco)', now(), now()),
  ('B0DFZS8DF6', 'Playera The Warning (M, Blanco)', now(), now()),
  ('B0DK292L33', 'Playera Oversize 100% Algodón (L, Negro)', now(), now()),
  ('B0DJN3LTY5', 'Playera Oasis (L, Negro)', now(), now()),
  ('B0DJGCMRHK', 'Playera Metallica (S, Rojo)', now(), now()),
  ('B0DMJ4P5H4', 'Playera de Twice, Kpop, 100% Algodón, Cuello Redondo, Manga Corta (Negro, M)', now(), now()),
  ('B0DMJCFM19', 'Playera de Twice, Kpop, 100% Algodón, Cuello Redondo, Manga Corta (Blanco, S)', now(), now()),
  ('B0DHRV9CRQ', 'Playera de la banda The 1975 (S)', now(), now()),
  ('B0DG6QKVP6', 'Playera Retro Honda Civic (M, Negro)', now(), now()),
  ('B0DMHYP6W2', 'Playera de Twice, Kpop, 100% Algodón, Cuello Redondo, Manga Corta (Negro, L)', now(), now()),
  ('B0DMJ6YPFJ', 'Playera de Twice, Kpop, 100% Algodón, Cuello Redondo, Manga Corta (Negro, S)', now(), now()),
  ('B0DK22R8R6', 'Playera Oversize 100% Algodón (M, Blanco)', now(), now()),
  ('B0DQ28VDKB', 'Sudadera Negra de la Banda de Rock The Warning (M)', now(), now()),
  ('B0DK22TGYX', 'Playera Oversize 100% Algodón (S, Negro)', now(), now()),
  ('B0DGL3X31Z', 'Playera Muse Logo (Absolution/The 2nd Law) (M, The 2nd Law)', now(), now()),
  ('B0DQ29X421', 'Sudadera Negra de la Banda de Rock The Warning (S)', now(), now()),
  ('B0DQ2BNTDQ', 'Sudadera Negra de la Banda de Rock The Warning (L)', now(), now()),
  ('B0DMJLBHDK', 'Playera de Twice, Kpop, 100% Algodón, Cuello Redondo, Manga Corta (Blanco, L)', now(), now()),
  ('B0DK283LK3', 'Playera Oversize 100% Algodón (M, Negro)', now(), now()),
  ('B00SV7568U', 'Gildan Sudadera con Capucha de Forro Polar para hombre, Estilo G18500, Negro, Medium', now(), now()),
  ('B09S6WHXFY', 'Gildan - Playera Unisex de algodón Pesado, Estilo G5000, Paquete múltiple, Negro (3 Paquetes), M', now(), now())
ON CONFLICT (asin) DO UPDATE
SET
  title = EXCLUDED.title,
  updated_at = now();