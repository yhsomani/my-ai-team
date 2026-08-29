package com.talentsphere.ai.service;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;

public class AiServiceBenchmarkTest {

    @Test
    public void benchmark() {
        // 1. Setup Data
        List<String> resumeSkills = new ArrayList<>();
        List<String> jobSkills = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            resumeSkills.add("skill" + i);
            jobSkills.add("skill" + (i + 25)); // 25 overlapping skills
        }

        // 2. Warmup
        for (int i = 0; i < 20000; i++) {
            oldMethod(resumeSkills, jobSkills);
            newMethod(resumeSkills, jobSkills);
        }

        // 3. Measure Old
        long startOld = System.nanoTime();
        for (int i = 0; i < 100000; i++) {
            oldMethod(resumeSkills, jobSkills);
        }
        long timeOld = System.nanoTime() - startOld;

        // 4. Measure New
        long startNew = System.nanoTime();
        for (int i = 0; i < 100000; i++) {
            newMethod(resumeSkills, jobSkills);
        }
        long timeNew = System.nanoTime() - startNew;

        System.out.println("================ BENCHMARK RESULTS ================");
        System.out.println("Old method time: " + timeOld / 1_000_000.0 + " ms");
        System.out.println("New method time: " + timeNew / 1_000_000.0 + " ms");
        System.out.println("Improvement: " + String.format("%.2f", (double)timeOld / timeNew) + "x faster");
        System.out.println("===================================================");
    }

    private void oldMethod(List<String> resumeSkills, List<String> jobSkills) {
        long matches = resumeSkills.stream().filter(jobSkills::contains).count();
        double score = (double) matches / jobSkills.size();

        if (matches > 0 && score < 0.3) score = 0.45;
        if (score > 0.95) score = 0.98;

        String reasoning = matches > 0
            ? "Strong skill overlap in: " + String.join(", ", resumeSkills.stream().filter(jobSkills::contains).toList())
            : "No direct skill overlap detected; secondary resonance analysis recommended.";
    }

    private void newMethod(List<String> resumeSkills, List<String> jobSkills) {
        Set<String> jobSkillsSet = new HashSet<>(jobSkills);
        List<String> matchedSkills = resumeSkills.stream()
                .filter(jobSkillsSet::contains)
                .toList();

        long matches = matchedSkills.size();
        double score = (double) matches / jobSkills.size();

        if (matches > 0 && score < 0.3) score = 0.45;
        if (score > 0.95) score = 0.98;

        String reasoning = matches > 0
            ? "Strong skill overlap in: " + String.join(", ", matchedSkills)
            : "No direct skill overlap detected; secondary resonance analysis recommended.";
    }
}
