-- TalentSphere Search Queries Partitioned Table
-- PostgreSQL month-by-month partitioning for performance

CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    query_text TEXT NOT NULL,
    result_count INTEGER,
    clicked_result_id UUID,
    session_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next 3 months
DO $$
DECLARE
    current_date DATE := CURRENT_DATE;
    partition_date DATE;
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    FOR i IN 0..3 LOOP
        partition_date := DATE_TRUNC('month', current_date + (i || ' months')::INTERVAL);
        partition_name := 'search_queries_' || TO_CHAR(partition_date, 'YYYY_MM');
        start_date := partition_date;
        end_date := partition_date + '1 month'::INTERVAL;
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF search_queries 
            FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END $$;

-- Auto-create future partitions monthly via pg_cron
INSERT INTO pg_cron.job (jobname, schedule, command, database)
VALUES (
    'create_search_partition',
    '0 0 1 * *',
    $$DO $$
DECLARE
    partition_date DATE := DATE_TRUNC(''month'', CURRENT_DATE + ''2 months''::INTERVAL);
    partition_name TEXT := ''search_queries_'' || TO_CHAR(partition_date, ''YYYY_MM'');
    start_date DATE := partition_date;
    end_date DATE := partition_date + ''1 month''::INTERVAL;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = partition_name
    ) THEN
        EXECUTE format(
            ''CREATE TABLE IF NOT EXISTS %I PARTITION OF search_queries 
            FOR VALUES FROM (''%L'') TO (''%L'')'',
            partition_name, start_date, end_date
        );
    END IF;
END $$;$$,
    'talentsphere_search'
);

-- Indexes for common queries
CREATE INDEX idx_search_user ON search_queries(user_id, created_at DESC);
CREATE INDEX idx_search_session ON search_queries(session_id);
CREATE INDEX idx_search_created ON search_queries(created_at DESC);

-- Cleanup old partitions (keep 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_partitions()
RETURNS void AS $$
DECLARE
    old_partition TEXT;
BEGIN
    FOR old_partition IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename ~ '^search_queries_[0-9]{4}_[0-9]{2}$'
        AND tablename < 'search_queries_' || TO_CHAR(CURRENT_DATE - INTERVAL '6 months', 'YYYY_MM')
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || old_partition;
        RAISE NOTICE 'Dropped partition: %', old_partition;
    END LOOP;
END;
$$ LANGUAGE plpgsql;