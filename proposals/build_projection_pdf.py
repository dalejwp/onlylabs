"""Generate the Jason projection report PDF."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.lib import colors

INK = HexColor("#05060A")
INK_SOFT = HexColor("#12131F")
GOLD = HexColor("#D4A537")
GOLD_LIGHT = HexColor("#E9C46A")
MUTED = HexColor("#6B6F80")
LINE = HexColor("#1F2233")
PAPER = HexColor("#FAFAF7")
TEXT = HexColor("#111218")

OUTPUT = "/home/user/onlylabs/proposals/pdf/jason-projection-report.pdf"

styles = getSampleStyleSheet()

H_DISPLAY = ParagraphStyle(
    "H_DISPLAY", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=36, leading=40,
    textColor=INK, spaceAfter=6,
)
H_TITLE = ParagraphStyle(
    "H_TITLE", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=22, leading=26,
    textColor=INK, spaceAfter=10,
)
H_SECTION = ParagraphStyle(
    "H_SECTION", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=14, leading=18,
    textColor=INK, spaceBefore=18, spaceAfter=8,
)
H_SUB = ParagraphStyle(
    "H_SUB", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=11, leading=14,
    textColor=GOLD, spaceBefore=10, spaceAfter=4,
    letterSpacing=1,
)
BODY = ParagraphStyle(
    "BODY", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=15,
    textColor=TEXT, spaceAfter=8, alignment=TA_JUSTIFY,
)
BODY_TIGHT = ParagraphStyle(
    "BODY_TIGHT", parent=BODY, spaceAfter=4,
)
BULLET = ParagraphStyle(
    "BULLET", parent=BODY, leftIndent=12, bulletIndent=0,
    spaceAfter=3,
)
NOTE = ParagraphStyle(
    "NOTE", parent=styles["Normal"],
    fontName="Helvetica-Oblique", fontSize=9, leading=12,
    textColor=MUTED, spaceAfter=8,
)
LABEL = ParagraphStyle(
    "LABEL", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=8, leading=11,
    textColor=GOLD,
)
SOURCE = ParagraphStyle(
    "SOURCE", parent=BODY, fontSize=9, leading=13,
    spaceAfter=8,
)
COVER_META = ParagraphStyle(
    "COVER_META", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=14,
    textColor=MUTED,
)
COVER_GOLD = ParagraphStyle(
    "COVER_GOLD", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=9, leading=12,
    textColor=GOLD,
)


def header_footer(canv, doc):
    canv.saveState()
    w, h = A4
    canv.setStrokeColor(LINE)
    canv.setLineWidth(0.5)
    canv.line(20 * mm, h - 15 * mm, w - 20 * mm, h - 15 * mm)
    canv.setFont("Helvetica-Bold", 8)
    canv.setFillColor(INK)
    canv.drawString(20 * mm, h - 12 * mm, "DALEJ ®")
    canv.setFont("Helvetica", 8)
    canv.setFillColor(MUTED)
    canv.drawRightString(w - 20 * mm, h - 12 * mm,
                         "Projection Report  |  Jason  |  April 2026")

    canv.setStrokeColor(LINE)
    canv.line(20 * mm, 15 * mm, w - 20 * mm, 15 * mm)
    canv.setFont("Helvetica", 8)
    canv.setFillColor(MUTED)
    canv.drawString(20 * mm, 10 * mm, "dalej.co.za")
    canv.drawRightString(w - 20 * mm, 10 * mm,
                         f"Page {doc.page}")
    canv.restoreState()


def cover_page(canv, doc):
    w, h = A4
    canv.saveState()
    canv.setFillColor(INK)
    canv.rect(0, 0, w, h, fill=1, stroke=0)

    canv.setFillColor(GOLD)
    canv.rect(0, h - 8 * mm, w, 2 * mm, fill=1, stroke=0)

    canv.setFillColor(GOLD)
    canv.setFont("Helvetica-Bold", 9)
    canv.drawString(20 * mm, h - 25 * mm, "DALEJ ®")
    canv.setFillColor(white)
    canv.setFont("Helvetica", 8)
    canv.drawRightString(w - 20 * mm, h - 25 * mm,
                         "PREPARED FOR JASON  |  CONFIDENTIAL")

    canv.setFillColor(GOLD_LIGHT)
    canv.setFont("Helvetica-Bold", 8)
    canv.drawString(20 * mm, h - 90 * mm, "PROJECTION REPORT")

    canv.setFillColor(white)
    canv.setFont("Helvetica-Bold", 42)
    canv.drawString(20 * mm, h - 115 * mm, "Lead Generation.")
    canv.drawString(20 * mm, h - 130 * mm, "Modelled. Sourced.")
    canv.setFillColor(GOLD)
    canv.drawString(20 * mm, h - 145 * mm, "Defensible.")

    canv.setFillColor(HexColor("#9AA0B0"))
    canv.setFont("Helvetica", 11)
    canv.drawString(20 * mm, h - 165 * mm,
                    "Legends EOR and Funding Bay. Full methodology,")
    canv.drawString(20 * mm, h - 172 * mm,
                    "channel attribution, and sources in one pack.")

    canv.setStrokeColor(GOLD)
    canv.setLineWidth(0.5)
    canv.line(20 * mm, 60 * mm, 80 * mm, 60 * mm)

    canv.setFillColor(GOLD)
    canv.setFont("Helvetica-Bold", 8)
    canv.drawString(20 * mm, 52 * mm, "PREPARED BY")
    canv.setFillColor(white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawString(20 * mm, 45 * mm, "Dale Jansen")
    canv.setFillColor(HexColor("#9AA0B0"))
    canv.setFont("Helvetica", 10)
    canv.drawString(20 * mm, 39 * mm, "Founder, dalej.co.za")

    canv.setFillColor(GOLD)
    canv.setFont("Helvetica-Bold", 8)
    canv.drawRightString(w - 20 * mm, 52 * mm, "DATE")
    canv.setFillColor(white)
    canv.setFont("Helvetica-Bold", 11)
    canv.drawRightString(w - 20 * mm, 45 * mm, "April 2026")
    canv.setFillColor(HexColor("#9AA0B0"))
    canv.setFont("Helvetica", 10)
    canv.drawRightString(w - 20 * mm, 39 * mm, "Version 1.0")

    canv.setFillColor(GOLD)
    canv.rect(0, 0, w, 2 * mm, fill=1, stroke=0)
    canv.restoreState()


def section_title(num, title):
    t = Table([[
        Paragraph(f"<font color='#D4A537'>{num}</font>", H_SECTION),
        Paragraph(title, H_SECTION),
    ]], colWidths=[12 * mm, 155 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE),
    ]))
    return t


def table_block(data, col_widths, gold_last_col=False, highlight_rows=None):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, GOLD),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, HexColor("#F5F5EF")]),
        ("LINEABOVE", (0, -1), (-1, -1), 0.3, LINE),
    ]
    if gold_last_col:
        style.append(("FONTNAME", (-1, 1), (-1, -1), "Helvetica-Bold"))
        style.append(("TEXTCOLOR", (-1, 1), (-1, -1), GOLD))
    if highlight_rows:
        for r in highlight_rows:
            style.append(("BACKGROUND", (0, r), (-1, r), HexColor("#FFF7E0")))
            style.append(("FONTNAME", (0, r), (-1, r), "Helvetica-Bold"))
    t.setStyle(TableStyle(style))
    return t


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=20 * mm,
        title="Lead Generation Projection Report",
        author="Dale Jansen",
    )

    story = []

    story.append(PageBreak())

    story.append(Paragraph("EXECUTIVE NOTE", H_SUB))
    story.append(Paragraph(
        "<b>For:</b> Jason, Marketing Manager &nbsp;&nbsp;|&nbsp;&nbsp; "
        "<b>Brands:</b> Legends EOR, Funding Bay &nbsp;&nbsp;|&nbsp;&nbsp; "
        "<b>Version:</b> 1.0",
        BODY_TIGHT,
    ))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE))

    story.append(section_title("01", "Methodology"))
    story.append(Paragraph(
        "Every number in this pack is modelled, not promised. We started with "
        "published 2025 and 2026 benchmarks from named sources (listed in "
        "section 07). We applied those benchmarks to the stated monthly budget "
        "per brand, across a defined channel mix. We then built three scenarios: "
        "conservative, base, and aggressive.",
        BODY,
    ))
    story.append(Paragraph(
        "<b>Conservative</b> assumes no AI uplift, template-level landing "
        "performance, and bottom-decile conversion. "
        "<b>Base</b> applies industry median performance plus the documented AI "
        "scoring lift. "
        "<b>Aggressive</b> applies top-quartile creative, tuned audiences after "
        "month three, and compounded AI lift.",
        BODY,
    ))
    story.append(Paragraph(
        "<b>Base is the number we would commit to in a contract. "
        "Conservative is the floor we would not drop below. Aggressive is what "
        "we target by month four.</b>",
        BODY,
    ))

    story.append(section_title("02", "Assumption Table"))
    story.append(Paragraph("FUNDING BAY &nbsp; / &nbsp; Direct response, UK SMEs",
                           H_SUB))

    fb_assume = [
        ["Input", "Conservative", "Base", "Aggressive", "Source"],
        ["Monthly ad spend", "£8,500", "£8,500", "£8,500", "Client plan"],
        ["Blended CPL", "£110", "£85", "£65", "Sopro B2B CPL 2025"],
        ["Landing page conversion", "4.5%", "8.2%", "13.8%", "Unbounce 2026"],
        ["Multi-step form completion", "55%", "68%", "78%", "Zuko 2024"],
        ["AI qualification pass rate", "48%", "60%", "72%", "Landbase 2026"],
        ["Funded deal conversion", "22%", "32%", "40%", "NACFB 2024"],
        ["Average loan size", "£75,000", "£100,000", "£150,000", "NACFB 2024"],
        ["Commission rate", "1.5%", "2.0%", "2.5%", "Industry standard"],
    ]
    story.append(table_block(fb_assume, [52 * mm, 24 * mm, 22 * mm, 24 * mm, 45 * mm]))

    story.append(Spacer(1, 10))
    story.append(Paragraph("LEGENDS EOR &nbsp; / &nbsp; Demand-gen, UK decision makers (revised)",
                           H_SUB))

    le_assume = [
        ["Input", "Conservative", "Base", "Aggressive", "Source"],
        ["Monthly media budget", "£7,000", "£7,000", "£7,000", "Client plan"],
        ["Cost per exec briefing", "£320", "£240", "£175", "Martal 2026"],
        ["Briefings booked / month", "22", "29", "40", "Derived"],
        ["Briefing to discovery deal", "55%", "68%", "78%", "SaaS Hero 2026"],
        ["Discovery to closed contract", "18%", "25%", "32%", "McKinsey, Landbase"],
        ["First-year contract value", "£22,000", "£28,000", "£42,000", "Wise Monk, Remote People"],
    ]
    story.append(table_block(le_assume, [52 * mm, 24 * mm, 22 * mm, 24 * mm, 45 * mm]))

    story.append(PageBreak())

    story.append(section_title("03", "Funding Bay &nbsp;/&nbsp; Channel Attribution"))
    story.append(Paragraph(
        "Base scenario. £8,500 ad budget. 100 qualified leads target.",
        NOTE,
    ))

    fb_chan = [
        ["Channel", "Budget", "% Mix", "CPL", "Leads", "Notes"],
        ["Google Search", "£3,825", "45%", "£70", "55",
         'Intent: "business loan UK", "invoice finance", "bridging loan"'],
        ["Meta Ads", "£2,550", "30%", "£85", "30",
         "SME founders, retargeting, Facebook Groups"],
        ["LinkedIn Ads", "£1,275", "15%", "£160", "8",
         "Higher-ticket deals, FDs and CFOs"],
        ["YouTube", "£850", "10%", "£120", "7",
         "Educational and retargeting, lower intent"],
        ["Total", "£8,500", "100%", "£85", "100", "Blended"],
    ]
    story.append(table_block(
        fb_chan,
        [28 * mm, 20 * mm, 16 * mm, 16 * mm, 16 * mm, 71 * mm],
        highlight_rows=[5],
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("WHAT 100 LEADS PRODUCES &nbsp; / &nbsp; Base case", H_SUB))
    for line in [
        "60 pass basic criteria (12+ months trading, £250k+ turnover, credit 650+).",
        "19 funded deals at the 32% NACFB broker benchmark.",
        "£100,000 average loan, 2% commission.",
        "<b>£38,000 month-one commission revenue.</b>",
    ]:
        story.append(Paragraph("• &nbsp; " + line, BULLET))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "At £15,500 client price for 100 leads, Jason's ROI is "
        "<b>+145% inside 30 days</b>. Add year-two repeat business (NACFB "
        "reports 48% of broker volume is returning clients) and annualised ROI "
        "on Funding Bay sits between <b>3x and 5x</b>.",
        BODY,
    ))

    story.append(PageBreak())

    story.append(section_title("04", "Legends EOR &nbsp;/&nbsp; Channel Attribution"))
    story.append(Paragraph(
        "After your feedback, Legends is modelled as a booked executive "
        "briefing motion, not a lead form motion. The metric is cost per "
        "booked call with a decision maker.",
        BODY,
    ))
    story.append(Paragraph(
        "Base scenario. £7,000 media budget. 29 executive briefings target.",
        NOTE,
    ))

    le_chan = [
        ["Channel", "Budget", "% Mix", "Cost / Briefing", "Briefings", "Notes"],
        ["LinkedIn Ads", "£3,500", "50%", "£220", "16",
         "ABM on UK CFOs, COOs, Founders"],
        ["Google Search", "£2,100", "30%", "£190", "11",
         '"SA operations", "SA team setup", "BPO south africa"'],
        ["Sponsored newsletters", "£700", "10%", "£140", "5",
         "The Hustle UK, Morning Brew UK, Offshore Weekly"],
        ["YouTube and podcasts", "£700", "10%", "awareness", "supports rest",
         "Thought leadership, brand lift, retargeting pool"],
        ["Total", "£7,000", "100%", "£240", "32", "Blended"],
    ]
    story.append(table_block(
        le_chan,
        [32 * mm, 18 * mm, 14 * mm, 22 * mm, 20 * mm, 61 * mm],
        highlight_rows=[5],
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("WHAT 32 BRIEFINGS PRODUCES &nbsp; / &nbsp; Base case", H_SUB))
    for line in [
        "22 qualified discovery deals (68% pass-through).",
        "6 closed contracts (25% of qualified).",
        "£28,000 average year-one contract value.",
        "<b>£168,000 year-one revenue from 32 briefings.</b>",
    ]:
        story.append(Paragraph("• &nbsp; " + line, BULLET))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "At a suggested £295 per delivered briefing plus retainer, Jason's "
        "year-one ROI on Legends sits at <b>9x to 13x</b>, same as the original "
        "proposal but through a more realistic motion.",
        BODY,
    ))

    story.append(PageBreak())

    story.append(section_title("05", "Three Scenarios Side By Side"))

    story.append(Paragraph("FUNDING BAY &nbsp;/&nbsp; Month one", H_SUB))
    fb_scen = [
        ["Metric", "Conservative", "Base", "Aggressive"],
        ["Leads delivered", "77", "100", "130"],
        ["Funded deals", "8", "19", "37"],
        ["Revenue (commission)", "£9,000", "£38,000", "£138,750"],
        ["ROI vs £15,500 invest", "-42%", "+145%", "+795%"],
    ]
    story.append(table_block(
        fb_scen, [55 * mm, 35 * mm, 35 * mm, 42 * mm],
        highlight_rows=[4],
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("LEGENDS EOR &nbsp;/&nbsp; Year one", H_SUB))
    le_scen = [
        ["Metric", "Conservative", "Base", "Aggressive"],
        ["Briefings booked", "22", "29", "40"],
        ["Closed contracts", "2", "6", "12"],
        ["Year-one revenue", "£44,000", "£168,000", "£504,000"],
        ["ROI vs annual invest", "1.6x", "9x", "27x"],
    ]
    story.append(table_block(
        le_scen, [55 * mm, 35 * mm, 35 * mm, 42 * mm],
        highlight_rows=[4],
    ))

    story.append(section_title("06", "Why These Numbers Are Defensible"))
    defensible = [
        ("AI qualification lift is documented, not hoped for.",
         "Claude-scored leads convert 25% to 30% better than unscored. "
         "Measured across 75% of B2B companies that have adopted AI scoring. "
         "(Landbase 2026, Gartner)"),
        ("Multi-step forms are proven on SME finance buyers.",
         "The 86% lift over single page holds for Funding Bay. We do not apply "
         "it to Legends, which is why Legends shifts to a briefing motion."),
        ("The NACFB 32% funded rate is a broker industry average.",
         "Not a top-quartile number. Funding Bay already operates at or above "
         "this benchmark. Our AI layer plus better lead scoring should push it "
         "higher, not equal it."),
    ]
    for title, body in defensible:
        story.append(Paragraph(
            f"<font color='#D4A537'><b>▸</b></font> &nbsp;<b>{title}</b>",
            BODY_TIGHT,
        ))
        story.append(Paragraph(body, BODY))

    story.append(PageBreak())

    story.append(section_title("07", "Sources"))
    story.append(Paragraph(
        "All links clickable. Every number in this report traces back to one of these.",
        NOTE,
    ))

    sources = [
        ("NACFB UK SME Lending 2024 Report",
         "Broker-led SME lending volumes and funded deal rates.",
         "https://nacfb.org/nacfb-members-fuel-70-of-uks-38bn-broker-led-sme-lending/"),
        ("Unbounce 2026 Conversion Benchmark Report",
         "Landing page conversion by industry and form type.",
         "https://www.apexure.com/blog/landing-page-conversion-rate-benchmarks-by-industry"),
        ("Sopro B2B Cost Per Lead Benchmarks 2025",
         "Channel-level CPL for financial services.",
         "https://sopro.io/resources/blog/b2b-cost-per-lead-benchmarks/"),
        ("Martal 2026 Cost Per Lead by Industry",
         "LinkedIn, Google, Meta blended rates for UK financial and professional services.",
         "https://martal.ca/cost-per-lead-by-industry-lb/"),
        ("Wise Monk EOR Pricing Guide 2026",
         "EOR monthly per-employee pricing, contract sizes, retention rates.",
         "https://www.wisemonk.io/blogs/eor-pricing-guide-cost-breakdown"),
        ("Remote People 2026 EOR Cost Comparison",
         "60+ EOR providers, fee structures, average deal sizes.",
         "https://remotepeople.com/employer-of-record-eor-cost-pricing/"),
        ("Zuko Form Analytics 2024",
         "Multi-step vs single-step form conversion data.",
         "https://www.zuko.io/blog/single-page-or-multi-step-form"),
        ("Landbase 2026 Lead Scoring Statistics",
         "AI lead scoring uplift on conversion rates.",
         "https://www.landbase.com/blog/lead-scoring-statistics"),
        ("McKinsey AI in Sales 2024",
         "Close rate lift, sales cycle reduction, lead quality improvement.",
         "https://www.smartlead.ai/blog/case-studies-companies-that-improved-conversions-with-ai-lead-scoring"),
        ("SaaS Hero 2026 B2B Conversion Benchmarks",
         "Visitor to lead, MQL to SQL, demo to close rates.",
         "https://www.saashero.net/content/2026-b2b-saas-conversion-benchmarks/"),
        ("MIT Lead Response Study",
         "Response-time impact on qualification rates. Referenced via InsideSales and Harvard Business Review.",
         None),
    ]

    for i, (title, desc, url) in enumerate(sources, 1):
        num = f"<font color='#D4A537'><b>{i:02d}</b></font>"
        story.append(Paragraph(
            f"{num} &nbsp; <b>{title}</b>", BODY_TIGHT,
        ))
        story.append(Paragraph(desc, SOURCE))
        if url:
            story.append(Paragraph(
                f'<link href="{url}"><font color="#5865F2">{url}</font></link>',
                SOURCE,
            ))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Next step.</b> Book 20 minutes and we walk through this live. "
        '<link href="https://cal.com/dalej"><font color="#5865F2">cal.com/dalej</font></link>',
        BODY,
    ))
    story.append(Paragraph(
        "Dale Jansen &nbsp;|&nbsp; Founder, dalej.co.za",
        COVER_META,
    ))

    doc.build(
        story,
        onFirstPage=cover_page,
        onLaterPages=header_footer,
    )
    print(f"OK: {OUTPUT}")


if __name__ == "__main__":
    build()
