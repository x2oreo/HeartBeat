'use client'

import { useState } from 'react'
import type { EnhancedEmergencyCardData, DoctorPrepData, ProhibitedDrug } from '@/types'

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
      if (!data.aiContent) throw new Error('No AI content available for PDF')
      const aiContent = data.aiContent

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
      doc.text(aiContent.headline, 14, y + 12)
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
      const warningLines = doc.splitTextToSize(aiContent.criticalWarning, pageWidth - 28)
      doc.text(warningLines, 14, y + 6)
      y += Math.max(14, warningLines.length * 5 + 6)
      y += 4

      // Drugs to avoid
      if (aiContent.drugsToAvoidByCategory.length > 0) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('DRUGS TO AVOID', 14, y + 4)
        y += 8

        for (const cat of aiContent.drugsToAvoidByCategory) {
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
      if (aiContent.safeERMedications.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('SAFE ER MEDICATIONS', 14, y + 4)
        y += 8

        for (const med of aiContent.safeERMedications) {
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
      if (aiContent.emergencyProtocolSteps.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('EMERGENCY PROTOCOL', 14, y + 4)
        y += 8

        aiContent.emergencyProtocolSteps.forEach((step, i) => {
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

      // Disclaimer — ensure it doesn't overlap content
      if (y > 270) { doc.addPage(); y = 14 }
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        'AI-generated reference only. Always consult the patient\'s cardiologist. Generated by QTShield.',
        14,
        Math.max(y + 6, 282),
      )

      doc.save('qtshield-emergency-card.pdf')
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
  data: DoctorPrepData
}

export function DoctorPrepPDFButton({ data }: DoctorPrepPDFProps) {
  const [generating, setGenerating] = useState(false)

  const resolvedSpecialty = data.doctorSpecialty === 'Other' && data.customSpecialty
    ? data.customSpecialty
    : data.doctorSpecialty
  const resolvedLanguage = data.language === 'Other' && data.customLanguage
    ? data.customLanguage
    : data.language

  async function handleDownload() {
    setGenerating(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 0

      // Blue header
      doc.setFillColor(52, 120, 246)
      doc.rect(0, y, pageWidth, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Doctor Visit Preparation', 14, y + 12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Patient: ${data.patientName}  |  LQTS: ${data.genotype ?? 'Unknown'}`, 14, y + 20)
      doc.setFontSize(9)
      doc.text(`Specialty: ${resolvedSpecialty}  |  Language: ${resolvedLanguage}  |  ${new Date(data.generatedAt).toLocaleDateString()}`, 14, y + 27)
      y += 38

      // Syndrome explanation
      if (data.syndromeExplanation) {
        doc.setFillColor(235, 245, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30, 64, 175)
        const synLines = doc.splitTextToSize(data.syndromeExplanation, pageWidth - 28)
        const synHeight = synLines.length * 4 + 8
        doc.rect(10, y, pageWidth - 20, synHeight, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text('ABOUT THIS CONDITION', 14, y + 5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(synLines, 14, y + 10)
        y += synHeight + 4
      }

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

      // Current medications with implications
      if (data.currentMedications.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('CURRENT MEDICATIONS', 14, y + 4)
        y += 8

        for (const med of data.currentMedications) {
          if (y > 255) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(40, 40, 40)
          const riskLabel = med.riskCategory.replace('_', ' ')
          doc.text(`${med.name} — ${riskLabel}${med.isDTA ? ' (DTA)' : ''}`, 14, y + 4)
          const impl = data.medicationImplications.find(
            (m) => m.name.toLowerCase() === med.name.toLowerCase(),
          )
          if (impl) {
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(80, 80, 80)
            const implLines = doc.splitTextToSize(impl.implication, pageWidth - 28)
            doc.text(implLines, 14, y + 8)
            y += implLines.length * 4 + 10
          } else {
            y += 6
          }
        }
        y += 2
      }

      // Medications to avoid
      if (data.medicationsToAvoid.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('MEDICATIONS TO AVOID', 14, y + 4)
        y += 8

        for (const med of data.medicationsToAvoid) {
          if (y > 255) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(180, 40, 40)
          const avoidNameLines = doc.splitTextToSize(`${med.genericName} (${med.drugClass})`, pageWidth - 28)
          doc.text(avoidNameLines, 14, y + 4)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 60, 60)
          const reasonLines = doc.splitTextToSize(med.reason, pageWidth - 28)
          doc.text(reasonLines, 14, y + 4 + avoidNameLines.length * 4)
          y += avoidNameLines.length * 4 + reasonLines.length * 4 + 6
        }
        y += 2
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
          const altDetailLines = doc.splitTextToSize(`(${alt.drugClass}) — ${alt.whySafer}`, pageWidth - 28)
          doc.text(altDetailLines, 14, y + 8)
          y += altDetailLines.length * 4 + 8
        }
        y += 4
      }

      // Specialty warnings
      if (data.specialtyWarnings.length > 0) {
        if (y > 240) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`WARNINGS FOR ${resolvedSpecialty.toUpperCase()}`, 14, y + 4)
        y += 8

        for (const warning of data.specialtyWarnings) {
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(180, 100, 0)
          const lines = doc.splitTextToSize(`\u26A0 ${warning}`, pageWidth - 28)
          doc.text(lines, 14, y + 4)
          y += lines.length * 4 + 2
        }
        y += 2
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

      // Prohibited drugs — compact grouped list
      if (data.prohibitedDrugs.length > 0) {
        if (y > 230) { doc.addPage(); y = 14 }
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`ALL PROHIBITED DRUGS (${data.prohibitedDrugs.length})`, 14, y + 4)
        y += 8

        const byClass = new Map<string, ProhibitedDrug[]>()
        for (const d of data.prohibitedDrugs) {
          const list = byClass.get(d.drugClass) ?? []
          list.push(d)
          byClass.set(d.drugClass, list)
        }

        for (const [cls, drugs] of byClass) {
          const names = drugs.map(d => d.isDTA ? `${d.genericName} (DTA)` : d.genericName)
          if (y > 260) { doc.addPage(); y = 14 }
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(100, 100, 100)
          doc.text(cls.toUpperCase(), 14, y + 4)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(180, 40, 40)
          doc.setFontSize(8)
          const drugsText = names.join(', ')
          const drugLines = doc.splitTextToSize(drugsText, pageWidth - 28)
          doc.text(drugLines, 14, y + 3)
          y += drugLines.length * 3.5 + 4
        }
      }

      // Disclaimer — ensure it doesn't overlap content
      if (y > 270) { doc.addPage(); y = 14 }
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        'AI-generated reference only. This does not replace professional medical advice. Generated by QTShield.',
        14,
        Math.max(y + 6, 282),
      )

      doc.save(`qtshield-doctor-prep-${resolvedSpecialty.toLowerCase().replace(/\s+/g, '-')}.pdf`)
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
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {generating ? 'Generating PDF...' : 'Download PDF'}
    </button>
  )
}
