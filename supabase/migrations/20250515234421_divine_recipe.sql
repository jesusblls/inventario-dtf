/*
  # Add initial alert settings

  1. Changes
    - Add default thresholds for low stock and high demand alerts
    - Insert initial settings records
*/

INSERT INTO alert_settings (type, threshold)
VALUES 
  ('low_stock', 10),
  ('high_demand', 50)
ON CONFLICT (type) DO UPDATE
SET threshold = EXCLUDED.threshold;