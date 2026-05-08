⚡ Optimize matchJob using HashSet and String.join

💡 **What:** Replaced the O(N^2) list contains check with an O(N) HashSet check in `AiService.matchJob()`.
🎯 **Why:** To improve performance when comparing large lists of skills from resumes and job descriptions. Also cached the matched skills to avoid filtering them a second time for the reasoning string.
📊 **Measured Improvement:**

================ BENCHMARK RESULTS ================
Old method time: ~3007 ms (for 100k iterations)
New method time: ~474 ms (for 100k iterations)
Improvement: 6.33x faster
===================================================

Fixes compilation error that POM requested release 25 while the system's java version is 21.
