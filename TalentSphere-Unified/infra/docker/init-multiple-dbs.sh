#!/bin/bash
set -e
for DB in auth_db user_db profile_db job_db application_db company_db \
          notification_db search_db analytics_db gamification_db challenge_db \
          lms_db video_db file_db email_db messaging_db networking_db payment_db \
          ai_db chat_db; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE $DB;
    GRANT ALL PRIVILEGES ON DATABASE $DB TO $POSTGRES_USER;
EOSQL
  echo "Created database: $DB"
done
