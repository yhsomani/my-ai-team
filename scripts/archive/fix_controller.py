import re

with open('TalentSphere-Unified/services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java', 'r') as f:
    content = f.read()

content = content.replace(
    "@PreAuthorize(\"hasRole('USER') or hasRole('ADMIN') or hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')\")\n  public ApiResponse<UserEntity> getProfile(@PathVariable(\"id\") String id) {",
    "@PreAuthorize(\"hasRole('USER') or hasRole('ADMIN') or hasRole('ROLE_USER') or hasRole('ROLE_ADMIN')\")\n  public ApiResponse<UserEntity> getProfile(@org.springframework.security.core.parameters.P(\"id\") @PathVariable(\"id\") String id) {"
)

with open('TalentSphere-Unified/services/user-service/src/main/java/com/talentsphere/user/controller/UserController.java', 'w') as f:
    f.write(content)
