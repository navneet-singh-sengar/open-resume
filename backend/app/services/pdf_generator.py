import os
import re
import uuid
from fpdf import FPDF

from app.schemas.resume import TailoredResume

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "generated_pdfs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

ACCENT = (44, 62, 80)
DARK = (26, 26, 26)
MEDIUM = (85, 85, 85)
LIGHT_RULE = (189, 195, 199)

# Characters outside latin-1 that Helvetica can't render
_SANITIZE_MAP = str.maketrans({
    "\u2022": "-",   # bullet •
    "\u2023": "-",   # triangular bullet
    "\u2043": "-",   # hyphen bullet
    "\u00b7": "-",   # middle dot ·
    "\u2013": "-",   # en dash –
    "\u2014": "-",   # em dash —
    "\u2018": "'",   # left single quote '
    "\u2019": "'",   # right single quote '
    "\u201c": '"',   # left double quote "
    "\u201d": '"',   # right double quote "
    "\u2026": "...", # ellipsis …
})


def _safe(text: str) -> str:
    """Replace Unicode characters that Helvetica cannot render."""
    text = text.translate(_SANITIZE_MAP)
    # Strip any remaining non-latin-1 characters
    return text.encode("latin-1", errors="replace").decode("latin-1")


class ResumePDF(FPDF):
    def __init__(self):
        super().__init__(format="letter")
        self.set_auto_page_break(auto=True, margin=15)
        self.add_page()
        self.set_margins(15, 12, 15)
        self.set_y(12)

    def _accent_text(self, size, text, style="B"):
        self.set_font("Helvetica", style, size)
        self.set_text_color(*ACCENT)
        self.cell(0, size * 0.5, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def _body_text(self, text, size=9.5):
        self.set_font("Helvetica", "", size)
        self.set_text_color(*DARK)
        self.multi_cell(0, 4.2, _safe(text))

    def section_title(self, title):
        self.ln(3)
        self.set_font("Helvetica", "B", 10.5)
        self.set_text_color(*ACCENT)
        self.cell(0, 5, _safe(title.upper()), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*LIGHT_RULE)
        self.set_line_width(0.3)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(2.5)

    def entry_header(self, left, right):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*DARK)
        w = self.w - self.l_margin - self.r_margin
        right_w = min(w * 0.28, self.get_string_width(_safe(right)) + 4)
        left_w = max(w - right_w, 20)
        self.cell(left_w, 4.5, _safe(left)[:80])
        self.set_font("Helvetica", "", 8.5)
        self.set_text_color(*MEDIUM)
        self.cell(right_w, 4.5, _safe(right), align="R", new_x="LMARGIN", new_y="NEXT")

    def entry_subtitle(self, text):
        self.set_font("Helvetica", "I", 9.5)
        self.set_text_color(*MEDIUM)
        self.cell(0, 4, _safe(text), new_x="LMARGIN", new_y="NEXT")

    def bullet(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*DARK)
        x = self.get_x()
        indent = 4
        bullet_w = 3
        remaining = self.w - self.r_margin - (x + indent + bullet_w)
        if remaining < 20:
            self.ln(3.8)
            x = self.l_margin
            remaining = self.w - self.r_margin - (x + indent + bullet_w)
        self.set_x(x + indent)
        self.cell(bullet_w, 3.8, "-")
        self.multi_cell(remaining, 3.8, _safe(text))
        self.ln(0.5)


def generate_pdf(personal_info: dict, resume: TailoredResume) -> str:
    pdf = ResumePDF()

    # Header
    pdf.set_font("Helvetica", "B", 17)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 8, _safe(personal_info.get("name", "")), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)

    contact_parts = []
    for key in ("email", "phone", "location", "linkedin", "github", "portfolio"):
        val = personal_info.get(key)
        if val:
            contact_parts.append(val)

    if contact_parts:
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(*MEDIUM)
        contact_str = _safe("  |  ".join(contact_parts))
        avail = pdf.w - pdf.l_margin - pdf.r_margin
        if pdf.get_string_width(contact_str) > avail:
            pdf.multi_cell(0, 4, contact_str, align="C")
        else:
            pdf.cell(0, 4, contact_str, align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(0.6)
    y = pdf.get_y() + 2
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.set_y(y + 1)

    # Summary
    if resume.professional_summary:
        pdf.section_title("Professional Summary")
        pdf._body_text(resume.professional_summary)

    # Experience
    if resume.experiences:
        pdf.section_title("Experience")
        for exp in resume.experiences:
            date_str = f"{exp.start_date} - {'Present' if exp.is_current else (exp.end_date or '')}"
            pdf.entry_header(exp.title, date_str)
            pdf.entry_subtitle(exp.company)
            pdf.ln(1)
            for b in exp.bullets:
                pdf.bullet(b)
            pdf.ln(1.5)

    # Education
    if resume.education:
        pdf.section_title("Education")
        for edu in resume.education:
            degree_line = f"{edu.degree} in {edu.field}"
            date_str = edu.end_date or ""
            pdf.entry_header(degree_line, date_str)
            subtitle = edu.institution
            if edu.gpa:
                subtitle += f"  |  GPA: {edu.gpa}"
            pdf.entry_subtitle(subtitle)
            for h in edu.highlights:
                pdf.bullet(h)
            pdf.ln(1.5)

    # Skills
    if resume.skills:
        pdf.section_title("Skills")
        skills_text = "  |  ".join(resume.skills)
        pdf._body_text(skills_text, size=9)

    # Projects
    if resume.projects:
        pdf.section_title("Projects")
        for proj in resume.projects:
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*DARK)
            pdf.cell(0, 4.5, _safe(proj.name), new_x="LMARGIN", new_y="NEXT")
            if proj.technologies:
                pdf.set_font("Helvetica", "I", 8.5)
                pdf.set_text_color(*MEDIUM)
                pdf.cell(0, 3.5, _safe(", ".join(proj.technologies)), new_x="LMARGIN", new_y="NEXT")
            pdf.ln(0.5)
            if proj.description:
                pdf._body_text(proj.description, size=9)
            for h in proj.highlights:
                pdf.bullet(h)
            pdf.ln(1.5)

    # Certifications
    if resume.certifications:
        pdf.section_title("Certifications")
        for cert in resume.certifications:
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*DARK)
            pdf.cell(0, 4, _safe(f"  -  {cert}"), new_x="LMARGIN", new_y="NEXT")

    filename = f"resume_{uuid.uuid4().hex[:8]}.pdf"
    filepath = os.path.join(OUTPUT_DIR, filename)
    pdf.output(filepath)
    return filepath
