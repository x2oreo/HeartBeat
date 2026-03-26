'use client'

import { useState } from 'react'
import type { EnhancedEmergencyCardData, EnhancedDoctorPrepData } from '@/types'

// ── Emergency Card PDF ───────────────────────────────────────────

type EmergencyCardPDFProps = {
  data: EnhancedEmergencyCardData
  shareUrl?: string
}

export function EmergencyCardPDFButton({ data, shareUrl }: EmergencyCardPDFProps) {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 0

      // Red header bar
      doc.setFillColor(220, 38, 38)
      doc.rect(0, y, pageWidth, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(data.aiContent.headline, 14, y + 12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Patient: ${data.patientName}  |  LQTS: ${data.genotype ?? 'Unknown'}`, 14, y + 22)
      y += 34

      // Critical warning
      doc.setFillColor(254, 226, 226)
      doc.rect(10, y, pageWidth - 20, 14, 'F')
      doc.setTextColor(153, 27, 27)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const warningLines = doc.splitTextToSize(data.aiContent.criticalWarning, pageWidth - 28)
      doc.text(warningLines, 14, y + 6)
      y += Math.max(14, warningLines.length * 5 + 6)
      y += 4

      // Drugs to avoid
      if (data.aiContent.drugsToAvoidByCategory.length > 0) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('DRUGS TO AVOID', 14, y + 4)
        y += 8

        for (const cat of data.aiContent.drugsToAvoidByCategory) {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100, 100, 100)
          doc.text(cat.category.toUpperCase(), 14, y + 4)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(180, 40, 40)
          doc.setFontSize(9)
          const drugsText = cat.drugs.join(', ')
          const drugLines = doc.splitTextToSize(drugsText, pageWidth - 28)
          doc.text(drugLines, 14, y + 4)
          y += drugLines.length * 4 + 4
        }
        y += 2
      }

      // Safe ER medications
      if (data.aiContent.safeERMedications.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('SAFE ER MEDICATIONS', 14, y + 4)
        y += 8

        for (const med of data.aiContent.safeERMedications) {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(21, 128, 61)
          doc.text(`${med.name}`, 14, y + 4)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text(` — ${med.notes}`, 14 + doc.getTextWidth(`${med.name} `), y + 4)
          y += 5
        }
        y += 4
      }

      // Emergency protocol
      if (data.aiContent.emergencyProtocolSteps.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('EMERGENCY PROTOCOL', 14, y + 4)
        y += 8

        data.aiContent.emergencyProtocolSteps.forEach((step, i) => {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(60, 60, 60)
          const lines = doc.splitTextToSize(`${i + 1}. ${step}`, pageWidth - 28)
          doc.text(lines, 14, y + 4)
          y += lines.length * 4 + 2
        })
        y += 2
      }

      // Emergency contacts
      if (data.emergencyContacts.length > 0) {
        if (y > 250) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('EMERGENCY CONTACTS', 14, y + 4)
        y += 8

        for (const contact of data.emergencyContacts) {
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(60, 60, 60)
          doc.text(`${contact.name} (${contact.relationship}): ${contact.phone}`, 14, y + 4)
          y += 5
        }
        y += 4
      }

      // QR code if share URL exists
      if (shareUrl) {
        try {
          const QRCode = await import('qrcode')
          const qrDataUrl = await QRCode.toDataURL(shareUrl, { width: 100, margin: 1 })
          if (y > 230) { doc.addPage(); y = 14 }
          doc.addImage(qrDataUrl, 'PNG', pageWidth - 40, y, 26, 26)
          doc.setFontSize(7)
          doc.setTextColor(120, 120, 120)
          doc.text('Scan for digital card', pageWidth - 40, y + 30)
          y += 34
        } catch {
          // QR generation failed, skip silently
        }
      }

      // Disclaimer
      if (y > 260) { doc.addPage(); y = 14 }
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        'AI-generated reference only. Always consult the patient\'s cardiologist. Generated by HeartGuard.',
        14,
        282,
      )

      doc.save('heartguard-emergency-card.pdf')
    } catch (error) {
      console.error('PDF generation failed:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {generating ? 'Generating PDF...' : 'Download PDF'}
    </button>
  )
}

// ── Doctor Prep PDF ──────────────────────────────────────────────

type DoctorPrepPDFProps = {
  data: EnhancedDoctorPrepData
}

export function DoctorPrepPDFButton({ data }: DoctorPrepPDFProps) {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 0

      // Blue header
      doc.setFillColor(37, 99, 235)
      doc.rect(0, y, pageWidth, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Doctor Visit Preparation', 14, y + 12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const subtitle = `Patient: ${data.patientName}  |  LQTS: ${data.genotype ?? 'Unknown'}${data.procedureType ? `  |  Procedure: ${data.procedureType}` : ''}`
      doc.text(subtitle, 14, y + 22)
      y += 34

      // Drug safety brief
      doc.setFillColor(239, 246, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 64, 175)
      const briefLines = doc.splitTextToSize(data.drugSafetyBrief, pageWidth - 28)
      const briefHeight = briefLines.length * 4 + 8
      doc.rect(10, y, pageWidth - 20, briefHeight, 'F')
      doc.text(briefLines, 14, y + 6)
      y += briefHeight + 4

      // Medications to avoid
      if (data.medicationsToAvoid.length > 0) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('MEDICATIONS TO AVOID', 14, y + 4)
        y += 8

        for (const med of data.medicationsToAvoid) {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(180, 40, 40)
          doc.text(`\u2022 ${med}`, 14, y + 4)
          y += 5
        }
        y += 4
      }

      // Safer alternatives
      if (data.saferAlternatives.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('SAFER ALTERNATIVES', 14, y + 4)
        y += 8

        for (const alt of data.saferAlternatives) {
          if (y > 255) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(21, 128, 61)
          doc.text(alt.genericName, 14, y + 4)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(80, 80, 80)
          doc.text(` (${alt.drugClass}) — ${alt.whySafer}`, 14 + doc.getTextWidth(alt.genericName + ' '), y + 4)
          y += 5
        }
        y += 4
      }

      // Questions for doctor
      if (data.questionsForDoctor.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('QUESTIONS FOR YOUR DOCTOR', 14, y + 4)
        y += 8

        data.questionsForDoctor.forEach((q, i) => {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(60, 60, 60)
          const lines = doc.splitTextToSize(`${i + 1}. ${q}`, pageWidth - 28)
          doc.text(lines, 14, y + 4)
          y += lines.length * 4 + 2
        })
        y += 2
      }

      // Procedure-specific warnings
      if (data.procedureSpecificWarnings.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('PROCEDURE-SPECIFIC WARNINGS', 14, y + 4)
        y += 8

        for (const warning of data.procedureSpecificWarnings) {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(180, 100, 0)
          const lines = doc.splitTextToSize(`\u26A0 ${warning}`, pageWidth - 28)
          doc.text(lines, 14, y + 4)
          y += lines.length * 4 + 2
        }
      }

      // Disclaimer
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        'AI-generated reference only. This does not replace professional medical advice. Generated by HeartGuard.',
        14,
        282,
      )

      doc.save('heartguard-doctor-prep.pdf')
    } catch (error) {
      console.error('PDF generation failed:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={generating}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {generating ? 'Generating PDF...' : 'Download PDF'}
    </button>
  )
}
