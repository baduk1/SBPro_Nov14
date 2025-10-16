import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface EstimateItem {
  code: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  supplier_name?: string
}

interface CostAdjustment {
  name: string
  calculation_type: 'percent' | 'fixed' | 'per_unit'
  value: number
  calculated_amount?: number
}

interface Estimate {
  name: string
  description?: string
  base_total: number
  adjustments_total: number
  final_total: number
  currency: string
  status: string
  created_at: string
}

export function generateBidProposal(
  estimate: Estimate,
  items: EstimateItem[],
  adjustments: CostAdjustment[] = []
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Header with branding
  doc.setFillColor(25, 118, 210) // Primary blue
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('BILL OF QUANTITIES', 14, 20)

  doc.setFontSize(10)
  doc.text('Bid Proposal', 14, 30)

  // Document info
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.text(`Project: ${estimate.name}`, 14, 52)

  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`Date: ${new Date(estimate.created_at).toLocaleDateString()}`, 14, 58)
  doc.text(`Status: ${estimate.status.toUpperCase()}`, 14, 63)
  if (estimate.description) {
    doc.text(`Description: ${estimate.description.substring(0, 80)}`, 14, 68)
  }

  // Items table
  const tableStartY = estimate.description ? 75 : 70

  autoTable(doc, {
    startY: tableStartY,
    head: [['Code', 'Description', 'Qty', 'Unit', 'Rate', 'Total']],
    body: items.map(i => [
      i.code,
      i.description.length > 40 ? i.description.substring(0, 37) + '...' : i.description,
      i.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      i.unit,
      `${estimate.currency}${i.unit_price.toFixed(2)}`,
      `${estimate.currency}${i.total_price.toFixed(2)}`
    ]),
    foot: [[
      '', '', '', '',
      { content: 'Subtotal:', styles: { fontStyle: 'bold' } },
      { content: `${estimate.currency}${estimate.base_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold' } }
    ]],
    theme: 'striped',
    headStyles: { fillColor: [25, 118, 210], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], textColor: 0 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'right' },
      3: { cellWidth: 15 },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    }
  })

  // Cost adjustments section
  let currentY = (doc as any).lastAutoTable.finalY + 10

  if (adjustments.length > 0 && currentY < pageHeight - 60) {
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text('Cost Adjustments:', 14, currentY)
    currentY += 2

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Item', 'Type', 'Value', 'Amount']],
      body: adjustments.map(adj => [
        adj.name,
        adj.calculation_type === 'percent' ? 'Percentage' :
        adj.calculation_type === 'fixed' ? 'Fixed' : 'Per Unit',
        adj.calculation_type === 'percent' ? `${adj.value}%` :
        `${estimate.currency}${adj.value.toFixed(2)}`,
        `${estimate.currency}${(adj.calculated_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      ]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: 0, fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        3: { halign: 'right' }
      }
    })

    currentY = (doc as any).lastAutoTable.finalY + 5
  }

  // Final total box
  const boxY = Math.max(currentY, pageHeight - 50)

  doc.setFillColor(237, 108, 2) // Warning color
  doc.rect(pageWidth - 75, boxY, 60, 12, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FINAL TOTAL:', pageWidth - 72, boxY + 8)

  doc.setFontSize(14)
  doc.text(
    `${estimate.currency}${estimate.final_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    pageWidth - 18,
    boxY + 8,
    { align: 'right' }
  )

  // Footer
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'Generated with SkyBuild Pro - Construction Takeoff & Estimating',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Download
  const filename = `${estimate.name.replace(/[^a-z0-9]/gi, '_')}_proposal.pdf`
  doc.save(filename)
}
