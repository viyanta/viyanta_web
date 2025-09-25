import os
import json
import fitz  # PyMuPDF for PDF text extraction
from dotenv import load_dotenv
import google.generativeai as genai

# ----------------------------
# 1. Load API key
# ----------------------------
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("⚠️ GEMINI_API_KEY not found in .env file")

genai.configure(api_key=API_KEY)


# ----------------------------
# 2. Helper: Extract text from PDF
# ----------------------------
def extract_text_from_pdf(pdf_path, max_pages=10):
    """Extracts text from first N pages of PDF (to limit size)."""
    text = []
    with fitz.open(pdf_path) as doc:
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            text.append(page.get_text("text"))
    return "\n".join(text)


# ----------------------------
# 3. Verify & Correct JSON
# ----------------------------
def verify_with_gemini(template_path, extracted_path, pdf_path, output_path):
    # Load inputs
    with open(template_path, "r", encoding="utf-8") as f:
        template_json = json.load(f)
    with open(extracted_path, "r", encoding="utf-8") as f:
        extracted_json = json.load(f)

    pdf_text = extract_text_from_pdf(pdf_path)

    # Build prompt
    prompt = f"""
You are given:
1. A template.json (schema of expected fields),
2. An extracted.json (data parsed from PDF but may have errors),
3. The original PDF (ground truth).

Task:
- Verify extracted.json against the PDF.
- Correct any missing or wrong values.
- Output ONLY a single valid JSON object with exactly these top-level keys:
  "Form No", "Title", "Registration Number", "Period", "Pages", "Currency", "FlatHeaders", "Rows".
- Do NOT add extra fields like Insurer, Headers, Date, etc.
- Keep numbers, commas, parentheses, and signs exactly as in the PDF.
- Ensure every cell in "Rows" has only one clean value (no multiple values, no `\n`).
- The final JSON must be fully valid and parseable.


Template JSON:
{json.dumps(template_json, indent=2)}

Extracted JSON:
{json.dumps(extracted_json, indent=2)}

PDF Content (excerpt):
{pdf_text[:6000]}  # limit for token safety
"""

    # Call Gemini
    model = genai.GenerativeModel("gemini-1.5-flash")  # use flash for speed
    response = model.generate_content(prompt)

    # Parse JSON from response
    # Parse JSON from response (cleaning code fences if present)
    raw_text = response.text.strip()

    # Remove ```json ... ``` wrappers if present
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        # Remove first line if it's 'json'
        if raw_text.lower().startswith("json"):
            raw_text = raw_text[4:].strip()

    try:
        corrected_json = json.loads(raw_text)
    except Exception as e:
        print("⚠️ Failed to parse Gemini output:", e)
        # show first 1000 chars for debugging
        print("Sanitized response:", raw_text[:1000])
        return None

    # Save corrected JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(corrected_json, f, indent=2, ensure_ascii=False)

    print(f"✅ Corrected JSON saved to {output_path}")
    return output_path


# ----------------------------
# 4. Run Test
# ----------------------------
if __name__ == "__main__":
    TEMPLATE_JSON = "../templates/hdfc/l-1-a-ra.json"
    EXTRACTED_JSON = "l-1-a-ra_extracted-hdfc-v2.json"
    SPLIT_PDF = "hdfc_pdf_splits_auto/L-1-A-RA_Revenue_Account_1-4_3_6.pdf"
    OUTPUT_JSON = "l-1-a-ra_hdfc_corrected.json"

    verify_with_gemini(TEMPLATE_JSON, EXTRACTED_JSON, SPLIT_PDF, OUTPUT_JSON)
