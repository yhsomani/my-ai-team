ALTER TABLE application_drafts
    DROP CONSTRAINT IF EXISTS chk_application_draft_source;

ALTER TABLE application_drafts
    ADD CONSTRAINT chk_application_draft_source CHECK (source IN ('manual', 'profile', 'ai'));

ALTER TABLE application_draft_versions
    DROP CONSTRAINT IF EXISTS chk_application_draft_version_source;

ALTER TABLE application_draft_versions
    ADD CONSTRAINT chk_application_draft_version_source CHECK (source IN ('manual', 'profile', 'ai'));
