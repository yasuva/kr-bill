import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def format_inr(number):
    try:
        val = float(number)
    except:
        val = 0.0
    s = f"{val:.2f}"
    dec = s[-3:]
    num = s[:-3]
    l = len(num)
    if l <= 3:
        return "Rs. " + num + dec
    last_three = num[-3:]
    remaining = num[:-3]
    groups = []
    while remaining:
        groups.append(remaining[-2:])
        remaining = remaining[:-2]
    groups.reverse()
    groups.append(last_three)
    return "Rs. " + ",".join(groups) + dec

def generate_invoice_pdf(bill_data, output_path):
    """
    Generates a highly robust, polished invoice receipt PDF using ReportLab layout.
    
    :param bill_data: dict containing transaction fields like bill_no, customer_name, subtotal, grand_total, items
    :param output_path: file destination url
    """
    # Create target directories
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom elegant typography styles
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=15
    )
    
    body_style = ParagraphStyle(
        'InvoiceBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        leading=14
    )
    
    bold_body = ParagraphStyle(
        'InvoiceBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    right_align_body = ParagraphStyle(
        'RightAlignBody',
        parent=body_style,
        alignment=2 # Right
    )
    
    right_align_bold = ParagraphStyle(
        'RightAlignBold',
        parent=bold_body,
        alignment=2 # Right
    )
    
    h3_title = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=colors.HexColor('#1e293b'),
        spaceAfter=10,
        spaceBefore=15
    )
    
    story = []
    
    # 1. Company Logo/Header Block
    header_data = [
        [
            Paragraph("KR STORE", title_style),
            Paragraph("<b>INVOICE / RECEIPT</b>", right_align_bold)
        ],
        [
            Paragraph("Your Trusted Premium POS Retailer<br/>Email: support@krstore.com", subtitle_style),
            Paragraph(f"<b>Bill No:</b> {bill_data.get('bill_no', 'N/A')}<br/><b>Date:</b> {bill_data.get('date', 'N/A')}", right_align_body)
        ]
    ]
    
    header_table = Table(header_data, colWidths=[4.0*inch, 3.2*inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    
    story.append(header_table)
    story.append(Spacer(1, 15))
    
    # Divider Line
    line_data = [['']]
    line_table = Table(line_data, colWidths=[7.2*inch])
    line_table.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 1.5, colors.HexColor('#2563eb')),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(line_table)
    story.append(Spacer(1, 15))
    
    # 2. Billing & Transaction meta data
    cust_name = bill_data.get('customer_name', 'Walk-in Customer')
    pmt_method = bill_data.get('payment_method', 'Cash')
    
    meta_data = [
        [
            Paragraph(f"<b>CUSTOMER DETAILS</b><br/>Name: {cust_name}", body_style),
            Paragraph(f"<b>PAYMENT SUMMARY</b><br/>Payment Method: {pmt_method}<br/>Status: PAID", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[3.6*inch, 3.6*inch])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#faf5ff')), # Subtle color fill
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 20))
    
    # 3. Product Billing Items Table
    story.append(Paragraph("Purchased Items", h3_title))
    
    table_content = [[
        Paragraph("<b>#</b>", bold_body),
        Paragraph("<b>Product Description</b>", bold_body),
        Paragraph("<b>Price</b>", bold_body),
        Paragraph("<b>Qty</b>", bold_body),
        Paragraph("<b>Total</b>", bold_body)
    ]]
    
    items_list = bill_data.get('items', [])
    for idx, item in enumerate(items_list):
        qty = item.get('quantity', 1)
        price = item.get('unit_price', 0.0)
        tot = item.get('total', qty * price)
        
        table_content.append([
            Paragraph(str(idx + 1), body_style),
            Paragraph(item.get('product_name', 'Unnamed Product'), body_style),
            Paragraph(format_inr(price), body_style),
            Paragraph(str(qty), body_style),
            Paragraph(format_inr(tot), body_style)
        ])
        
    items_table = Table(table_content, colWidths=[0.4*inch, 3.8*inch, 1.0*inch, 0.8*inch, 1.2*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))
    
    # 4. Totals Breakdown Block
    grand = bill_data.get('grand_total', 0.0)
    
    totals_data = [
        [Paragraph("", body_style), Paragraph("Total Items", body_style), Paragraph(str(len(items_list)), right_align_body)],
        [Paragraph("", body_style), Paragraph("Total Quantity", body_style), Paragraph(str(sum(i.get('quantity', 1) for i in items_list)), right_align_body)],
        [Paragraph("", body_style), Paragraph("<b>Grand Total</b>", bold_body), Paragraph(f"<b>{format_inr(grand)}</b>", right_align_bold)],
    ]
    
    totals_table = Table(totals_data, colWidths=[4.2*inch, 1.5*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('LINEBELOW', (1,2), (2,2), 1.5, colors.HexColor('#2563eb')),
        ('BOTTOMPADDING', (1,0), (-1,-1), 4),
        ('TOPPADDING', (1,0), (-1,-1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 40))
    
    # 5. Bottom Thank You Note
    thanks_style = ParagraphStyle(
        'ThankYouNote',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        alignment=1, # Centered
        spaceBefore=10
    )
    
    story.append(Paragraph("<b>Thank you for shopping at KR Store!</b>", thanks_style))
    story.append(Paragraph("Connect online for returns & live worldwide customer support.", thanks_style))
    story.append(Paragraph("<font size=8 color='#94a3b8'>This is a computerized receipt and doesn't require digital signature.</font>", thanks_style))
    
    # Compile PDF Document
    doc.build(story)
