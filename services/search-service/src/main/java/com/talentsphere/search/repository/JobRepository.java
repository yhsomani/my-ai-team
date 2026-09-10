package com.talentsphere.search.repository;

import com.talentsphere.search.document.JobDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JobRepository extends ElasticsearchRepository<JobDocument, String> {
    Page<JobDocument> findByTitleContainingOrDescriptionContaining(String title, String description, Pageable pageable);
    Page<JobDocument> findByLocation(String location, Pageable pageable);
    Page<JobDocument> findByCompanyName(String companyName, Pageable pageable);
}
