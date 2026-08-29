CREATE OR REPLACE FUNCTION enforce_job_publish_readiness()
RETURNS TRIGGER AS $$
DECLARE
    requirement_count INTEGER;
BEGIN
    IF NEW.status = 'PUBLISHED' THEN
        SELECT COUNT(*)
        INTO requirement_count
        FROM unnest(COALESCE(NEW.requirements, ARRAY[]::TEXT[])) AS requirement
        WHERE btrim(requirement) <> '';

        IF btrim(COALESCE(NEW.title, '')) = '' THEN
            RAISE EXCEPTION 'Cannot publish job without a title'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF btrim(COALESCE(NEW.description, '')) = '' THEN
            RAISE EXCEPTION 'Cannot publish job without a description'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF btrim(COALESCE(NEW.location, '')) = '' THEN
            RAISE EXCEPTION 'Cannot publish job without a location'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF NEW.company_id IS NULL THEN
            RAISE EXCEPTION 'Cannot publish job without company context'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;

        IF requirement_count = 0 THEN
            RAISE EXCEPTION 'Cannot publish job without at least one requirement'
                USING ERRCODE = '23514', CONSTRAINT = 'job_publish_readiness';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_jobs_publish_readiness ON jobs;
CREATE TRIGGER enforce_jobs_publish_readiness
    BEFORE INSERT OR UPDATE OF status, title, description, location, company_id, requirements
    ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION enforce_job_publish_readiness();
