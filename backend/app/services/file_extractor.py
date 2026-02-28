import io
import logging
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)


async def extract_text_from_file(file: UploadFile) -> str:
    """Extract plain text from an uploaded PDF or DOCX file."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()

    if filename.endswith(".pdf") or "pdf" in content_type:
        return _extract_pdf(content)
    elif filename.endswith(".docx") or "wordprocessingml" in content_type:
        return _extract_docx(content)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.filename}. Please upload a PDF or DOCX file.",
        )


def _extract_pdf(content: bytes) -> str:
    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="PDF support not installed. Run: pip install pdfplumber",
        )

    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    text = "\n\n".join(text_parts).strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from the PDF. It may be image-based or empty.",
        )
    return text


def _extract_docx(content: bytes) -> str:
    try:
        from docx import Document
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="DOCX support not installed. Run: pip install python-docx",
        )

    doc = Document(io.BytesIO(content))
    text_parts = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n".join(text_parts).strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from the DOCX. The file may be empty.",
        )
    return text
