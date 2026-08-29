#!/bin/bash
# TalentSphere Documentation Validator Script
# Validates markdown files for broken links and syntax

set -e

echo "======================================"
echo "TalentSphere Documentation Validator"
echo "======================================"

ERRORS=0

# Function to validate markdown links
validate_links() {
    local file=$1
    local dir=$(dirname "$file")
    
    # Check for relative links that might be broken
    grep -oE '\[.*\]\([^)]+\)' "$file" 2>/dev/null | while read -r link; do
        # Extract the URL
        url=$(echo "$link" | sed 's/.*](\(.*)\)/\1/' | sed 's/)$//')
        
        # Skip external URLs and anchors
        [[ "$url" =~ ^http ]] && continue
        [[ "$url" =~ ^# ]] && continue
        [[ "$url" =~ ^mailto ]] && continue
        
        # Check if relative link target exists
        if [ -n "$url" ]; then
            target="$dir/$url"
            if [[ "$url" == /* ]]; then
                target="$url"
            fi
            
            # Remove fragment and query
            target="${target%%#*}"
            target="${target%%\?*}"
            
            if [ ! -e "$target" ]; then
                echo "BROKEN LINK: $file -> $url"
                ((ERRORS++))
            fi
        fi
    done
}

echo "Checking markdown files..."

# Find all markdown files
for md_file in $(find . -name "*.md" -type f 2>/dev/null | grep -v node_modules | grep -v ".git"); do
    validate_links "$md_file"
done

echo ""
echo "Checking for TODO markers..."
TODO_COUNT=$(grep -r "TODO" --include="*.md" . 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    echo "Found $TODO_COUNT TODO comments in documentation"
else
    echo "No TODO markers found"
fi

echo ""
echo "Checking documentation structure..."

REQUIRED_DOCS=(
    "README.md"
    "CLAUDE.md"
    "ISSUES.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "  OK: $doc exists"
    else
        echo "  MISSING: $doc"
        ((ERRORS++))
    fi
done

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "Documentation validation passed"
    exit 0
else
    echo "Found $ERRORS documentation issues"
    exit 1
fi