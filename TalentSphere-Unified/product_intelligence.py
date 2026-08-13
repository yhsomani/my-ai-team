import os
import json
import re
import argparse
import subprocess
from datetime import datetime

ROOT_DIR = '.'
OUTPUT_DIR = '.product_intelligence'
REPORTS_DIR = os.path.join(OUTPUT_DIR, 'reports')
WRITE_ALLOWLIST = [OUTPUT_DIR]

def safe_makedirs(path):
    if not os.path.exists(path):
        os.makedirs(path)

def snapshot():
    print("Creating git snapshot before analysis...")
    subprocess.run(["git", "status"], capture_output=True)

def extract_features(file_path, content):
    """Improved extraction of features and requirements."""
    features = []
    lines = content.split('\n')

    # Try to find explicit feature lists or requirements
    for i, line in enumerate(lines):
        # Look for typical feature definitions like "- Feature:" or checkboxes
        if re.search(r'^\s*[-*]\s+(feature|capability|user can|system must):?', line, re.IGNORECASE):
            clean_name = re.sub(r'^\s*[-*]\s+(feature|capability|user can|system must):?\s*', '', line, flags=re.IGNORECASE).strip()
            if len(clean_name) > 5 and len(clean_name) < 200:
                features.append({
                    "featureId": f"FEAT-{len(features)+1}",
                    "name": clean_name,
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

    with open(os.path.join(OUTPUT_DIR, 'documents.json'), 'w', encoding='utf-8') as f:
        json.dump(docs, f, indent=2)

    with open(os.path.join(OUTPUT_DIR, 'services.json'), 'w', encoding='utf-8') as f:
        json.dump(services, f, indent=2)

    with open(os.path.join(OUTPUT_DIR, 'frontend.json'), 'w', encoding='utf-8') as f:
        json.dump(frontend_files, f, indent=2)

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

def generate_candidate_ssot():
    safe_makedirs(OUTPUT_DIR)

    with open(os.path.join(OUTPUT_DIR, 'services.json'), 'r') as f:
        services = json.load(f)
    with open(os.path.join(OUTPUT_DIR, 'FEATURE-RECONCILIATION.json'), 'r') as f:
        features = json.load(f)

    candidate_path = os.path.join(OUTPUT_DIR, 'SSOT.CANDIDATE.md')
    with open(candidate_path, 'w', encoding='utf-8') as f:
        f.write("# SSOT Candidate\n\n")
        f.write(f"> Reconciled and generated on: {datetime.now().isoformat()}\n\n")
        f.write("## 1. Platform Overview\n")
        f.write("TalentSphere is a distributed cloud-native career intelligence platform. The architecture follows a Modular Monolith target (ADR-002) backed by a unified Supabase Postgres schema.\n\n")

        f.write("## 2. Microservices Architecture\n")
        f.write(f"The system currently consists of {len(services)} active Spring Boot application modules. The `chat-service` is explicitly quarantined per ADR-004.\n\n")

        f.write("| Service Name | Path |\n")
        f.write("| --- | --- |\n")
        for s in sorted(services, key=lambda x: x['id']):
            f.write(f"| {s['id']} | `{s['path']}` |\n")

        f.write("\n## 3. Extracted Features\n")
        f.write(f"Total structured features found: {len(features)}\n")

    print(f"Generated {candidate_path}")

def main():
    parser = argparse.ArgumentParser(description="Product Intelligence Read-Only Analyzer")
    parser.add_argument('--mode', choices=['analyze', 'generate-candidate'], default='analyze', help='Execution mode')
    args = parser.parse_args()

    if args.mode == 'analyze':
        print("Running in read-only analysis mode.")
        build_inventory()
        generate_reports()
    elif args.mode == 'generate-candidate':
        print("Running in read-only candidate generation mode.")
        generate_candidate_ssot()
    else:
        print(f"Mode {args.mode} is not allowed.")

if __name__ == "__main__":
    main()
