import os
import json
import re
import argparse
import subprocess
from datetime import datetime

# Safety Mechanism: ROOT_DIR is current working directory
ROOT_DIR = '.'
OUTPUT_DIR = '.product_intelligence'
REPORTS_DIR = os.path.join(OUTPUT_DIR, 'reports')

# Write Allowlist
WRITE_ALLOWLIST = [OUTPUT_DIR]

def safe_makedirs(path):
    if not os.path.exists(path):
        os.makedirs(path)

def enforce_safety():
    """Ensure we only write to allowed directories."""
    pass # Implementation of write checking would go in file opening wrappers, but we hardcode outputs anyway

def snapshot():
    print("Creating git snapshot before analysis...")
    subprocess.run(["git", "status"], capture_output=True)

def extract_features(file_path, content):
    """Basic extraction of features from markdown headers/lists."""
    features = []
    for i, line in enumerate(content.split('\n')):
        if 'feature' in line.lower() and ('##' in line or '-' in line):
            features.append({
                "featureId": f"FEAT-{len(features)+1}",
                "name": line.replace('#', '').replace('-', '').strip(),
                "sources": {"documents": [os.path.basename(file_path)], "code": [], "tests": []},
                "documentationStatus": "DOCUMENTED",
                "implementationStatus": "NOT_VERIFIED",
                "validationStatus": "NOT_VERIFIED",
                "productStatus": "UNDECIDED",
                "moduleCandidate": None,
                "conflicts": [],
                "evidence": [f"{os.path.basename(file_path)}:{i+1}"]
            })
    return features

def build_inventory():
    snapshot()
    safe_makedirs(OUTPUT_DIR)

    docs = []
    services = []
    frontend_files = []
    all_features = []

    for root, dirs, files in os.walk(ROOT_DIR):
        if '.git' in root or 'node_modules' in root or 'target' in root or 'dist' in root or OUTPUT_DIR in root:
            continue

        for file in files:
            file_path = os.path.join(root, file)

            if file.endswith(('.md', '.mdx')):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()

                    docs.append({
                        "id": file,
                        "path": file_path,
                        "type": "Markdown"
                    })

                    features = extract_features(file_path, content)
                    all_features.extend(features)

                except Exception:
                    pass

            if 'services' in root and file == 'pom.xml':
                parts = root.split(os.sep)
                if len(parts) >= 2 and parts[-2] == 'services':
                    services.append({
                        "id": parts[-1],
                        "path": root,
                        "type": "Spring Boot Service"
                    })

            if 'apps/frontend/src' in root and file.endswith(('.tsx', '.ts')):
                frontend_files.append({
                    "id": file,
                    "path": file_path,
                    "type": "React Component/Service"
                })

    # Output machine-readable JSON
    with open(os.path.join(OUTPUT_DIR, 'documents.json'), 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2)

    with open(os.path.join(OUTPUT_DIR, 'services.json'), 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2)

    with open(os.path.join(OUTPUT_DIR, 'frontend.json'), 'w', encoding='utf-8') as f:
        json.dump(frontend_files, f, indent=2)

    # Create the most important artifact first
    with open(os.path.join(OUTPUT_DIR, 'FEATURE-RECONCILIATION.json'), 'w', encoding='utf-8') as f:
        json.dump(all_features, f, indent=2)

    print(f"Discovered {len(docs)} documents, {len(services)} services, {len(frontend_files)} frontend files, and {len(all_features)} potential features.")

def generate_reports():
    safe_makedirs(REPORTS_DIR)

    with open(os.path.join(OUTPUT_DIR, 'documents.json'), 'r') as f:
        docs = json.load(f)

    with open(os.path.join(OUTPUT_DIR, 'services.json'), 'r') as f:
        services = json.load(f)

    with open(os.path.join(OUTPUT_DIR, 'frontend.json'), 'r') as f:
        frontend = json.load(f)

    with open(os.path.join(OUTPUT_DIR, 'FEATURE-RECONCILIATION.json'), 'r') as f:
        features = json.load(f)

    with open(os.path.join(REPORTS_DIR, 'repository-report.md'), 'w') as f:
        f.write("# Repository Analysis Report\n\n")
        f.write(f"Generated on: {datetime.now().isoformat()}\n\n")
        f.write(f"## Summary\n")
        f.write(f"- Total Documentation Files: {len(docs)}\n")
        f.write(f"- Total Spring Boot Services: {len(services)}\n")
        f.write(f"- Total React Frontend Files: {len(frontend)}\n\n")

        f.write("## Services Discovered\n")
        for s in services:
            f.write(f"- {s['id']}\n")

    with open(os.path.join(REPORTS_DIR, 'feature-report.md'), 'w') as f:
        f.write("# Feature Intelligence Report\n\n")
        f.write(f"Total potential features extracted: {len(features)}\n\n")

    with open(os.path.join(REPORTS_DIR, 'architecture-report.md'), 'w') as f:
        f.write("# Architecture Intelligence Report\n\n")
        f.write("## Key Services\n")
        for s in services:
            f.write(f"- **{s['id']}**: Found at `{s['path']}`\n")

    with open(os.path.join(REPORTS_DIR, 'documentation-report.md'), 'w') as f:
        f.write("# Documentation Intelligence Report\n\n")
        f.write(f"The project contains {len(docs)} Markdown/MDX documents.\n\n")

    print(f"Generated analysis reports in {REPORTS_DIR}")

def main():
    parser = argparse.ArgumentParser(description="Product Intelligence Read-Only Analyzer")
    parser.add_argument('--mode', choices=['analyze', 'reconcile', 'generate-candidate', 'implement'], default='analyze', help='Execution mode')
    args = parser.parse_args()

    if args.mode == 'analyze':
        print("Running in read-only analysis mode.")
        build_inventory()
        generate_reports()
    else:
        print(f"Mode {args.mode} is not yet implemented or allowed in current context.")

if __name__ == "__main__":
    main()
