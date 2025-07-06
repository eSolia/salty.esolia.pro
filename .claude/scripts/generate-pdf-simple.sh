#!/bin/bash
# Simple PDF generation that handles Unicode by converting to HTML first

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "Error: pandoc is not installed."
    echo "Install with: brew install pandoc"
    exit 1
fi

# Check arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <markdown-file>"
    echo "Example: $0 change-summary.md"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_FILE="${INPUT_FILE%.md}.pdf"
TEMP_HTML="${INPUT_FILE%.md}_temp.html"

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File '$INPUT_FILE' not found"
    exit 1
fi

# First convert to HTML with proper encoding
pandoc "$INPUT_FILE" \
    -t html5 \
    -s \
    --metadata title="Document" \
    --css data:text/css,"body{font-family:sans-serif;max-width:50em;margin:auto;padding:2em;}code{background:#f4f4f4;padding:2px 4px;}pre{background:#f4f4f4;padding:1em;overflow-x:auto;}h1,h2,h3{color:#333;}a{color:#0066cc;}" \
    -o "$TEMP_HTML"

# Then use wkhtmltopdf or browser print
if command -v wkhtmltopdf &> /dev/null; then
    wkhtmltopdf "$TEMP_HTML" "$OUTPUT_FILE"
    rm "$TEMP_HTML"
    echo "✅ PDF generated: $OUTPUT_FILE"
else
    echo "✅ HTML generated: $TEMP_HTML"
    echo "To create PDF: Open $TEMP_HTML in browser and print to PDF"
fi