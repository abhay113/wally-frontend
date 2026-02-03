import os

OUTPUT_FILE = "all_files_content.txt"
SEPARATOR = "-" * 48
EXTENSIONS = (".ts", ".tsx")
EXCLUDE_DIRS = {"node_modules", ".git"}

with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
    for root, dirs, files in os.walk("."):
        # remove excluded directories from traversal
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            if file.endswith(EXTENSIONS):
                file_path = os.path.join(root, file)

                out.write(f"FILE: {file_path}\n")
                out.write(SEPARATOR + "\n")

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"\n[ERROR READING FILE: {e}]\n")

                out.write("\n" + SEPARATOR + "\n")
