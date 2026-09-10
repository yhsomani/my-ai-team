package com.talentsphere.company.repository;
import com.talentsphere.company.entity.Company;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface CompanyRepository extends MongoRepository<Company, String> {
  Optional<Company> findByName(String name);
  Optional<Company> findByOwnerUserId(String ownerUserId);
  List<Company> findByNameContainingIgnoreCase(String name);
}
