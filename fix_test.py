import re

with open('TalentSphere-Unified/services/user-service/src/test/java/com/talentsphere/user/controller/UserControllerTest.java', 'r') as f:
    content = f.read()

# Fix the duplicate annotation
content = re.sub(
    r'@WithMockUser\(username = "user-123", roles = "USER"\)\n    @org.springframework.security.test.context.support.WithSecurityContext\(factory = org.springframework.security.test.context.support.WithMockUserSecurityContextFactory.class\)',
    r'@WithMockUser(username = "user-123", roles = "USER")',
    content
)
# remove the setupBefore part that was there before
content = re.sub(
    r'@WithMockUser\(username = "user-123", roles = "USER", setupBefore = org.springframework.security.test.context.support.TestExecutionEvent.TEST_EXECUTION\)',
    r'@WithMockUser(username = "user-123", roles = "USER")',
    content
)

with open('TalentSphere-Unified/services/user-service/src/test/java/com/talentsphere/user/controller/UserControllerTest.java', 'w') as f:
    f.write(content)
