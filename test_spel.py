import re

with open('TalentSphere-Unified/services/user-service/src/test/java/com/talentsphere/user/config/TestSecurityConfig.java', 'r') as f:
    content = f.read()

# Make sure DefaultMethodSecurityExpressionHandler is configured properly, or simpler: just change the controller to use something else or fix parameter resolution.
# Let's inspect the exact path resolution in Spring
