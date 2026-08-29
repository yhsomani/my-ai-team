package com.talentsphere.auth.service;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class MFABenchmarkTest {

    @Test
    public void benchmarkListVsSet() {
        int listSize = 1000; // Testing with a larger size to exaggerate the O(N) vs O(1) impact
        List<String> listCodes = new ArrayList<>();
        Set<String> setCodes = new HashSet<>();

        for (int i = 0; i < listSize; i++) {
            String code = UUID.randomUUID().toString();
            listCodes.add(code);
            setCodes.add(code);
        }

        String targetCode = listCodes.get(listSize - 1); // Worst case for List
        String missCode = "not-in-list";

        // Warmup
        for (int i = 0; i < 10000; i++) {
            listCodes.contains(targetCode);
            setCodes.contains(targetCode);
        }

        int iterations = 100000;

        // Measure List
        long startList = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            listCodes.contains(targetCode);
            listCodes.contains(missCode);
        }
        long endList = System.nanoTime();
        long durationList = endList - startList;

        // Measure Set
        long startSet = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            setCodes.contains(targetCode);
            setCodes.contains(missCode);
        }
        long endSet = System.nanoTime();
        long durationSet = endSet - startSet;

        System.out.println("====== BENCHMARK RESULTS ======");
        System.out.println("Collection Size: " + listSize);
        System.out.println("Iterations: " + iterations);
        System.out.println("List.contains() Duration: " + (durationList / 1_000_000.0) + " ms");
        System.out.println("Set.contains() Duration:  " + (durationSet / 1_000_000.0) + " ms");
        System.out.printf("Speedup: %.2fx faster%n", (double) durationList / durationSet);
        System.out.println("===============================");
    }
}
