package com.talentsphere.networking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NetworkingSuggestion {
    private String suggestedUserId;
    private long mutualConnections;
    private int recommendationScore;
    private List<String> recommendationReasons;
    private String source;
}
