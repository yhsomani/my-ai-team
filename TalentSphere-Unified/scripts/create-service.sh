#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: ./create-service.sh <module-name>"
    echo "Example: ./create-service.sh order"
    exit 1
fi

MODULE_NAME=$1
BACKEND_DIR="backend"
PACKAGE_NAME="com.talentsphere.${MODULE_NAME}"

echo "Creating Spring Boot module: ${MODULE_NAME}"

MODULE_DIR="${BACKEND_DIR}/src/main/java/${PACKAGE_NAME//./\/}"
mkdir -p "${MODULE_DIR}/controller" "${MODULE_DIR}/service" "${MODULE_DIR}/repository" "${MODULE_DIR}/entity" "${MODULE_DIR}/dto"

# Create entity
cat > "${MODULE_DIR}/entity/${MODULE_NAME^}.java" << JAVAEOF
package ${PACKAGE_NAME}.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "${MODULE_NAME}s")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${MODULE_NAME^} {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
JAVAEOF

# Create repository
cat > "${MODULE_DIR}/repository/${MODULE_NAME^}Repository.java" << JAVAEOF
package ${PACKAGE_NAME}.repository;

import ${PACKAGE_NAME}.entity.${MODULE_NAME^};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ${MODULE_NAME^}Repository extends JpaRepository<${MODULE_NAME^}, UUID> {
}
JAVAEOF

# Create service
cat > "${MODULE_DIR}/service/${MODULE_NAME^}Service.java" << JAVAEOF
package ${PACKAGE_NAME}.service;

import ${PACKAGE_NAME}.entity.${MODULE_NAME^};
import ${PACKAGE_NAME}.repository.${MODULE_NAME^}Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ${MODULE_NAME^}Service {
    private final ${MODULE_NAME^}Repository repository;
    
    @Transactional
    public ${MODULE_NAME^} create(${MODULE_NAME^} entity) {
        return repository.save(entity);
    }
    
    @Transactional(readOnly = true)
    public List<${MODULE_NAME^}> findAll() {
        return repository.findAll();
    }
    
    @Transactional(readOnly = true)
    public ${MODULE_NAME^} findById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("${MODULE_NAME^} not found"));
    }
    
    @Transactional
    public void delete(UUID id) {
        repository.deleteById(id);
    }
}
JAVAEOF

# Create controller
cat > "${MODULE_DIR}/controller/${MODULE_NAME^}Controller.java" << JAVAEOF
package ${PACKAGE_NAME}.controller;

import ${PACKAGE_NAME}.entity.${MODULE_NAME^};
import ${MODULE_NAME^}.service.${MODULE_NAME^}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/${MODULE_NAME}s")
@RequiredArgsConstructor
public class ${MODULE_NAME^}Controller {
    private final ${MODULE_NAME^}Service service;
    
    @PostMapping
    public ResponseEntity<${MODULE_NAME^}> create(@RequestBody ${MODULE_NAME^} entity) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(entity));
    }
    
    @GetMapping
    public ResponseEntity<List<${MODULE_NAME^}>> getAll() {
        return ResponseEntity.ok(service.findAll());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<${MODULE_NAME^}> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.findById(id));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
JAVAEOF

echo "Module ${MODULE_NAME} created successfully!"
echo "Created files:"
ls -la "${MODULE_DIR}/"
