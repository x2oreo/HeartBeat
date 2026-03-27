export type Lang = 'en' | 'bg'

type LQTTypeContent = {
  name: string
  channelAffected: string
  triggers: string[]
  ecgPattern: string
  treatment: string
  guidance: { do: string[]; dont: string[] }
  restrictions: string[]
}

type EmergencyProtocol = {
  title: string
  subtitle: string
  immediateSteps: { step: string; detail: string }[]
  doNotDo: string[]
  torsadesProtocol: {
    title: string
    description: string
    steps: string[]
  }
  genotypeNotes: Record<string, { title: string; notes: string[] }>
}

type Translations = {
  // Page chrome
  title: string
  subtitle: string
  emergencyMedicalCard: string
  poweredBy: string

  // Section headings
  sections: {
    patientInfo: string
    personalNotes: string
    diseaseOverview: string
    myType: string
    medications: string
    currentMedications: string
    restrictions: string
    guidance: string
    whatToDo: string
    whatNotToDo: string
    emergencyContacts: string
    drugsToAvoid: string
    safeERMedications: string
    emergencyProtocol: string
    disclaimer: string
    criticalWarning: string
  }

  // LQTS Overview
  lqtsOverview: {
    title: string
    paragraphs: string[]
  }

  // Type-specific content
  lqtsTypes: Record<string, LQTTypeContent>

  // General LQTS precautions (for OTHER/UNKNOWN)
  generalPrecautions: {
    title: string
    items: string[]
  }

  // Medication labels
  medicationLabels: {
    dose: string
    brand: string
    risk: string
    knownRisk: string
    possibleRisk: string
    conditionalRisk: string
    notListed: string
    dtaWarning: string
  }

  // Contact labels
  contactLabels: {
    call: string
    cardiologist: string
    family: string
    friend: string
  }

  // Emergency protocol for first responders
  emergencyProtocol: EmergencyProtocol

  // Disclaimer
  disclaimerText: string
  generatedBy: string

  // Misc
  noMedications: string
  noContacts: string
  typeUnknown: string
}

export const translations: Record<Lang, Translations> = {
  en: {
    title: 'Emergency Card',
    subtitle: 'Medical information for emergency responders',
    emergencyMedicalCard: 'Emergency Medical Card',
    poweredBy: 'Powered by QTShield',

    sections: {
      patientInfo: 'Patient Information',
      personalNotes: 'Personal Notes',
      diseaseOverview: 'About Long QT Syndrome',
      myType: 'My LQTS Type',
      medications: 'Medications',
      currentMedications: 'Current Medications',
      restrictions: 'Restrictions',
      guidance: 'Guidance',
      whatToDo: 'What to Do',
      whatNotToDo: 'What NOT to Do',
      emergencyContacts: 'Emergency Contacts',
      drugsToAvoid: 'Drugs to Avoid',
      safeERMedications: 'Safe ER Medications',
      emergencyProtocol: 'Emergency Protocol',
      disclaimer: 'Disclaimer',
      criticalWarning: 'Critical Warning',
    },

    lqtsOverview: {
      title: 'What is Long QT Syndrome?',
      paragraphs: [
        'Long QT Syndrome (LQTS) is a hereditary heart condition that affects the electrical system of the heart. It causes a prolongation of the QT interval on an electrocardiogram (ECG), which means the heart takes longer than normal to recharge between beats.',
        'This electrical abnormality can trigger fast, chaotic heartbeats (arrhythmias), which may lead to fainting, seizures, or in severe cases, sudden cardiac arrest. LQTS affects approximately 1 in 2,000 people.',
        'Many common medications — including certain antibiotics, antihistamines, antidepressants, and pain medications — can further prolong the QT interval and are potentially life-threatening for people with LQTS. This card helps emergency responders identify safe treatment options.',
      ],
    },

    lqtsTypes: {
      LQT1: {
        name: 'Long QT Syndrome Type 1 (LQT1)',
        channelAffected: 'KCNQ1 gene — slow potassium channel (IKs)',
        triggers: [
          'Physical exercise, especially swimming',
          'Sudden exertion or diving into cold water',
          'Emotional stress during physical activity',
        ],
        ecgPattern: 'Broad-based T-waves on ECG',
        treatment: 'Beta-blockers (nadolol, propranolol) are the most effective treatment. ICD may be considered for high-risk patients.',
        guidance: {
          do: [
            'Take beta-blocker medication consistently every day',
            'Always swim with a buddy or under supervision',
            'Warm up gradually before exercise',
            'Carry emergency medication information at all times',
            'Inform coaches and PE teachers about the condition',
            'Stay well-hydrated during physical activity',
          ],
          dont: [
            'Do not participate in competitive swimming',
            'Do not engage in unsupervised intense exercise',
            'Do not skip beta-blocker doses',
            'Do not take QT-prolonging medications without consulting a cardiologist',
            'Do not ignore fainting episodes — seek immediate medical attention',
            'Do not dive into cold water suddenly',
          ],
        },
        restrictions: [
          'No competitive sports, especially swimming and diving',
          'No unsupervised water activities',
          'Avoid sudden intense physical exertion',
          'Avoid dehydration and electrolyte imbalances',
          'Avoid all QT-prolonging medications',
        ],
      },
      LQT2: {
        name: 'Long QT Syndrome Type 2 (LQT2)',
        channelAffected: 'KCNH2 (hERG) gene — rapid potassium channel (IKr)',
        triggers: [
          'Sudden loud noises (alarm clocks, phone ringing, doorbells)',
          'Emotional stress or being startled',
          'Sleep interruption by auditory stimuli',
        ],
        ecgPattern: 'Low-amplitude, notched, or bifid T-waves on ECG',
        treatment: 'Beta-blockers (nadolol preferred). Potassium supplementation to maintain high-normal levels. ICD for high-risk patients.',
        guidance: {
          do: [
            'Use vibrating alarms instead of auditory alarms',
            'Keep potassium levels at high-normal range (4.0–5.0 mEq/L)',
            'Take magnesium supplements as directed by cardiologist',
            'Set phone to vibrate or silent mode, especially during sleep',
            'Monitor electrolyte levels regularly with blood tests',
            'Inform family members about avoiding startling the patient',
          ],
          dont: [
            'Do not use loud alarm clocks or sudden ringtones',
            'Do not allow potassium levels to drop (avoid fasting, vomiting, diarrhea without replacing electrolytes)',
            'Do not take any QT-prolonging medications — LQT2 is the most drug-sensitive type',
            'Do not skip potassium or magnesium supplements',
            'Do not ignore episodes of fainting triggered by sudden noises',
            'Do not consume excessive caffeine',
          ],
        },
        restrictions: [
          'Avoid sudden auditory stimuli (loud alarms, startling noises)',
          'Strict avoidance of all QT-prolonging medications — this type is the most drug-sensitive',
          'Maintain potassium above 4.0 mEq/L at all times',
          'Avoid hypokalemia triggers (fasting, excessive sweating without electrolyte replacement)',
          'Avoid emotional shock situations when possible',
        ],
      },
      LQT3: {
        name: 'Long QT Syndrome Type 3 (LQT3)',
        channelAffected: 'SCN5A gene — sodium channel (INa)',
        triggers: [
          'Rest and sleep (events often occur at night)',
          'Slow heart rate (bradycardia)',
          'Periods of inactivity',
        ],
        ecgPattern: 'Late-onset, peaked T-waves with long isoelectric ST segment',
        treatment: 'Sodium channel blockers (mexiletine) may be beneficial. ICD is often recommended. Beta-blockers may be less effective than in LQT1/LQT2.',
        guidance: {
          do: [
            'Consider an Implantable Cardioverter-Defibrillator (ICD) as recommended',
            'Discuss mexiletine or other sodium channel blockers with cardiologist',
            'Maintain a regular sleep schedule',
            'Use a heart rate monitor, especially during sleep',
            'Keep emergency contacts accessible at night',
            'Moderate physical activity may be beneficial (raises heart rate)',
          ],
          dont: [
            'Do not take medications that lower heart rate excessively',
            'Do not take sleep-inducing medications that prolong QT',
            'Do not ignore nighttime palpitations or irregular heartbeat',
            'Do not skip cardiology follow-ups — LQT3 carries higher sudden death risk',
            'Do not take QT-prolonging medications',
            'Do not ignore slow resting heart rate symptoms',
          ],
        },
        restrictions: [
          'Avoid medications that cause bradycardia (excessive heart rate slowing)',
          'Avoid sleep medications that prolong QT interval',
          'Nighttime cardiac monitoring is recommended',
          'Avoid all QT-prolonging medications',
          'Regular ICD checks if implanted',
        ],
      },
    },

    generalPrecautions: {
      title: 'General LQTS Precautions',
      items: [
        'Avoid all medications known to prolong the QT interval',
        'Maintain normal electrolyte levels (potassium, magnesium, calcium)',
        'Take prescribed medications consistently',
        'Inform all healthcare providers about the LQTS diagnosis',
        'Carry emergency contact information at all times',
        'Seek immediate medical attention for fainting, seizures, or palpitations',
        'Regular cardiology follow-ups with ECG monitoring',
      ],
    },

    medicationLabels: {
      dose: 'Dose',
      brand: 'Brand',
      risk: 'Risk',
      knownRisk: 'Known Risk',
      possibleRisk: 'Possible Risk',
      conditionalRisk: 'Conditional Risk',
      notListed: 'Not Listed',
      dtaWarning: 'Designated Torsades Agent',
    },

    contactLabels: {
      call: 'Call',
      cardiologist: 'Cardiologist',
      family: 'Family',
      friend: 'Friend',
    },

    emergencyProtocol: {
      title: 'EMERGENCY: IF THIS PERSON IS UNRESPONSIVE',
      subtitle: 'This patient has Long QT Syndrome — a genetic heart condition that can cause life-threatening arrhythmias. Follow this protocol immediately.',
      immediateSteps: [
        {
          step: 'Check pulse and breathing',
          detail: 'If no pulse, begin CPR immediately and call emergency services (112 / 911).',
        },
        {
          step: 'Use an AED if available',
          detail: 'AED is SAFE and recommended for LQTS patients. Apply and follow voice prompts. Defibrillation can terminate Torsades de Pointes.',
        },
        {
          step: 'Get a 12-lead ECG as soon as possible',
          detail: 'Look for Torsades de Pointes (polymorphic ventricular tachycardia with twisting QRS axis) or prolonged QTc interval (>500 ms is critical).',
        },
        {
          step: 'Administer IV Magnesium Sulfate',
          detail: '2 g IV over 1–2 minutes for active Torsades de Pointes. This is the first-line treatment even if serum magnesium is normal.',
        },
        {
          step: 'Correct electrolytes',
          detail: 'Maintain potassium at 4.5–5.0 mEq/L and magnesium at >2.0 mg/dL. Hypokalemia dramatically increases arrhythmia risk.',
        },
        {
          step: 'Overdrive pacing if Torsades persists',
          detail: 'Temporary transvenous pacing at 90–110 bpm or IV isoproterenol to increase heart rate and shorten the QT interval.',
        },
      ],
      doNotDo: [
        'Do NOT administer amiodarone — it prolongs QT and will worsen the arrhythmia',
        'Do NOT administer sotalol, procainamide, or any class III antiarrhythmic',
        'Do NOT administer droperidol, haloperidol, or ondansetron (Zofran) for nausea/agitation',
        'Do NOT administer IV erythromycin or fluoroquinolone antibiotics (ciprofloxacin, moxifloxacin, levofloxacin)',
        'Do NOT give metoclopramide for nausea',
        'Do NOT use any drug from the QT-prolonging list without checking — see patient\'s medication list below',
        'Do NOT allow potassium to drop below 4.0 mEq/L',
      ],
      torsadesProtocol: {
        title: 'Torsades de Pointes Protocol',
        description: 'If ECG shows Torsades de Pointes (polymorphic VT with twisting axis):',
        steps: [
          'IV Magnesium Sulfate 2 g bolus over 1–2 min (repeat once if needed)',
          'If unstable: immediate defibrillation (unsynchronized shock)',
          'If recurrent: overdrive pacing at 90–110 bpm',
          'IV Isoproterenol as bridge to pacing (increases heart rate, shortens QT)',
          'Correct K⁺ to 4.5–5.0 mEq/L and Mg²⁺ to >2.0 mg/dL',
          'AVOID amiodarone, lidocaine, and all QT-prolonging antiarrhythmics',
        ],
      },
      genotypeNotes: {
        LQT1: {
          title: 'LQT1-Specific Emergency Notes',
          notes: [
            'Events often triggered by exercise or swimming — ask about recent physical activity',
            'Beta-blockers are effective — do NOT discontinue patient\'s beta-blocker',
            'If patient was swimming: suspect drowning secondary to arrhythmia, not primary drowning',
          ],
        },
        LQT2: {
          title: 'LQT2-Specific Emergency Notes',
          notes: [
            'Events often triggered by sudden loud noises or emotional stress',
            'This type is the MOST drug-sensitive — extra caution with all medications',
            'Potassium levels are critical — check immediately and maintain >4.5 mEq/L',
            'Beta-blockers + potassium supplementation is the standard treatment',
          ],
        },
        LQT3: {
          title: 'LQT3-Specific Emergency Notes',
          notes: [
            'Events often occur during rest or sleep — higher risk of sudden cardiac death',
            'Beta-blockers are LESS effective for LQT3 compared to LQT1/LQT2',
            'Patient may benefit from sodium channel blockers (mexiletine)',
            'ICD (Implantable Cardioverter-Defibrillator) may be present — check chest for device',
            'Higher risk type — escalate to cardiology urgently',
          ],
        },
      },
    },

    disclaimerText:
      'This emergency card is an AI-generated reference document. It does not replace professional medical advice. Always consult the patient\'s cardiologist before administering medications or making treatment decisions.',
    generatedBy: 'Generated by QTShield',

    noMedications: 'No medications listed.',
    noContacts: 'No emergency contacts listed.',
    typeUnknown: 'LQTS type not specified. General precautions apply.',
  },

  bg: {
    title: 'Спешна Карта',
    subtitle: 'Медицинска информация за спешна помощ',
    emergencyMedicalCard: 'Спешна Медицинска Карта',
    poweredBy: 'Създадено с QTShield',

    sections: {
      patientInfo: 'Информация за пациента',
      personalNotes: 'Лични бележки',
      diseaseOverview: 'За Синдрома на удължен QT',
      myType: 'Моят тип LQTS',
      medications: 'Медикаменти',
      currentMedications: 'Текущи медикаменти',
      restrictions: 'Ограничения',
      guidance: 'Насоки',
      whatToDo: 'Какво да правя',
      whatNotToDo: 'Какво да НЕ правя',
      emergencyContacts: 'Спешни контакти',
      drugsToAvoid: 'Лекарства за избягване',
      safeERMedications: 'Безопасни лекарства за спешна помощ',
      emergencyProtocol: 'Протокол за спешни случаи',
      disclaimer: 'Отказ от отговорност',
      criticalWarning: 'Критично предупреждение',
    },

    lqtsOverview: {
      title: 'Какво е Синдром на удължен QT?',
      paragraphs: [
        'Синдромът на удължен QT (LQTS) е наследствено сърдечно заболяване, което засяга електрическата система на сърцето. То причинява удължаване на QT интервала на електрокардиограмата (ЕКГ), което означава, че сърцето се нуждае от повече време за презареждане между ударите.',
        'Тази електрическа аномалия може да предизвика бързи, хаотични сърдечни удари (аритмии), които могат да доведат до припадък, гърчове или в тежки случаи — внезапен сърдечен арест. LQTS засяга приблизително 1 на 2000 души.',
        'Много често използвани лекарства — включително определени антибиотици, антихистамини, антидепресанти и обезболяващи — могат допълнително да удължат QT интервала и са потенциално животозастрашаващи за хора с LQTS. Тази карта помага на спешните екипи да определят безопасни варианти за лечение.',
      ],
    },

    lqtsTypes: {
      LQT1: {
        name: 'Синдром на удължен QT Тип 1 (LQT1)',
        channelAffected: 'Ген KCNQ1 — бавен калиев канал (IKs)',
        triggers: [
          'Физическо натоварване, особено плуване',
          'Внезапно усилие или скачане в студена вода',
          'Емоционален стрес по време на физическа активност',
        ],
        ecgPattern: 'Широки Т-вълни на ЕКГ',
        treatment: 'Бета-блокерите (надолол, пропранолол) са най-ефективното лечение. ИКД може да се обмисли при високорискови пациенти.',
        guidance: {
          do: [
            'Приемайте бета-блокери редовно всеки ден',
            'Винаги плувайте с придружител или под наблюдение',
            'Загрявайте постепенно преди физическо натоварване',
            'Носете информация за спешни лекарства по всяко време',
            'Информирайте треньори и учители за състоянието',
            'Поддържайте добра хидратация по време на физическа активност',
          ],
          dont: [
            'Не участвайте в състезателно плуване',
            'Не правете интензивни упражнения без наблюдение',
            'Не пропускайте дози бета-блокери',
            'Не приемайте QT-удължаващи лекарства без консултация с кардиолог',
            'Не игнорирайте припадъци — потърсете незабавна медицинска помощ',
            'Не скачайте внезапно в студена вода',
          ],
        },
        restrictions: [
          'Без състезателни спортове, особено плуване и гмуркане',
          'Без водни дейности без наблюдение',
          'Избягвайте внезапно интензивно физическо натоварване',
          'Избягвайте дехидратация и електролитен дисбаланс',
          'Избягвайте всички QT-удължаващи лекарства',
        ],
      },
      LQT2: {
        name: 'Синдром на удължен QT Тип 2 (LQT2)',
        channelAffected: 'Ген KCNH2 (hERG) — бърз калиев канал (IKr)',
        triggers: [
          'Внезапни силни звуци (будилници, телефонно звънене, звънец на вратата)',
          'Емоционален стрес или изненада',
          'Прекъсване на съня от звукови стимули',
        ],
        ecgPattern: 'Ниско-амплитудни, назъбени или раздвоени Т-вълни на ЕКГ',
        treatment: 'Бета-блокери (предпочита се надолол). Добавки с калий за поддържане на високо-нормални нива. ИКД за високорискови пациенти.',
        guidance: {
          do: [
            'Използвайте вибриращи будилници вместо звукови',
            'Поддържайте нивата на калий във високо-нормален диапазон (4.0–5.0 mEq/L)',
            'Приемайте добавки с магнезий по указание на кардиолога',
            'Настройте телефона на вибрация или безшумен режим, особено през нощта',
            'Следете нивата на електролити редовно с кръвни тестове',
            'Информирайте членовете на семейството да избягват стряскане на пациента',
          ],
          dont: [
            'Не използвайте силни будилници или внезапни мелодии',
            'Не допускайте спадане на калия (избягвайте гладуване, повръщане, диария без заместване на електролити)',
            'Не приемайте никакви QT-удължаващи лекарства — LQT2 е най-чувствителният тип към лекарства',
            'Не пропускайте добавки с калий или магнезий',
            'Не игнорирайте припадъци, предизвикани от внезапни шумове',
            'Не консумирайте прекомерно кофеин',
          ],
        },
        restrictions: [
          'Избягвайте внезапни звукови стимули (силни будилници, стряскащи шумове)',
          'Стриктно избягване на всички QT-удължаващи лекарства — този тип е най-чувствителен',
          'Поддържайте калий над 4.0 mEq/L по всяко време',
          'Избягвайте причини за хипокалиемия (гладуване, прекомерно изпотяване без заместване на електролити)',
          'Избягвайте ситуации на емоционален шок, когато е възможно',
        ],
      },
      LQT3: {
        name: 'Синдром на удължен QT Тип 3 (LQT3)',
        channelAffected: 'Ген SCN5A — натриев канал (INa)',
        triggers: [
          'Покой и сън (събитията често се случват през нощта)',
          'Бавна сърдечна честота (брадикардия)',
          'Периоди на неактивност',
        ],
        ecgPattern: 'Късно настъпващи, заострени Т-вълни с дълъг изоелектричен ST сегмент',
        treatment: 'Блокери на натриевите канали (мексилетин) могат да бъдат полезни. ИКД често се препоръчва. Бета-блокерите може да са по-малко ефективни отколкото при LQT1/LQT2.',
        guidance: {
          do: [
            'Обмислете имплантируем кардиовертер-дефибрилатор (ИКД) по препоръка',
            'Обсъдете мексилетин или други натриеви канал блокери с кардиолога',
            'Поддържайте редовен режим на сън',
            'Използвайте монитор за сърдечна честота, особено по време на сън',
            'Дръжте спешни контакти достъпни през нощта',
            'Умерената физическа активност може да е полезна (повишава сърдечната честота)',
          ],
          dont: [
            'Не приемайте лекарства, които прекомерно забавят сърдечната честота',
            'Не приемайте приспивателни, които удължават QT',
            'Не игнорирайте нощни сърцебиения или нередовен ритъм',
            'Не пропускайте кардиологични прегледи — LQT3 носи по-висок риск от внезапна смърт',
            'Не приемайте QT-удължаващи лекарства',
            'Не игнорирайте симптоми на бавна сърдечна честота в покой',
          ],
        },
        restrictions: [
          'Избягвайте лекарства, които причиняват брадикардия (прекомерно забавяне на сърдечния ритъм)',
          'Избягвайте приспивателни, които удължават QT интервала',
          'Препоръчва се нощен сърдечен мониторинг',
          'Избягвайте всички QT-удължаващи лекарства',
          'Редовни проверки на ИКД, ако е имплантиран',
        ],
      },
    },

    generalPrecautions: {
      title: 'Общи предпазни мерки при LQTS',
      items: [
        'Избягвайте всички лекарства, за които е известно, че удължават QT интервала',
        'Поддържайте нормални нива на електролити (калий, магнезий, калций)',
        'Приемайте предписаните лекарства редовно',
        'Информирайте всички медицински специалисти за диагнозата LQTS',
        'Носете информация за спешни контакти по всяко време',
        'Потърсете незабавна медицинска помощ при припадък, гърчове или сърцебиене',
        'Редовни кардиологични прегледи с ЕКГ мониторинг',
      ],
    },

    medicationLabels: {
      dose: 'Доза',
      brand: 'Марка',
      risk: 'Риск',
      knownRisk: 'Известен риск',
      possibleRisk: 'Възможен риск',
      conditionalRisk: 'Условен риск',
      notListed: 'Не е в списъка',
      dtaWarning: 'Означен агент за Torsades',
    },

    contactLabels: {
      call: 'Обади се',
      cardiologist: 'Кардиолог',
      family: 'Семейство',
      friend: 'Приятел',
    },

    emergencyProtocol: {
      title: 'СПЕШНО: АКО ТОЗИ ЧОВЕК Е В БЕЗСЪЗНАНИЕ',
      subtitle: 'Този пациент има Синдром на удължен QT — генетично сърдечно заболяване, което може да причини животозастрашаващи аритмии. Следвайте този протокол незабавно.',
      immediateSteps: [
        {
          step: 'Проверете пулс и дишане',
          detail: 'Ако няма пулс, започнете КПР незабавно и се обадете на спешна помощ (112).',
        },
        {
          step: 'Използвайте АВД ако е наличен',
          detail: 'АВД е БЕЗОПАСЕН и препоръчителен за пациенти с LQTS. Приложете и следвайте гласовите инструкции. Дефибрилацията може да прекрати Torsades de Pointes.',
        },
        {
          step: 'Направете 12-канална ЕКГ възможно най-скоро',
          detail: 'Търсете Torsades de Pointes (полиморфна камерна тахикардия с въртящ се QRS) или удължен QTc интервал (>500 ms е критично).',
        },
        {
          step: 'Приложете IV Магнезиев Сулфат',
          detail: '2 g IV за 1–2 минути при активен Torsades de Pointes. Това е първа линия на лечение дори при нормален серумен магнезий.',
        },
        {
          step: 'Коригирайте електролитите',
          detail: 'Поддържайте калий 4.5–5.0 mEq/L и магнезий >2.0 mg/dL. Хипокалиемията драматично увеличава риска от аритмия.',
        },
        {
          step: 'Овердрайв пейсиране при персистиращ Torsades',
          detail: 'Временно трансвенозно пейсиране на 90–110 уд./мин или IV изопротеренол за увеличаване на сърдечната честота и скъсяване на QT интервала.',
        },
      ],
      doNotDo: [
        'НЕ прилагайте амиодарон — удължава QT и ще влоши аритмията',
        'НЕ прилагайте соталол, прокаинамид или антиаритмици от клас III',
        'НЕ прилагайте дроперидол, халоперидол или ондансетрон (Zofran) при гадене/възбуда',
        'НЕ прилагайте IV еритромицин или флуорохинолонови антибиотици (ципрофлоксацин, моксифлоксацин, левофлоксацин)',
        'НЕ давайте метоклопрамид при гадене',
        'НЕ използвайте лекарства от списъка за QT-удължаване без проверка — вижте списъка с лекарства на пациента по-долу',
        'НЕ позволявайте калият да падне под 4.0 mEq/L',
      ],
      torsadesProtocol: {
        title: 'Протокол при Torsades de Pointes',
        description: 'Ако ЕКГ показва Torsades de Pointes (полиморфна КТ с въртящ се QRS):',
        steps: [
          'IV Магнезиев Сулфат 2 g болус за 1–2 мин (повторете веднъж при нужда)',
          'Ако е нестабилен: незабавна дефибрилация (несинхронизиран шок)',
          'Ако се повтаря: овердрайв пейсиране на 90–110 уд./мин',
          'IV Изопротеренол като мост към пейсиране (увеличава честотата, скъсява QT)',
          'Коригирайте K⁺ до 4.5–5.0 mEq/L и Mg²⁺ до >2.0 mg/dL',
          'ИЗБЯГВАЙТЕ амиодарон, лидокаин и всички QT-удължаващи антиаритмици',
        ],
      },
      genotypeNotes: {
        LQT1: {
          title: 'Спешни бележки специфични за LQT1',
          notes: [
            'Събитията често се провокират от упражнения или плуване — попитайте за скорошна физическа активност',
            'Бета-блокерите са ефективни — НЕ спирайте бета-блокера на пациента',
            'Ако пациентът е плувал: подозирайте давене вследствие на аритмия, а не първично давене',
          ],
        },
        LQT2: {
          title: 'Спешни бележки специфични за LQT2',
          notes: [
            'Събитията често се провокират от внезапни силни звуци или емоционален стрес',
            'Този тип е НАЙ-ЧУВСТВИТЕЛЕН към лекарства — допълнително внимание с всички медикаменти',
            'Нивата на калий са критични — проверете незабавно и поддържайте >4.5 mEq/L',
            'Бета-блокери + калиеви добавки са стандартното лечение',
          ],
        },
        LQT3: {
          title: 'Спешни бележки специфични за LQT3',
          notes: [
            'Събитията често се случват по време на покой или сън — по-висок риск от внезапна сърдечна смърт',
            'Бета-блокерите са ПО-МАЛКО ефективни при LQT3 в сравнение с LQT1/LQT2',
            'Пациентът може да се повлияе от блокери на натриевите канали (мексилетин)',
            'Възможно е наличие на ИКД (имплантируем кардиовертер-дефибрилатор) — проверете гърдите за устройство',
            'По-високорисков тип — ескалирайте спешно към кардиология',
          ],
        },
      },
    },

    disclaimerText:
      'Тази спешна карта е справочен документ, генериран с изкуствен интелект. Тя не замества професионалния медицински съвет. Винаги се консултирайте с кардиолога на пациента преди прилагане на медикаменти или вземане на решения за лечение.',
    generatedBy: 'Генерирано от QTShield',

    noMedications: 'Няма посочени медикаменти.',
    noContacts: 'Няма посочени спешни контакти.',
    typeUnknown: 'Типът LQTS не е определен. Прилагат се общи предпазни мерки.',
  },
}

export function getRiskLabel(risk: string, lang: Lang): string {
  const labels = translations[lang].medicationLabels
  switch (risk) {
    case 'KNOWN_RISK': return labels.knownRisk
    case 'POSSIBLE_RISK': return labels.possibleRisk
    case 'CONDITIONAL_RISK': return labels.conditionalRisk
    default: return labels.notListed
  }
}

export function getRelationshipLabel(relationship: string, lang: Lang): string {
  const labels = translations[lang].contactLabels
  switch (relationship.toLowerCase()) {
    case 'cardiologist': return labels.cardiologist
    case 'family': return labels.family
    case 'friend': return labels.friend
    default: return relationship
  }
}
