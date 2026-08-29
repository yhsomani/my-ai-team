ALTER TABLE resume_export_events
  DROP CONSTRAINT IF EXISTS chk_resume_export_method;

ALTER TABLE resume_export_events
  ADD CONSTRAINT chk_resume_export_method
  CHECK (method IN ('browser-print', 'html-download', 'native-pdf', 'provider-pdf'));
