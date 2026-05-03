-- TalentSphere Database Initialization
-- This script runs on first PostgreSQL container startup

-- Create separate databases for each service (microservice pattern)
CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE profile_db;
CREATE DATABASE job_db;
CREATE DATABASE application_db;
CREATE DATABASE challenge_db;
CREATE DATABASE gamification_db;
CREATE DATABASE messaging_db;
CREATE DATABASE networking_db;
CREATE DATABASE ai_db;
CREATE DATABASE chat_db;
CREATE DATABASE payment_db;
CREATE DATABASE pathway_db;

-- Enable extensions
\c auth_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c user_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c profile_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c job_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c application_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c challenge_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c gamification_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c messaging_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c networking_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c ai_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c chat_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c payment_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c pathway_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
