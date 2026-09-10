package com.talentsphere.search.messaging;

import com.talentsphere.search.document.JobDocument;
import com.talentsphere.search.document.ProfileDocument;
import com.talentsphere.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SearchConsumer {
    private final SearchService searchService;

    @RabbitListener(queues = "search.job.queue")
    public void consumeJobEvent(Map<String, Object> event) {
        log.info("Indexing job event: {}", event);
        try {
            JobDocument job = JobDocument.builder()
                    .id(event.get("id").toString())
                    .title((String) event.get("title"))
                    .description((String) event.get("description"))
                    .location((String) event.get("location"))
                    .companyId((String) event.get("companyId"))
                    .status("ACTIVE")
                    .postedAt(LocalDateTime.now()) // Or parse from event
                    .build();
            
            searchService.indexJob(job);
            log.info("Successfully indexed job: {}", job.getId());
        } catch (Exception e) {
            log.error("Failed to process job indexing event", e);
        }
    }

    @RabbitListener(queues = "search.profile.queue")
    public void consumeProfileEvent(Map<String, Object> event) {
        log.info("Indexing profile event: {}", event);
        try {
            // Robust mapping for profile
            String fullName = (String) event.get("fullName");
            String firstName = "";
            String lastName = "";
            
            if (fullName != null) {
                String[] parts = fullName.split(" ", 2);
                firstName = parts[0];
                lastName = parts.length > 1 ? parts[1] : "";
            }

            ProfileDocument profile = ProfileDocument.builder()
                    .id(event.get("userId").toString())
                    .firstName(firstName)
                    .lastName(lastName)
                    .headline((String) event.get("headline"))
                    .summary((String) event.get("summary"))
                    .location((String) event.get("location"))
                    .build();
            
            searchService.indexProfile(profile);
            log.info("Successfully indexed profile: {}", profile.getId());
        } catch (Exception e) {
            log.error("Failed to process profile indexing event", e);
        }
    }
}
