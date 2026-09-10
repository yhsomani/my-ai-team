package com.talentsphere.search.repository;

import com.talentsphere.search.document.ProfileDocument;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface ProfileRepository extends ElasticsearchRepository<ProfileDocument, String> {
    Page<ProfileDocument> findByFirstNameContainingOrLastNameContainingOrHeadlineContaining(String first, String last, String headline, Pageable pageable);
    Page<ProfileDocument> findBySkillsIn(List<String> skills, Pageable pageable);
    Page<ProfileDocument> findByLocation(String location, Pageable pageable);
}
