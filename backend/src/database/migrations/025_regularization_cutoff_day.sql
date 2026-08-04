-- Replace the days-window policy with a month-end cutoff day.
-- regularization_cutoff_day: employees must submit regularization requests for month M
-- by this day of month M+1. Default = 5 (5th of the following month).
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('regularization_cutoff_day', '5')
ON CONFLICT (setting_key) DO NOTHING;
