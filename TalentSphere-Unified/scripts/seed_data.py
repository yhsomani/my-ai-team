import psycopg2
from faker import Faker
import uuid
import datetime
import random
import os
import sys

fake = Faker()

# Configuration
DB_HOST = os.environ.get("TALENTSPHERE_SEED_DB_HOST", "localhost")
DB_PORT = int(os.environ.get("TALENTSPHERE_SEED_DB_PORT", "5432"))
DB_USER = os.environ.get("TALENTSPHERE_SEED_DB_USER", "postgres")
DB_PASS = os.environ.get("TALENTSPHERE_SEED_DB_PASSWORD", "postgres")

ALLOWED_SEED_ENVIRONMENTS = {"local", "development", "dev", "test", "testing", "ci"}
LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1", "postgres", "db", "host.docker.internal"}
DESTRUCTIVE_SEED_CONFIRMATION = "I_UNDERSTAND_SEED_DATA_WILL_TRUNCATE_LOCAL_DATA"

# Standard BCrypt hash for "password123"
PASSWORD_HASH = "$2a$10$8.UnVuG9HHgffUDAlk8UXuS5k7u7SGs6A/7.iV1.8U0pU.fXF/jCu"

def current_seed_environment():
    return (
        os.environ.get("TALENTSPHERE_SEED_ENV")
        or os.environ.get("APP_ENV")
        or os.environ.get("ENVIRONMENT")
        or os.environ.get("NODE_ENV")
        or ""
    ).strip().lower()

def validate_seed_environment():
    seed_env = current_seed_environment()
    if seed_env not in ALLOWED_SEED_ENVIRONMENTS:
        sys.exit(
            "Refusing to run destructive seed data outside local/dev/test/ci. "
            "Set TALENTSPHERE_SEED_ENV to one of: "
            + ", ".join(sorted(ALLOWED_SEED_ENVIRONMENTS))
        )

    if os.environ.get("ALLOW_DESTRUCTIVE_SEED_DATA") != DESTRUCTIVE_SEED_CONFIRMATION:
        sys.exit(
            "Refusing to truncate seed tables without explicit confirmation. "
            f"Set ALLOW_DESTRUCTIVE_SEED_DATA={DESTRUCTIVE_SEED_CONFIRMATION}"
        )

    if DB_HOST not in LOCAL_DB_HOSTS and os.environ.get("ALLOW_REMOTE_DEV_SEED") != DESTRUCTIVE_SEED_CONFIRMATION:
        sys.exit(
            f"Refusing to run destructive seed data against non-local host {DB_HOST!r}. "
            f"Set ALLOW_REMOTE_DEV_SEED={DESTRUCTIVE_SEED_CONFIRMATION} only for reviewed dev/test databases."
        )

def get_connection(dbname):
    return psycopg2.connect(
        host=DB_HOST,
        database=dbname,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT
    )

def seed_users():
    print("Clearing and Seeding users (user_db)...")
    conn = get_connection("user_db")
    cur = conn.cursor()
    cur.execute("TRUNCATE users, user_profiles CASCADE;")
    
    users = []
    # 1 Admin
    admin_id = str(uuid.uuid4())
    first_name, last_name = "System", "Admin"
    email = "admin@talentsphere.ai"
    cur.execute(
        "INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (%s, %s, %s, %s, %s, %s)",
        (admin_id, email, PASSWORD_HASH, first_name, last_name, "ADMIN")
    )
    # Also seed user_profiles (in same DB)
    cur.execute(
        "INSERT INTO user_profiles (id, email, first_name, last_name, bio, headline) VALUES (%s, %s, %s, %s, %s, %s)",
        (str(uuid.uuid4()), email, first_name, last_name, "I am the system admin.", "Administrator")
    )
    users.append((admin_id, "ADMIN"))

    # 5 Recruiters
    for _ in range(5):
        uid = str(uuid.uuid4())
        fname, lname = fake.first_name(), fake.last_name()
        email = fake.unique.email()
        cur.execute(
            "INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (%s, %s, %s, %s, %s, %s)",
            (uid, email, PASSWORD_HASH, fname, lname, "RECRUITER")
        )
        cur.execute(
            "INSERT INTO user_profiles (id, email, first_name, last_name, headline) VALUES (%s, %s, %s, %s, %s)",
            (str(uuid.uuid4()), email, fname, lname, "Talent Acquisition Specialist")
        )
        users.append((uid, "RECRUITER"))

    # 10 Candidates
    for _ in range(10):
        uid = str(uuid.uuid4())
        fname, lname = fake.first_name(), fake.last_name()
        email = fake.unique.email()
        cur.execute(
            "INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (%s, %s, %s, %s, %s, %s)",
            (uid, email, PASSWORD_HASH, fname, lname, "USER")
        )
        cur.execute(
            "INSERT INTO user_profiles (id, email, first_name, last_name, bio, headline) VALUES (%s, %s, %s, %s, %s, %s)",
            (str(uuid.uuid4()), email, fname, lname, fake.text(max_nb_chars=200), fake.job())
        )
        users.append((uid, "USER"))
        
    conn.commit()
    cur.close()
    conn.close()
    return users

def seed_jobs(recruiters):
    print("Clearing and Seeding jobs (job_db)...")
    conn = get_connection("job_db")
    cur = conn.cursor()
    cur.execute("TRUNCATE jobs CASCADE;")
    # Correct columns: id, active, company_id, currency, description, job_type, location, posted_at, salary_max, salary_min, title
    job_ids = []
    for _ in range(25):
        jid = str(uuid.uuid4())
        job_title = fake.job()
        cur.execute(
            "INSERT INTO jobs (id, active, company_id, currency, description, job_type, location, posted_at, salary_max, salary_min, title) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (jid, True, str(uuid.uuid4()), "USD", fake.text(max_nb_chars=200), random.choice(["FULL_TIME", "CONTRACT", "REMOTE"]), fake.city(), datetime.datetime.now(), 150000.00, 90000.00, job_title)
        )
        job_ids.append(jid)
    
    conn.commit()
    cur.close()
    conn.close()
    return job_ids

def seed_applications(candidates, jobs):
    print("Clearing and Seeding applications (application_db)...")
    conn = get_connection("application_db")
    cur = conn.cursor()
    cur.execute("TRUNCATE job_applications CASCADE;")
    # Correct columns: id, applied_at, cover_letter, job_id, resume_url, status, user_id
    for candidate_id, _ in candidates[:7]:
        job_id = random.choice(jobs)
        cur.execute(
            "INSERT INTO job_applications (id, applied_at, cover_letter, job_id, resume_url, status, user_id) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (str(uuid.uuid4()), datetime.datetime.now(), "I am excited to apply!", job_id, "https://storage.talentsphere.ai/resumes/" + str(uuid.uuid4()) + ".pdf", "PENDING", candidate_id)
        )
        
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    try:
        validate_seed_environment()
        users = seed_users()
        candidates = [u for u in users if u[1] == "USER"]
        recruiters = [u for u in users if u[1] == "RECRUITER"]
        jobs = seed_jobs(recruiters)
        seed_applications(candidates, jobs)
        print("SEEDING COMPLETE: TalentSphere is now populated for Audit.")
    except Exception as e:
        print(f"CRITICAL SEED ERROR: {e}")
