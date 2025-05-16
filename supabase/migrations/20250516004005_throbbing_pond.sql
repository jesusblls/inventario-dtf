/*
  # Add unique constraint to alert_settings type column

  1. Changes
    - Add unique constraint on 'type' column in alert_settings table
    This allows the ON CONFLICT clause to work properly in upserts

  2. Security
    - No security changes required
*/

ALTER TABLE alert_settings
ADD CONSTRAINT alert_settings_type_unique UNIQUE (type);