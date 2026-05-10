import re

with open('TalentSphere-Unified/services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java', 'r') as f:
    content = f.read()

# Replace the PutMapping PreAuthorize
content = re.sub(
    r'@PreAuthorize\("#id == authentication\?\.name or hasRole\(\'ADMIN\'\) or hasRole\(\'ROLE_ADMIN\'\)"\)',
    r'@PreAuthorize("#id == authentication.name or hasRole(\'ADMIN\') or hasRole(\'ROLE_ADMIN\')")',
    content
)

with open('TalentSphere-Unified/services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java', 'w') as f:
    f.write(content)
