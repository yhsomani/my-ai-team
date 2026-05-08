import psycopg2
import os

# Configuration
DB_HOST = "localhost"
DB_USER = "postgres"
DB_PASS = "postgres"

# Mapping services to DB names
MAPPING = {
    "ai-service": "ai_db",
    "application-service": "application_db",
    "auth-service": "auth_db",
    "challenge-service": "challenge_db",
    "chat-service": "chat_db",
    "company-service": "company_db",
    "gamification-service": "gamification_db",
    "job-service": "job_db",
    "lms-service": "lms_db",
    "messaging-service": "messaging_db",
    "networking-service": "networking_db",
    "notification-service": "notification_db",
    "profile-service": "profile_db",
    "search-service": "search_db",
    "user-service": "user_db",
}

def get_connection(dbname):
    return psycopg2.connect(
        host=DB_HOST,
        database=dbname,
        user=DB_USER,
        password=DB_PASS,
        port=5432
    )

def run_migration(service_name, db_name):
    # Find the V1 script in the service's resources
    script_path = f"../services/{service_name}/src/main/resources/db/migration/V1__Initial_Schema.sql"
    if not os.path.exists(script_path):
        print(f"Skipping {service_name}: {script_path} not found.")
        return

    print(f"Migrating {service_name} -> {db_name}...")
    try:
        conn = get_connection(db_name)
        cur = conn.cursor()
        with open(script_path, 'r', encoding='utf-8') as f:
            sql = f.read()
        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        print(f"SUCCESS: {service_name}")
    except Exception as e:
        print(f"FAILED: {service_name}: {e}")

if __name__ == "__main__":
    for service, db in MAPPING.items():
        run_migration(service, db)
