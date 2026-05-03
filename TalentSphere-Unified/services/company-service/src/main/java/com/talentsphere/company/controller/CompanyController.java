package com.talentsphere.company.controller;
import jakarta.validation.Valid;
import com.talentsphere.company.entity.Company;
import com.talentsphere.company.service.CompanyService;
import com.talentsphere.contracts.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/companies")
@RequiredArgsConstructor
public class CompanyController {
  private final CompanyService companyService;

  @PostMapping
  @PreAuthorize("hasRole('RECRUITER')")
  public ApiResponse<Company> register(@Valid @RequestBody Company company) {
    return companyService.registerCompany(company);
  }

  @GetMapping
  public ApiResponse<List<Company>> list() {
    return companyService.getAllCompanies();
  }

  @GetMapping("/search")
  public ApiResponse<List<Company>> search(@RequestParam String q) {
    return companyService.searchCompanies(q);
  }

  @GetMapping("/user/{userId}")
  public ApiResponse<Company> getByUser(@PathVariable String userId) {
    return companyService.getCompanyByUserId(userId);
  }

  @GetMapping("/{id}")
  public ApiResponse<Company> get(@PathVariable String id) {
    return companyService.getCompany(id);
  }

  @PutMapping("/{id}")
  public ApiResponse<Company> update(@PathVariable String id, @RequestBody Company company) {
    return companyService.updateCompany(id, company);
  }

  @PostMapping("/{id}/verify")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Company> verify(@PathVariable String id) {
    return companyService.verifyCompany(id);
  }

  @GetMapping("/health")
  public ApiResponse<String> health() {
    return ApiResponse.ok("UP");
  }
}
