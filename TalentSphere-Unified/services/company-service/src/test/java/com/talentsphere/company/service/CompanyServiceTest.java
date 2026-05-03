package com.talentsphere.company.service;

import com.talentsphere.company.entity.Company;
import com.talentsphere.company.repository.CompanyRepository;
import com.talentsphere.contracts.ApiResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @InjectMocks
    private CompanyService companyService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void registerCompany_Success() {
        Company company = Company.builder().name("New Corp").industry("Tech").build();
        when(companyRepository.findByNameContainingIgnoreCase(company.getName())).thenReturn(Collections.emptyList());
        when(companyRepository.save(any(Company.class))).thenReturn(company);
        
        ApiResponse<Company> response = companyService.registerCompany(company);
        
        assertTrue(response.isSuccess());
        verify(companyRepository, times(1)).save(company);
    }

    @Test
    void registerCompany_AlreadyExists() {
        Company company = Company.builder().name("Exist Corp").industry("Tech").build();
        when(companyRepository.findByNameContainingIgnoreCase(company.getName())).thenReturn(List.of(company));
        
        ApiResponse<Company> response = companyService.registerCompany(company);
        
        assertFalse(response.isSuccess());
        assertEquals("Company with this name already exists", response.getMessage());
    }

    @Test
    void getAllCompanies_Success() {
        when(companyRepository.findAll()).thenReturn(List.of(new Company()));
        
        ApiResponse<List<Company>> response = companyService.getAllCompanies();
        
        assertTrue(response.isSuccess());
        assertFalse(response.getData().isEmpty());
    }
}
