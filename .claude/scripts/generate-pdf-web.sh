#!/bin/bash
# Generate PDF using pandoc's HTML engine (no LaTeX required)

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

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: File '$INPUT_FILE' not found"
    exit 1
fi

# Generate PDF using HTML/CSS rendering (requires Chrome/Chromium)
pandoc "$INPUT_FILE" \
    -o "$OUTPUT_FILE" \
    --pdf-engine=weasyprint \
    --css data:text/css,"
    body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
        line-height: 1.6; 
        max-width: 800px; 
        margin: 40px auto; 
        padding: 0 20px; 
        color: #333;
    }
    h1, h2, h3 { 
        color: #2c3e50; 
        margin-top: 1.5em; 
    }
    code { 
        background: #f4f4f4; 
        padding: 2px 6px; 
        border-radius: 3px; 
        font-size: 0.9em;
    }
    pre { 
        background: #f8f8f8; 
        padding: 15px; 
        border-radius: 5px; 
        overflow-x: auto; 
        border: 1px solid #ddd;
    }
    blockquote { 
        border-left: 4px solid #ddd; 
        padding-left: 20px; 
        color: #666; 
        margin: 20px 0;
    }
    table { 
        border-collapse: collapse; 
        width: 100%; 
        margin: 20px 0;
    }
    th, td { 
        border: 1px solid #ddd; 
        padding: 8px; 
        text-align: left;
    }
    th { 
        background: #f4f4f4; 
        font-weight: bold;
    }
    a { 
        color: #3498db; 
        text-decoration: none;
    }
    a:hover { 
        text-decoration: underline;
    }
    " 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ PDF generated: $OUTPUT_FILE"
else
    # If weasyprint isn't installed, try the built-in HTML method
    pandoc "$INPUT_FILE" \
        -o "$OUTPUT_FILE" \
        --pdf-engine=html \
        --metadata title="Document" \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ PDF generated: $OUTPUT_FILE"
    else
        # Last resort: just create styled HTML
        pandoc "$INPUT_FILE" \
            -t html5 \
            -s \
            --metadata title="Document" \
            --metadata charset="UTF-8" \
            -H <(echo '<style>
                body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
                code { background: #f4f4f4; padding: 2px 4px; }
                pre { background: #f8f8f8; padding: 1em; overflow-x: auto; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; }
            </style>') \
            -o "${INPUT_FILE%.md}.html"
        echo "✅ HTML generated: ${INPUT_FILE%.md}.html"
        echo "📌 To create PDF: Open in browser and print to PDF (Cmd+P)"
    fi
fi