#!/bin/bash

OUTPUT_FILE="metronome_ng_full_bundle.txt"
> "$OUTPUT_FILE"

echo "=== Packaging metronome-ng source files ==="

# src/ 以下の ts, tsx, json ファイルを対象に連結
find src -type f \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) \
| sort | while read -r file; do
    echo "Adding: $file"
    echo "==================================================" >> "$OUTPUT_FILE"
    echo "--- START OF FILE: $file ---" >> "$OUTPUT_FILE"
    echo "==================================================" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
    echo "--- END OF FILE: $file ---" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
done

# vite.config.ts も含める
if [ -f "vite.config.ts" ]; then
    echo "Adding: vite.config.ts"
    echo "==================================================" >> "$OUTPUT_FILE"
    echo "--- START OF FILE: vite.config.ts ---" >> "$OUTPUT_FILE"
    echo "==================================================" >> "$OUTPUT_FILE"
    cat "vite.config.ts" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
    echo "--- END OF FILE: vite.config.ts ---" >> "$OUTPUT_FILE"
fi

echo "Done! Output written to $OUTPUT_FILE"
