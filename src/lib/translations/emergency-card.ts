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
    poweredBy: 'Powered by HeartGuard',

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

    disclaimerText:
      'This emergency card is an AI-generated reference document. It does not replace professional medical advice. Always consult the patient\'s cardiologist before administering medications or making treatment decisions.',
    generatedBy: 'Generated by HeartGuard',

    noMedications: 'No medications listed.',
    noContacts: 'No emergency contacts listed.',
    typeUnknown: 'LQTS type not specified. General precautions apply.',
  },

  bg: {
    title: 'Спешна Карта',
    subtitle: 'Медицинска информация за спешна помощ',
    emergencyMedicalCard: 'Спешна Медицинска Карта',
    poweredBy: 'Създадено с HeartGuard',

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

    disclaimerText:
      'Тази спешна карта е справочен документ, генериран с изкуствен интелект. Тя не замества професионалния медицински съвет. Винаги се консултирайте с кардиолога на пациента преди прилагане на медикаменти или вземане на решения за лечение.',
    generatedBy: 'Генерирано от HeartGuard',

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
