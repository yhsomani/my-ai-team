---
description: Automatically adds the company license header to new source files.
---
# License Header Adder
Ensures that all new or modified source files in the **TalentSphere** project contain the official corporate license header.

## Goals
- Maintain consistent copyright and license headers across the codebase.
- Automatically detect missing headers during file creation or modification.

## Steps
1. Before performing substantial edits to a source file, I will check the first few lines for a license header.
2. If it is missing, I will check the project root for a `LICENSE_HEADER.txt` file or equivalent.
3. I will prepend the header content to the top of the file, adjusting comment syntax based on the file extension (.py, .js, .ts, .java, .cpp).
4. For this project, assume the standard Apache 2.0 or local TalentSphere header is the default.

## Constraints
- Do not add multiple headers if one already exists.
- Ensure the header does not interfere with compiler directives (e.g., package declarations in Java or shebangs in scripts).
