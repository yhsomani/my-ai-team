import sys

with open('SSOT.md', 'r', encoding='utf-8') as f:
    text = f.read()

# 7. chat archival
text = text.replace(
    'chat-service writes to messaging-service for archival',
    'chat-service publishes a `chat.message.sent` event to RabbitMQ. messaging-service consumes this event and persists the message to PostgreSQL for long-term storage and conversation history retrieval.'
)

# 12. Profile endpoints
profile_eps_search = 'POST   /{userId}/skills       - Add skills                 - Owner       | List<String>        | ProfileDto'
profile_eps_add = '''POST   /{userId}/skills       - Add skills                 - Owner       | List<String>        | ProfileDto
POST   /{userId}/education            - Add education      - Owner       | EducationDto        | ProfileDto
DELETE /{userId}/education/{id}       - Remove education   - Owner       | -                   | {success: true}
POST   /{userId}/certifications       - Add certification  - Owner       | CertificationDto    | ProfileDto
DELETE /{userId}/certifications/{id}  - Remove cert        - Owner       | -                   | {success: true}
POST   /{userId}/portfolio            - Add project        - Owner       | PortfolioDto        | ProfileDto
DELETE /{userId}/portfolio/{id}       - Remove project     - Owner       | -                   | {success: true}'''
text = text.replace(profile_eps_search, profile_eps_add)

# 14. NODE_ENV removal
text = text.replace('  - `NODE_ENV: development|production`\n', '')

# 18. Prompt files
ai_config_search = 'PII Handling policy:'
prompt_files_add = '''System Prompt File Locations:
| Feature | System Prompt File |
|---------|-------------------|
| Resume analysis | ai-service/src/main/resources/prompts/resume-analysis.txt |
| Job match scoring | ai-service/src/main/resources/prompts/job-match.txt |
| Interview prep | ai-service/src/main/resources/prompts/interview-prep.txt |
| Career path | ai-service/src/main/resources/prompts/career-path.txt |
| Chat assistant | ai-service/src/main/resources/prompts/chat-system.txt |

PII Handling policy:'''
text = text.replace(ai_config_search, prompt_files_add)

# 19. WS Auth fail
ws_auth_search = '- Server heartbeat: 10000ms'
ws_auth_add = '''- Server heartbeat: 10000ms
- Authentication Failure Behavior:
  - If Bearer token is missing: server sends `ERROR` frame with message `"Authentication required"`, closes connection.
  - If Bearer token is expired: server sends `ERROR` frame with message `"Token expired"`, closes connection. Client should refresh token and reconnect.
  - If token valid but user banned: server sends `ERROR` frame with message `"Account suspended"`, closes connection.'''
text = text.replace(ws_auth_search, ws_auth_add)

# 26. ai_db schema
ai_db_search = '#### Search Service (search_db)'
ai_db_add = '''#### AI Service (ai_db)
*Note: The AI Service is largely stateless, but maintains conversation history for context retrieval.*
```sql
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    feature_type VARCHAR(50) NOT NULL, -- e.g., 'resume_analysis', 'chat_assistant'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Search Service (search_db)'''
text = text.replace(ai_db_search, ai_db_add)

# 30. LMS instructor
lms_eps_search = 'GET    /courses               - Browse courses             - Public|USER | -                   | List<CourseSummary>'
lms_eps_add = '''POST   /courses               - Create course              - ADMIN|INSTRUCTOR | CourseCreateDto    | CourseDto
GET    /courses               - Browse courses             - Public|USER | -                   | List<CourseSummary>'''
text = text.replace(lms_eps_search, lms_eps_add)

# Rate limiting tech (Section 5.4)
rate_limiting_search = '### 5.4 Rate Limiting'
rate_limiting_add = '''### 5.4 Rate Limiting
*Enforcement Mechanism: Rate limiting is implemented via Spring Cloud Gateway Redis-based limiter with a sliding-window algorithm. Configuration is in `api-gateway/src/main/resources/application.yml` under `spring.cloud.gateway.filters`.*'''
text = text.replace(rate_limiting_search, rate_limiting_add)

# Business rules (Section 19)
br_search = '### 19.2 Standard Definitions'
br_add = '''### 19.2 Standard Definitions

**Connection Request Limits:**
- Daily limits: 20 (Free), 50 (Pro), Unlimited (Enterprise)

**Skill Proficiency Scale:**
- 1 = Beginner (aware, limited practical experience)
- 2 = Elementary (basic tasks with guidance)
- 3 = Intermediate (independent work on routine tasks)
- 4 = Advanced (complex tasks, mentors others)
- 5 = Expert (authoritative knowledge, industry recognition)

**Company-Recruiter Rules:**
- A Recruiter can only be associated with one Company at a time.
- Company creation requires verified RECRUITER role and admin approval.
- Only associated Recruiters can post jobs under the Company entity.'''
text = text.replace(br_search, br_add)

# On-call & Backup (Section 18.3)
ops_search = '### 18.3 Monitoring & Alerts'
ops_add = '''### 18.3 Monitoring & Alerts

**On-Call Runbook & Backup Strategy:**
- Database Backups: Daily automated snapshots via Supabase/RDS. RPO: 1 hour (via WAL), RTO: 4 hours.
- P1 Alerts (System down): Immediate page to on-call engineer via PagerDuty. See `runbooks/P1-outage.md`.
- P2 Alerts (Degraded): Slack notification to #eng-alerts. Handled during business hours.

'''
text = text.replace(ops_search, ops_add)


with open('SSOT.md', 'w', encoding='utf-8') as f:
    f.write(text)

print("Patch applied to SSOT.md")
