import os
import sys
import re
import shutil
import traceback

# ============================
# CONFIG
# ============================

DEFAULT_MAX_OUTPUT_FILES = 5
DEFAULT_OUTPUT_CHUNK_MB = 10
OUTPUT_FILE_FOOTER_RESERVE_BYTES = 512

SKIP_DIRS = {
    "node_modules", "bin", "obj", "dist", "build", "target", "out",
    ".git", ".svn", ".hg",
    ".gradle", ".mvn",
    ".next", ".nuxt", ".angular", ".svelte-kit",
    ".venv", "venv", "env",
    "__pycache__", ".pytest_cache",
    ".cache", ".terraform", ".parcel-cache", ".turbo",
    ".idea", ".vscode", ".vs",
    ".docker", ".output", ".vercel", "coverage", ".nyc_output",
    "tmp", "temp", "logs"
}

SKIP_EXTENSIONS = {
    ".exe", ".dll", ".class", ".jar", ".war",
    ".zip", ".tar", ".gz", ".7z", ".rar",
    ".png", ".jpg", ".jpeg", ".gif", ".bmp",
    ".pdf", ".ico", ".map",
    ".woff", ".woff2", ".ttf", ".eot",
    ".mp3", ".mp4"
}

SKIP_FILE_NAMES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "pipfile.lock", "poetry.lock", "composer.lock",
    "bun.lockb", "npm-shrinkwrap.json"
}

USEFUL_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".kt", ".cs", ".go", ".rs",
    ".php", ".rb", ".swift", ".c", ".h", ".cpp", ".hpp",
    ".html", ".css", ".scss", ".sass", ".less",
    ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".xml", ".sql", ".graphql", ".gql",
    ".md", ".txt", ".rst",
    ".sh", ".ps1", ".bat",
    ".env"
}

USEFUL_FILE_NAMES = {
    "dockerfile", "makefile", "license", "license.md",
    "readme", "readme.md", "readme.txt",
    ".gitignore", ".gitattributes", ".editorconfig",
    ".env", ".env.example",
    "requirements.txt", "pyproject.toml", "setup.py", "setup.cfg",
    "package.json", "tsconfig.json", "angular.json", "vite.config.ts", "vite.config.js"
}

# Fixed output directory
OUTPUT_DIR = r"C:\Users\yashs\OneDrive\Documents\Output"
ERROR_FILE = os.path.join(OUTPUT_DIR, "error.log")

# ============================
# ANSI STRIPPER
# ============================

ANSI_ESCAPE_RE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")

def strip_ansi(text: str) -> str:
    return ANSI_ESCAPE_RE.sub("", text)

# ============================
# HELPERS
# ============================

def is_binary_file(path: str) -> bool:
    try:
        with open(path, "rb") as f:
            return b"\x00" in f.read(512)
    except Exception:
        return True

def normalize_extension(ext: str) -> str:
    if not ext:
        return "no_extension"
    return re.sub(r"[^a-z0-9]", "_", ext.lstrip(".").lower())

def should_skip_generated_text(file_name_lower: str) -> bool:
    return (
        file_name_lower.endswith(".min.js")
        or file_name_lower.endswith(".min.css")
        or file_name_lower.endswith(".bundle.js")
        or file_name_lower.endswith(".chunk.js")
    )

def is_useful_file(file_name: str) -> bool:
    file_name_lower = file_name.lower()
    ext = os.path.splitext(file_name_lower)[1]

    if file_name_lower in SKIP_FILE_NAMES:
        return False
    if ext in SKIP_EXTENSIONS:
        return False
    if should_skip_generated_text(file_name_lower):
        return False
    if file_name_lower in USEFUL_FILE_NAMES:
        return True

    return ext in USEFUL_EXTENSIONS

def build_output_header(mode: str, root_dir: str, part_number: int, max_output_files: int, max_output_chunk_mb: float, ext_key: str = "") -> str:
    if mode == "single":
        return (
            "SCAN MODE: SINGLE FILE\n"
            f"ROOT: {root_dir}\n"
            f"PART: {part_number}\n"
            f"MAX OUTPUT FILES: {max_output_files}\n"
            f"MAX FILE SIZE PER OUTPUT: {max_output_chunk_mb} MB\n"
            + "=" * 80
            + "\n\n"
        )
    elif mode == "chunked":
        return (
            "SCAN MODE: CHUNKED OUTPUT\n"
            f"ROOT: {root_dir}\n"
            f"PART: {part_number}\n"
            f"MAX OUTPUT FILES: {max_output_files}\n"
            f"MAX FILE SIZE PER OUTPUT: {max_output_chunk_mb} MB\n"
            + "=" * 80
            + "\n\n"
        )

    return (
        f"SCAN TYPE: .{ext_key}\n"
        f"ROOT: {root_dir}\n"
        f"PART: {part_number}\n"
        f"MAX OUTPUT FILES: {max_output_files}\n"
        f"MAX FILE SIZE PER OUTPUT: {max_output_chunk_mb} MB\n"
        + "=" * 80
        + "\n\n"
    )

def build_output_path(mode: str, part_number: int, ext_key: str = "") -> str:
    if mode == "single":
        if part_number == 1:
            return os.path.join(OUTPUT_DIR, "all_files.txt")
        return os.path.join(OUTPUT_DIR, f"all_files_part_{part_number}.txt")
    elif mode == "chunked":
        return os.path.join(OUTPUT_DIR, f"repo_part_{part_number}.txt")

    if part_number == 1:
        return os.path.join(OUTPUT_DIR, f"{ext_key}.txt")
    return os.path.join(OUTPUT_DIR, f"{ext_key}_part_{part_number}.txt")

def to_utf8_size(text: str) -> int:
    return len(text.encode("utf-8", errors="ignore"))

# ============================
# MAIN SCAN
# ============================

def scan_directory(root_dir: str, mode: str, max_output_files: int, max_output_chunk_mb: float):
    writers = {}
    file_count = 0
    output_files_created = 0
    limit_reached = False
    output_chunk_bytes = int(max_output_chunk_mb * 1024 * 1024)
    safe_chunk_bytes = max(1, output_chunk_bytes - OUTPUT_FILE_FOOTER_RESERVE_BYTES)
    output_dir_abs = os.path.abspath(OUTPUT_DIR)
    output_dir_norm = os.path.normcase(output_dir_abs)
    error_file_abs = os.path.abspath(ERROR_FILE)
    error_file_norm = os.path.normcase(error_file_abs)

    def open_writer(writer_key: str, part_number: int, err_handle, ext_key: str = ""):
        nonlocal output_files_created
        nonlocal limit_reached

        if output_files_created >= max_output_files:
            if not limit_reached:
                msg = f"[LIMIT] Reached max output file count ({max_output_files}). Stopping scan."
                print(msg)
                err_handle.write(msg + "\n")
            limit_reached = True
            return None

        out_path = build_output_path(mode, part_number, ext_key)
        header = build_output_header(
            mode=mode,
            root_dir=root_dir,
            part_number=part_number,
            max_output_files=max_output_files,
            max_output_chunk_mb=max_output_chunk_mb,
            ext_key=ext_key
        )
        out_handle = open(out_path, "w", encoding="utf-8", errors="ignore")
        out_handle.write(header)

        writers[writer_key] = {
            "handle": out_handle,
            "size_bytes": to_utf8_size(header),
            "part_number": part_number,
            "entries": 0,
            "ext_key": ext_key
        }
        output_files_created += 1
        print(f"[OUTPUT] Created: {out_path}")
        return writers[writer_key]

    with open(ERROR_FILE, "w", encoding="utf-8") as err:
        try:
            # Initialize writer based on mode
            if mode == "single":
                if open_writer("single", 1, err) is None:
                    return 0, output_files_created, True
            elif mode == "chunked":
                # Mode 3: Single writer for all file types, sequential chunking
                if open_writer("chunked", 1, err) is None:
                    return 0, output_files_created, True

            for root, dirs, files in os.walk(root_dir, topdown=True, followlinks=False):
                if limit_reached:
                    break

                # Filter out directories to skip
                filtered_dirs = []
                for d in dirs:
                    dir_abs = os.path.abspath(os.path.join(root, d))
                    if d.lower() in SKIP_DIRS:
                        continue
                    if os.path.normcase(dir_abs) == output_dir_norm:
                        continue
                    filtered_dirs.append(d)
                dirs[:] = filtered_dirs

                # Sort files for consistent ordering
                files.sort()

                for name in files:
                    if limit_reached:
                        break

                    full_path = os.path.join(root, name)

                    try:
                        name_lower = name.lower()
                        full_path_abs = os.path.abspath(full_path)
                        full_path_norm = os.path.normcase(full_path_abs)

                        # Skip error log file
                        if full_path_norm == error_file_norm:
                            continue

                        # Skip files in output directory
                        if full_path_norm.startswith(output_dir_norm + os.sep):
                            continue

                        # Check if file is useful
                        if not is_useful_file(name):
                            continue

                        ext = os.path.splitext(name_lower)[1]

                        # Skip binary files
                        if is_binary_file(full_path):
                            continue

                        # Determine writer key based on mode
                        if mode == "multi":
                            # Mode 2: Group by extension
                            ext_key = normalize_extension(ext)
                            writer_key = f"multi::{ext_key}"
                        elif mode == "chunked":
                            # Mode 3: All files go to same writer (mixed types)
                            ext_key = ""
                            writer_key = "chunked"
                        else:
                            # Mode 1: All files go to single writer
                            ext_key = ""
                            writer_key = "single"

                        # Open new writer if needed
                        if writer_key not in writers:
                            if open_writer(writer_key, 1, err, ext_key) is None:
                                break

                        # Build file entry
                        entry_parts = [
                            "=== FILE START ===\n",
                            f"FILE NAME: {name}\n",
                            f"FULL PATH: {full_path}\n",
                            "CONTENT:\n"
                        ]

                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            for line in f:
                                entry_parts.append(strip_ansi(line))

                        entry_parts.append("\n=== FILE END ===\n\n")
                        entry_text = "".join(entry_parts)
                        entry_size = to_utf8_size(entry_text)

                        state = writers[writer_key]
                        
                        # Check if entry fits in current file
                        while state["size_bytes"] + entry_size > safe_chunk_bytes:
                            # If no entries written yet, skip this file (too large)
                            if state["entries"] == 0:
                                err.write(
                                    f"[SKIPPED TOO LARGE] {full_path}\n"
                                    f"Entry size {entry_size} bytes exceeds max output file size budget "
                                    f"({safe_chunk_bytes} bytes).\n\n"
                                )
                                state = None
                                break

                            # Close current file and open next part
                            old_state = state
                            next_part = state["part_number"] + 1
                            new_state = open_writer(writer_key, next_part, err, ext_key)
                            if new_state is None:
                                state = None
                                break
                            try:
                                old_state["handle"].close()
                            except Exception:
                                pass
                            state = new_state

                        if state is None:
                            if limit_reached:
                                break
                            continue

                        # Write entry to current file
                        state["handle"].write(entry_text)
                        state["size_bytes"] += entry_size
                        state["entries"] += 1

                        file_count += 1
                        print(f"[{file_count}] {full_path}")

                    except Exception:
                        err.write(
                            f"[FILE ERROR] {full_path}\n"
                            + traceback.format_exc()
                            + "\n"
                        )

        except Exception:
            err.write(
                "[FATAL WALK ERROR]\n"
                + traceback.format_exc()
                + "\n"
            )

        finally:
            # Close all writers and write completion info
            for state in writers.values():
                try:
                    state["handle"].write("SCAN COMPLETED\n")
                    state["handle"].write(f"FILES PROCESSED: {file_count}\n")
                    state["handle"].write(f"OUTPUT FILES CREATED: {output_files_created}\n")
                    if limit_reached:
                        state["handle"].write("NOTE: Output file limit reached before full scan completion.\n")
                    state["handle"].close()
                except Exception:
                    pass

    return file_count, output_files_created, limit_reached

# ============================
# ENTRY POINT
# ============================

if __name__ == "__main__":
    try:
        print("=" * 60)
        print("DIRECTORY SCANNER - CODE EXTRACTOR")
        print("=" * 60)
        print(f"\nFixed Output Directory: {OUTPUT_DIR}")
        print(f"Error Log: {ERROR_FILE}\n")

        # Get target directory
        raw = input("Enter absolute path of folder to scan: ").strip()
        if not raw:
            print("ERROR: Empty path.")
            sys.exit(1)

        target_path = os.path.abspath(raw.strip('"').strip("'"))
        if not os.path.isdir(target_path):
            print(f"ERROR: Directory does not exist: {target_path}")
            sys.exit(1)

        # Create fixed output directory
        os.makedirs(OUTPUT_DIR, exist_ok=True)

        # Create error log directory if needed
        if os.path.dirname(ERROR_FILE):
            os.makedirs(os.path.dirname(ERROR_FILE), exist_ok=True)

        # Initialize error log
        if not os.path.exists(ERROR_FILE):
            open(ERROR_FILE, 'a').close()

        # Choose output mode
        print("\n" + "=" * 60)
        print("CHOOSE OUTPUT MODE:")
        print("=" * 60)
        print("1 -> Single text file (all_files.txt)")
        print("     - All files combined into one output")
        print("     - Splits into parts if size limit reached")
        print()
        print("2 -> Multiple files by extension")
        print("     - Files grouped by extension (py.txt, js.txt, etc.)")
        print("     - Each extension gets its own output file(s)")
        print()
        print("3 -> Sequential chunked output (UP TO 5 FILES)")
        print("     - Files written sequentially (mixed types)")
        print("     - Each file up to 10 MB")
        print("     - Output: repo_part_1.txt through repo_part_5.txt")
        print("=" * 60)

        choice = input("\nEnter 1, 2, or 3: ").strip()
        
        if choice == "1":
            mode = "single"
            max_output_files = DEFAULT_MAX_OUTPUT_FILES
            max_output_chunk_mb = float(DEFAULT_OUTPUT_CHUNK_MB)
        elif choice == "2":
            mode = "multi"
            max_output_files = DEFAULT_MAX_OUTPUT_FILES
            max_output_chunk_mb = float(DEFAULT_OUTPUT_CHUNK_MB)
        elif choice == "3":
            mode = "chunked"
            max_output_files = 5
            max_output_chunk_mb = 10.0
        else:
            print("ERROR: Invalid choice.")
            sys.exit(1)

        # For modes 1 and 2, allow custom configuration
        if mode in ["single", "multi"]:
            print(f"\nCurrent settings: {max_output_files} files, {max_output_chunk_mb} MB each")
            raw_max_outputs = input(
                f"Max output files (default: {DEFAULT_MAX_OUTPUT_FILES}): "
            ).strip()
            if raw_max_outputs:
                try:
                    max_output_files = int(raw_max_outputs)
                except ValueError:
                    print("ERROR: Max output files must be a number.")
                    sys.exit(1)

            if max_output_files < 1:
                print("ERROR: Max output files must be at least 1.")
                sys.exit(1)

            raw_chunk_mb = input(
                f"Max size per output file in MB (default: {DEFAULT_OUTPUT_CHUNK_MB}): "
            ).strip()
            if raw_chunk_mb:
                try:
                    max_output_chunk_mb = float(raw_chunk_mb)
                except ValueError:
                    print("ERROR: Max output chunk size must be a number.")
                    sys.exit(1)

            if max_output_chunk_mb <= 0:
                print("ERROR: Max size per output file must be greater than 0 MB.")
                sys.exit(1)

        # Start scanning
        print("\n" + "=" * 60)
        print("SCANNING...")
        print("=" * 60)

        file_count, output_files_created, output_limit_hit = scan_directory(
            target_path,
            mode,
            max_output_files,
            max_output_chunk_mb
        )

        # Print summary
        print("\n" + "=" * 60)
        print("SCAN COMPLETE")
        print("=" * 60)
        print(f"FILES PROCESSED: {file_count}")
        print(f"OUTPUT FILES CREATED: {output_files_created}")
        if output_limit_hit:
            print("NOTE: Max output file limit reached before full scan completion.")
        print(f"OUTPUT DIRECTORY: {OUTPUT_DIR}")
        print(f"ERROR LOG: {ERROR_FILE}")
        print("=" * 60)

        # Cleanup option
        cleanup = input("\nDelete created output files and logs? (y/n): ").strip().lower()
        if cleanup == 'y':
            print("\nCleaning up...")
            try:
                if os.path.isdir(OUTPUT_DIR):
                    shutil.rmtree(OUTPUT_DIR)
                    print(f"Removed directory: {OUTPUT_DIR}")
            except Exception as e:
                print(f"  - Could not remove output directory: {e}")
            try:
                if os.path.isfile(ERROR_FILE):
                    os.remove(ERROR_FILE)
                    print(f"Removed error log: {ERROR_FILE}")
            except Exception as e:
                print(f"  - Could not remove error log: {e}")
            print("Cleanup complete.")

    except KeyboardInterrupt:
        print("\n\nScan interrupted by user.")
    except Exception:
        with open(ERROR_FILE, "a", encoding="utf-8") as err:
            err.write("[FATAL ENTRY ERROR]\n" + traceback.format_exc())
        print("FATAL ERROR. Check error.log")
        sys.exit(1)
