const fs = require('fs');
const path = require('path');

// Ensure output directories exist
const publicMedicinesDir = path.join(__dirname, '..', 'public', 'medicines');
if (!fs.existsSync(publicMedicinesDir)) {
  fs.mkdirSync(publicMedicinesDir, { recursive: true });
}

// 40 Authentic Philippine Medicines Definition
const MEDICINES = [
  // --- PAIN & FEVER RELIEF ---
  {
    item_id: 1,
    slug: 'biogesic',
    brand_name: 'Biogesic',
    generic_name: 'Paracetamol',
    category: 'Pain Relief',
    dosage_form: '500mg Tablet',
    requires_prescription: false,
    price: 7.50,
    indications: 'For the relief of minor aches and pains such as headache, toothache, muscle ache, backache, arthritis, and reduction of fever.',
    dosage_instructions: 'Adults and children 12 years and older: 1 to 2 tablets every 4 to 6 hours as needed. Maximum 8 tablets (4,000mg) in 24 hours.',
    packaging: 'Blister pack of 10 tablets (Box of 100)',
    side_effects: 'Rare when used as directed. Overdose may cause severe liver damage.',
    manufacturer: 'Unilab',
    primaryColor: '#0284C7',
    secondaryColor: '#0369A1',
    bgColor: '#F0F9FF',
    accentColor: '#38BDF8',
    type: 'blister'
  },
  {
    item_id: 2,
    slug: 'alaxan-fr',
    brand_name: 'Alaxan FR',
    generic_name: 'Ibuprofen + Paracetamol',
    category: 'Pain Relief',
    dosage_form: '200mg / 325mg Capsule',
    requires_prescription: false,
    price: 12.00,
    indications: 'Fast relief of moderate to severe body aches, muscle pain, stiff neck, joint pain, arthritis, and sports injuries.',
    dosage_instructions: 'Adults and children 12 years and older: 1 capsule every 6 hours after meals as needed. Do not take on an empty stomach.',
    packaging: 'Blister pack of 10 red & orange capsules',
    side_effects: 'May cause stomach discomfort, nausea, or heartburn. Avoid if having active peptic ulcers.',
    manufacturer: 'Unilab',
    primaryColor: '#DC2626',
    secondaryColor: '#B91C1C',
    bgColor: '#FEF2F2',
    accentColor: '#F59E0B',
    type: 'capsule-blister'
  },
  {
    item_id: 3,
    slug: 'medicol-advance',
    brand_name: 'Medicol Advance',
    generic_name: 'Ibuprofen',
    category: 'Pain Relief',
    dosage_form: '400mg Liquid Gel Softgel',
    requires_prescription: false,
    price: 14.50,
    indications: 'Fast-absorbing relief of severe headache, migraine, toothache, dysmenorrhea (menstrual cramps), and muscular pain.',
    dosage_instructions: 'Adults: 1 softgel every 6 to 8 hours with food or milk. Do not exceed 3 softgels (1,200mg) in 24 hours.',
    packaging: 'Blister pack of 10 orange clear liquid softgels',
    side_effects: 'Stomach irritation, dizziness. Take with food or a full glass of water.',
    manufacturer: 'Unilab',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    bgColor: '#FFF7ED',
    accentColor: '#FB923C',
    type: 'softgel'
  },
  {
    item_id: 4,
    slug: 'advil-liqui-gels',
    brand_name: 'Advil Liqui-Gels',
    generic_name: 'Ibuprofen',
    category: 'Pain Relief',
    dosage_form: '200mg Softgel Capsule',
    requires_prescription: false,
    price: 15.00,
    indications: 'Rapid relief of tough headaches, backaches, toothaches, menstrual pain, and minor arthritis aches.',
    dosage_instructions: 'Adults: 1 to 2 softgels every 4 to 6 hours while symptoms persist. Maximum 6 softgels in 24 hours.',
    packaging: 'Bottle of 30 liquid softgels',
    side_effects: 'Mild stomach upset, nausea, dizziness. Take after meals.',
    manufacturer: 'Haleon',
    primaryColor: '#1E3A8A',
    secondaryColor: '#172554',
    bgColor: '#EFF6FF',
    accentColor: '#D97706',
    type: 'bottle'
  },
  {
    item_id: 5,
    slug: 'tempra-syrup',
    brand_name: 'Tempra Syrup',
    generic_name: 'Paracetamol',
    category: 'Pain Relief',
    dosage_form: '120mg / 5mL Syrup 60mL',
    requires_prescription: false,
    price: 165.00,
    indications: 'Effective relief of fever and pain in children due to colds, flu, immunization reactions, and teething.',
    dosage_instructions: 'Children 1-5 years: 5mL to 10mL every 4-6 hours. Follow pediatric dosage chart.',
    packaging: 'Amber glass bottle 60mL with measuring cup (Strawberry flavor)',
    side_effects: 'Extremely well-tolerated in pediatric patients when given at correct dose.',
    manufacturer: 'Taisho',
    primaryColor: '#DB2777',
    secondaryColor: '#BE185D',
    bgColor: '#FDF2F8',
    accentColor: '#F472B6',
    type: 'syrup-bottle'
  },
  {
    item_id: 6,
    slug: 'calpol-drops',
    brand_name: 'Calpol Infant Drops',
    generic_name: 'Paracetamol',
    category: 'Pain Relief',
    dosage_form: '100mg / mL Infant Drops 15mL',
    requires_prescription: false,
    price: 145.00,
    indications: 'Fast, gentle fever and pain relief for babies and infants aged 0 to 24 months. Orange flavored.',
    dosage_instructions: 'Infants 3-12 months: 0.6mL to 1.2mL using calibrated oral dropper every 4-6 hours.',
    packaging: '15mL bottle with graduated safety dropper',
    side_effects: 'Safe for infants at calibrated dose. Consult pediatrician if fever exceeds 3 days.',
    manufacturer: 'GSK',
    primaryColor: '#7C3AED',
    secondaryColor: '#6D28D9',
    bgColor: '#F5F3FF',
    accentColor: '#A78BFA',
    type: 'drops-bottle'
  },
  {
    item_id: 7,
    slug: 'panadol-extra',
    brand_name: 'Panadol Extra',
    generic_name: 'Paracetamol + Caffeine',
    category: 'Pain Relief',
    dosage_form: '500mg / 65mg Caplet',
    requires_prescription: false,
    price: 9.50,
    indications: 'Formulated with caffeine for stronger, enhanced relief of stubborn migraine, headache, back pain, and sore muscles.',
    dosage_instructions: 'Adults: 1 to 2 caplets every 4 to 6 hours as needed. Maximum 8 caplets in 24 hours.',
    packaging: 'Blister strip of 10 red caplets',
    side_effects: 'May cause restlessness or difficulty sleeping if taken near bedtime due to caffeine.',
    manufacturer: 'Haleon',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    bgColor: '#FEF2F2',
    accentColor: '#FFFFFF',
    type: 'blister'
  },

  // --- COUGH, COLD & FLU ---
  {
    item_id: 8,
    slug: 'neozep-forte',
    brand_name: 'Neozep Forte',
    generic_name: 'Phenylephrine + Chlorphenamine + Paracetamol',
    category: 'Cold & Flu',
    dosage_form: '10mg / 2mg / 500mg Tablet',
    requires_prescription: false,
    price: 10.25,
    indications: 'Complete relief of clogged nose, runny nose, postnasal drip, itchy/watery eyes, sneezing, body ache, and fever.',
    dosage_instructions: 'Adults and children 12 years and older: 1 tablet every 6 hours, or as directed by a doctor.',
    packaging: 'Blister foil pack of 10 green & yellow tablets',
    side_effects: 'Drowsiness, dry mouth, mild dizziness. Avoid driving or operating machinery.',
    manufacturer: 'Unilab',
    primaryColor: '#16A34A',
    secondaryColor: '#15803D',
    bgColor: '#F0FDF4',
    accentColor: '#EAB308',
    type: 'blister'
  },
  {
    item_id: 9,
    slug: 'bioflu',
    brand_name: 'Bioflu',
    generic_name: 'Phenylephrine + Chlorphenamine + Paracetamol',
    category: 'Cold & Flu',
    dosage_form: 'Tablet',
    requires_prescription: false,
    price: 10.50,
    indications: 'Multi-symptom relief for the flu, cough from postnasal drip, headache, fever, sore throat, and nasal congestion.',
    dosage_instructions: 'Adults and children 12 years and over: 1 tablet orally every 6 hours.',
    packaging: 'Blister foil pack of 10 tri-colored tablets',
    side_effects: 'May cause drowsiness and sedation. Take with a glass of water.',
    manufacturer: 'Unilab',
    primaryColor: '#0284C7',
    secondaryColor: '#0369A1',
    bgColor: '#F0F9FF',
    accentColor: '#16A34A',
    type: 'blister'
  },
  {
    item_id: 10,
    slug: 'decolgen-forte',
    brand_name: 'Decolgen Forte',
    generic_name: 'Phenylpropanolamine + Chlorphenamine + Paracetamol',
    category: 'Cold & Flu',
    dosage_form: '25mg / 2mg / 500mg Tablet',
    requires_prescription: false,
    price: 9.75,
    indications: 'Decongests nasal sinuses and relieves fever, headache, and allergic nasal secretions associated with common cold.',
    dosage_instructions: 'Adults: 1 tablet every 6 hours, or as prescribed by a physician.',
    packaging: 'Blister pack of 10 tablets',
    side_effects: 'Mild drowsiness, dry mouth, elevated blood pressure in hypertensive individuals.',
    manufacturer: 'Unilab',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    bgColor: '#FFFBEB',
    accentColor: '#EF4444',
    type: 'blister'
  },
  {
    item_id: 11,
    slug: 'solmux-capsule',
    brand_name: 'Solmux',
    generic_name: 'Carbocisteine',
    category: 'Cold & Flu',
    dosage_form: '500mg Capsule',
    requires_prescription: false,
    price: 14.00,
    indications: 'Mucolytic agent that melts and liquefies thick phlegm and mucus in productive cough, bronchitis, and asthma.',
    dosage_instructions: 'Adults and children 12 years and over: 1 capsule every 8 hours (3 times daily) after meals.',
    packaging: 'Blister strip of 10 red & green capsules',
    side_effects: 'Generally safe; mild nausea or gastric discomfort may rarely occur.',
    manufacturer: 'Unilab',
    primaryColor: '#DC2626',
    secondaryColor: '#991B1B',
    bgColor: '#FEF2F2',
    accentColor: '#16A34A',
    type: 'capsule-blister'
  },
  {
    item_id: 12,
    slug: 'solmux-syrup',
    brand_name: 'Solmux Pediatric Syrup',
    generic_name: 'Carbocisteine',
    category: 'Cold & Flu',
    dosage_form: '100mg / 5mL Syrup 60mL',
    requires_prescription: false,
    price: 125.00,
    indications: 'Pediatric mucolytic for children with cough with phlegm. Clears airways and facilitates easy breathing.',
    dosage_instructions: 'Children 2-4 years: 5mL (1 teaspoonful) every 8 hours. 4-7 years: 10mL every 8 hours.',
    packaging: '60mL bottle with pediatric dosing cup',
    side_effects: 'Mild stomach upset or loose stools in rare instances.',
    manufacturer: 'Unilab',
    primaryColor: '#16A34A',
    secondaryColor: '#15803D',
    bgColor: '#F0FDF4',
    accentColor: '#DC2626',
    type: 'syrup-bottle'
  },
  {
    item_id: 13,
    slug: 'robitussin-dm',
    brand_name: 'Robitussin DM',
    generic_name: 'Dextromethorphan + Guaifenesin',
    category: 'Cold & Flu',
    dosage_form: 'Syrup 60mL',
    requires_prescription: false,
    price: 175.00,
    indications: 'Controls dry, hacking cough and loosens stubborn chest congestion. Mentholated cherry formula.',
    dosage_instructions: 'Adults: 10mL every 4 hours as needed. Do not exceed 6 doses in 24 hours.',
    packaging: '60mL bottle with measuring cup',
    side_effects: 'Dizziness, drowsiness, nausea. Drink plenty of water during use.',
    manufacturer: 'Haleon',
    primaryColor: '#9333EA',
    secondaryColor: '#7E22CE',
    bgColor: '#FAF5FF',
    accentColor: '#E11D48',
    type: 'syrup-bottle'
  },
  {
    item_id: 14,
    slug: 'tuseran-forte',
    brand_name: 'Tuseran Forte',
    generic_name: 'Dextromethorphan + Phenylpropanolamine + Paracetamol',
    category: 'Cold & Flu',
    dosage_form: '15mg / 25mg / 325mg Capsule',
    requires_prescription: false,
    price: 13.50,
    indications: 'Relief of dry, nagging cough, nasal congestion, postnasal drip, headache, and fever from the flu.',
    dosage_instructions: 'Adults: 1 capsule every 6 hours, or as directed by a doctor.',
    packaging: 'Blister strip of 10 orange/yellow capsules',
    side_effects: 'Drowsiness, mild dry mouth, restlessness.',
    manufacturer: 'Unilab',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    bgColor: '#FFF7ED',
    accentColor: '#FBBF24',
    type: 'capsule-blister'
  },
  {
    item_id: 15,
    slug: 'vicks-vaporub',
    brand_name: 'Vicks VapoRub',
    generic_name: 'Camphor + Menthol + Eucalyptus Oil',
    category: 'Cold & Flu',
    dosage_form: 'Topical Ointment 25g',
    requires_prescription: false,
    price: 115.00,
    indications: 'Topical soothing ointment for relief of nasal congestion, chest heaviness, and cough due to colds.',
    dosage_instructions: 'Rub gently on chest, throat, and back. May add 2 teaspoonfuls to hot water for steam inhalation.',
    packaging: '25g cobalt blue jar with green cap',
    side_effects: 'For external use only. Avoid contact with eyes or open wounds.',
    manufacturer: 'Procter & Gamble',
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E40AF',
    bgColor: '#EFF6FF',
    accentColor: '#10B981',
    type: 'ointment-jar'
  },

  // --- DIGESTIVE & STOMACH HEALTH ---
  {
    item_id: 16,
    slug: 'diatabs',
    brand_name: 'Diatabs',
    generic_name: 'Loperamide',
    category: 'Digestive',
    dosage_form: '2mg Capsule',
    requires_prescription: false,
    price: 8.00,
    indications: 'Symptomatic control and rapid relief of acute non-specific diarrhea, food-borne diarrhea, and traveler’s diarrhea.',
    dosage_instructions: 'Adults: 2 capsules initially, then 1 capsule after each unformed watery stool. Maximum 8 capsules/day.',
    packaging: 'Foil blister pack of 4 capsules',
    side_effects: 'Constipation if overused, dry mouth, mild abdominal cramps.',
    manufacturer: 'Unilab',
    primaryColor: '#EAB308',
    secondaryColor: '#CA8A04',
    bgColor: '#FEFCE8',
    accentColor: '#854D0E',
    type: 'capsule-blister'
  },
  {
    item_id: 17,
    slug: 'kremil-s',
    brand_name: 'Kremil-S',
    generic_name: 'Aluminum Hydroxide + Magnesium Hydroxide + Simethicone',
    category: 'Digestive',
    dosage_form: 'Chewable Tablet',
    requires_prescription: false,
    price: 9.50,
    indications: 'Relief of hyperacidity, acid reflux, heartburn (hapdi), stomach ulcer pain, and gassy bloated stomach.',
    dosage_instructions: 'Chew 1 to 2 tablets 1 hour after meals and at bedtime, or when feeling acid pain.',
    packaging: 'Blister strip of 8 chewable tablets',
    side_effects: 'Chalky taste. Aluminum may cause constipation, magnesium may cause laxative effect.',
    manufacturer: 'Unilab',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    bgColor: '#ECFDF5',
    accentColor: '#DC2626',
    type: 'blister'
  },
  {
    item_id: 18,
    slug: 'gaviscon-double-action',
    brand_name: 'Gaviscon Double Action',
    generic_name: 'Sodium Alginate + Sodium Bicarbonate',
    category: 'Digestive',
    dosage_form: '10mL Liquid Sachet',
    requires_prescription: false,
    price: 42.00,
    indications: 'Creates a protective physical barrier atop stomach contents to rapidly suppress GERD acid reflux and soothe heartburn.',
    dosage_instructions: 'Adults: Take 1 to 2 sachets (10-20mL) after meals and at bedtime.',
    packaging: 'Ready-to-drink 10mL tear-off foil sachet',
    side_effects: 'Very safe; mild abdominal distension in rare cases.',
    manufacturer: 'Reckitt',
    primaryColor: '#0284C7',
    secondaryColor: '#0369A1',
    bgColor: '#F0F9FF',
    accentColor: '#F59E0B',
    type: 'sachet'
  },
  {
    item_id: 19,
    slug: 'buscopan',
    brand_name: 'Buscopan',
    generic_name: 'Hyoscine-N-butylbromide',
    category: 'Digestive',
    dosage_form: '10mg Sugar-Coated Tablet',
    requires_prescription: false,
    price: 24.00,
    indications: 'Targeted antispasmodic relief for painful abdominal cramps, menstrual cramps (dysmenorrhea), and intestinal spasm.',
    dosage_instructions: 'Adults: 1 to 2 tablets 3 to 5 times daily with water as needed.',
    packaging: 'Blister strip of 10 round tablets',
    side_effects: 'Dry mouth, mild tachycardia, temporary blurred vision.',
    manufacturer: 'Sanofi',
    primaryColor: '#16A34A',
    secondaryColor: '#15803D',
    bgColor: '#F0FDF4',
    accentColor: '#FFFFFF',
    type: 'blister'
  },
  {
    item_id: 20,
    slug: 'dulcolax',
    brand_name: 'Dulcolax',
    generic_name: 'Bisacodyl',
    category: 'Digestive',
    dosage_form: '5mg Gastro-Resistant Tablet',
    requires_prescription: false,
    price: 16.50,
    indications: 'Predictable overnight relief of constipation. Stimulates natural colon motility.',
    dosage_instructions: 'Adults and children over 10: 1 to 2 tablets at night. Acts within 6 to 12 hours.',
    packaging: 'Green box with blister of 10 enteric-coated tablets',
    side_effects: 'Abdominal discomfort or cramping prior to bowel evacuation.',
    manufacturer: 'Sanofi',
    primaryColor: '#15803D',
    secondaryColor: '#166534',
    bgColor: '#F0FDF4',
    accentColor: '#FACC15',
    type: 'blister'
  },
  {
    item_id: 21,
    slug: 'erceflora',
    brand_name: 'Erceflora Gut Defense',
    generic_name: 'Bacillus clausii Spores',
    category: 'Digestive',
    dosage_form: '2 Billion / 5mL Oral Suspension',
    requires_prescription: false,
    price: 65.00,
    indications: 'Restores healthy intestinal bacterial flora altered by diarrhea, infections, or antibiotic therapy.',
    dosage_instructions: 'Adults: 2 to 3 mini-bottles per day. Shake and drink directly from vial.',
    packaging: '5mL tamper-evident plastic vial',
    side_effects: 'Extremely safe; suitable for infants, children, and adults.',
    manufacturer: 'Sanofi',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    bgColor: '#EFF6FF',
    accentColor: '#93C5FD',
    type: 'vial'
  },
  {
    item_id: 22,
    slug: 'imodium',
    brand_name: 'Imodium',
    generic_name: 'Loperamide',
    category: 'Digestive',
    dosage_form: '2mg Capsule',
    requires_prescription: false,
    price: 16.00,
    indications: 'Fast antidiarrheal action that calms intestinal hypermotility and firms up loose stool.',
    dosage_instructions: 'Take 2 capsules initially, then 1 capsule after each unformed stool. Maximum 8 capsules/day.',
    packaging: 'Blister strip of 6 green capsules',
    side_effects: 'Dizziness, drowsiness, constipation if used excessively.',
    manufacturer: 'Johnson & Johnson',
    primaryColor: '#047857',
    secondaryColor: '#065F46',
    bgColor: '#ECFDF5',
    accentColor: '#F59E0B',
    type: 'capsule-blister'
  },

  // --- VITAMINS & IMMUNITY ---
  {
    item_id: 23,
    slug: 'enervon-c',
    brand_name: 'Enervon-C',
    generic_name: 'Vitamin B-Complex + 500mg Vitamin C',
    category: 'Vitamins',
    dosage_form: 'Tablet',
    requires_prescription: false,
    price: 8.50,
    indications: 'Provides daily energy boost (B-Complex) and immune defense (500mg Vitamin C) against sickness and stress.',
    dosage_instructions: 'Adults: 1 tablet daily with food, preferably in the morning.',
    packaging: 'Blister pack of 10 bright orange tablets',
    side_effects: 'Bright yellow urine (harmless due to riboflavin excretion).',
    manufacturer: 'Unilab',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    bgColor: '#FFF7ED',
    accentColor: '#FBBF24',
    type: 'blister'
  },
  {
    item_id: 24,
    slug: 'poten-cee',
    brand_name: 'Poten-Cee Sugar-Free',
    generic_name: 'Ascorbic Acid',
    category: 'Vitamins',
    dosage_form: '500mg Tablet',
    requires_prescription: false,
    price: 7.00,
    indications: 'Enhances body resistance against colds, viral infections, and stress. Promotes healthy gums and skin collagen.',
    dosage_instructions: 'Adults: 1 to 2 tablets daily, or as directed by a healthcare professional.',
    packaging: 'Blister pack of 10 orange tablets',
    side_effects: 'High doses may cause mild gastric acidity. Take after meals.',
    manufacturer: 'Pascual Lab',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    bgColor: '#FFFBEB',
    accentColor: '#F59E0B',
    type: 'blister'
  },
  {
    item_id: 25,
    slug: 'conzace',
    brand_name: 'Conzace',
    generic_name: 'Multivitamins + Minerals (Zinc + Vitamin A, C, E)',
    category: 'Vitamins',
    dosage_form: 'Softgel Capsule',
    requires_prescription: false,
    price: 15.50,
    indications: 'Potent immunity booster with Zinc and antioxidants A, C, and E for wound healing, skin health, and infection defense.',
    dosage_instructions: 'Adults: 1 softgel capsule once a day after a meal.',
    packaging: 'Blister strip of 10 brown liquid softgels',
    side_effects: 'Take with food to prevent mild gastrointestinal sensation from zinc.',
    manufacturer: 'Unilab',
    primaryColor: '#7C2D12',
    secondaryColor: '#9A3412',
    bgColor: '#FFF7ED',
    accentColor: '#F59E0B',
    type: 'softgel'
  },
  {
    item_id: 26,
    slug: 'berocca',
    brand_name: 'Berocca Performance',
    generic_name: 'B-Complex + Vitamin C + Calcium + Magnesium + Zinc',
    category: 'Vitamins',
    dosage_form: 'Effervescent Tablet',
    requires_prescription: false,
    price: 34.00,
    indications: 'Fizzy energy & mental sharpness formula. Recharges physical stamina and sharpens cognitive alertness.',
    dosage_instructions: 'Drop 1 tablet into a glass of cold water (200mL). Drink once daily in the morning.',
    packaging: 'Metal tube of 10 effervescent tablets (Orange flavor)',
    side_effects: 'Bright yellow urine due to Vitamin B2.',
    manufacturer: 'Bayer',
    primaryColor: '#C2410C',
    secondaryColor: '#9A3412',
    bgColor: '#FFF7ED',
    accentColor: '#22C55E',
    type: 'bottle'
  },
  {
    item_id: 27,
    slug: 'ceelin-plus',
    brand_name: 'Ceelin Plus',
    generic_name: 'Ascorbic Acid + Zinc',
    category: 'Vitamins',
    dosage_form: 'Oral Drops 30mL',
    requires_prescription: false,
    price: 155.00,
    indications: 'ZincPlus technology provides dual defense against sickness and fast recovery for infants and toddlers.',
    dosage_instructions: 'Infants 6-11 months: 0.5mL to 1mL daily using calibrated dropper.',
    packaging: '30mL glass dropper bottle (Apple flavor)',
    side_effects: 'Well-tolerated pediatric formulation.',
    manufacturer: 'Unilab',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    bgColor: '#ECFDF5',
    accentColor: '#EAB308',
    type: 'drops-bottle'
  },
  {
    item_id: 28,
    slug: 'fern-c',
    brand_name: 'Fern-C',
    generic_name: 'Sodium Ascorbate',
    category: 'Vitamins',
    dosage_form: '500mg Capsule',
    requires_prescription: false,
    price: 9.00,
    indications: 'Non-acidic Vitamin C. Gentle on stomach; safe for people with hyperacidity or GERD.',
    dosage_instructions: 'Adults: 1 to 2 capsules daily. Can be taken with or without meals.',
    packaging: 'Blister strip of 10 orange/clear capsules',
    side_effects: 'Virtually non-irritating to stomach lining.',
    manufacturer: 'STADA',
    primaryColor: '#EAB308',
    secondaryColor: '#CA8A04',
    bgColor: '#FEFCE8',
    accentColor: '#16A34A',
    type: 'capsule-blister'
  },
  {
    item_id: 29,
    slug: 'revicon-forte',
    brand_name: 'Revicon Forte',
    generic_name: 'Multivitamins + Minerals + Amino Acids',
    category: 'Vitamins',
    dosage_form: 'Tablet',
    requires_prescription: false,
    price: 9.50,
    indications: 'Helps fight physical exhaustion, boosts muscle stamina, and aids in rapid recovery from heavy physical labor.',
    dosage_instructions: 'Adults: 1 to 2 tablets daily after meals.',
    packaging: 'Blister pack of 10 red tablets',
    side_effects: 'Very mild GI sensations in sensitive stomachs. Take after meals.',
    manufacturer: 'Unilab',
    primaryColor: '#B91C1C',
    secondaryColor: '#991B1B',
    bgColor: '#FEF2F2',
    accentColor: '#F59E0B',
    type: 'blister'
  },

  // --- ALLERGIES & ANTIHISTAMINES ---
  {
    item_id: 30,
    slug: 'alnix',
    brand_name: 'Alnix',
    generic_name: 'Cetirizine Dihydrochloride',
    category: 'Allergy',
    dosage_form: '10mg Film-Coated Tablet',
    requires_prescription: false,
    price: 25.00,
    indications: '24-hour non-drowsy relief from allergic rhinitis, hay fever, itchy nose, skin hives (urticaria), and watery eyes.',
    dosage_instructions: 'Adults and children over 12 years: 1 tablet (10mg) once daily with water.',
    packaging: 'Blister strip of 10 white film-coated tablets',
    side_effects: 'Low incidence of drowsiness compared to first-generation antihistamines.',
    manufacturer: 'Unilab',
    primaryColor: '#0284C7',
    secondaryColor: '#0369A1',
    bgColor: '#F0F9FF',
    accentColor: '#38BDF8',
    type: 'blister'
  },
  {
    item_id: 31,
    slug: 'allerkid',
    brand_name: 'Allerkid',
    generic_name: 'Cetirizine',
    category: 'Allergy',
    dosage_form: '2.5mg / mL Oral Drops 10mL',
    requires_prescription: false,
    price: 175.00,
    indications: 'Pediatric relief for allergic sneezing, chronic hives, and allergic cough in toddlers and children.',
    dosage_instructions: 'Children 2-5 years: 1mL (5mg) once daily or 0.5mL twice daily.',
    packaging: '10mL dropper bottle with safety cap',
    side_effects: 'Very safe for kids at indicated weight-adjusted doses.',
    manufacturer: 'Unilab',
    primaryColor: '#7C3AED',
    secondaryColor: '#6D28D9',
    bgColor: '#F5F3FF',
    accentColor: '#F43F5E',
    type: 'drops-bottle'
  },
  {
    item_id: 32,
    slug: 'claritin',
    brand_name: 'Claritin',
    generic_name: 'Loratadine',
    category: 'Allergy',
    dosage_form: '10mg Tablet',
    requires_prescription: false,
    price: 48.00,
    indications: 'True non-drowsy 24-hour relief of allergies, sinus itch, sneezing, and skin allergy rashes.',
    dosage_instructions: 'Adults and children 12 years and over: 1 tablet once daily on an empty stomach or with food.',
    packaging: 'Blister pack of 10 white oval tablets',
    side_effects: 'Non-drowsy formula; dry mouth or headache in rare individuals.',
    manufacturer: 'Bayer',
    primaryColor: '#15803D',
    secondaryColor: '#166534',
    bgColor: '#F0FDF4',
    accentColor: '#38BDF8',
    type: 'blister'
  },
  {
    item_id: 33,
    slug: 'virlix',
    brand_name: 'Virlix',
    generic_name: 'Cetirizine',
    category: 'Allergy',
    dosage_form: '10mg Tablet',
    requires_prescription: false,
    price: 28.50,
    indications: 'Rapid onset relief from allergic reactions, dust mite allergies, pet dander allergy, and eczema itch.',
    dosage_instructions: 'Adults: 1 tablet daily with water.',
    packaging: 'Blister foil strip of 10s',
    side_effects: 'Mild dry mouth or slight fatigue in sensitive users.',
    manufacturer: 'GSK',
    primaryColor: '#0D9488',
    secondaryColor: '#0F766E',
    bgColor: '#F0FDFA',
    accentColor: '#14B8A6',
    type: 'blister'
  },

  // --- FIRST AID, ANTISEPTICS & TOPICAL ---
  {
    item_id: 34,
    slug: 'betadine-antiseptic',
    brand_name: 'Betadine Antiseptic Solution',
    generic_name: 'Povidone-Iodine 10%',
    category: 'First Aid',
    dosage_form: '10% Topical Solution 15mL',
    requires_prescription: false,
    price: 75.00,
    indications: 'Golden standard antiseptic for disinfection of minor cuts, wounds, burns, and abrasions. Does not sting.',
    dosage_instructions: 'Apply full strength directly to clean wound area with sterile cotton or swab 2-3 times daily.',
    packaging: '15mL yellow bottle with dropper spout',
    side_effects: 'For external use only. Discontinue if local skin irritation occurs.',
    manufacturer: 'Mundipharma',
    primaryColor: '#CA8A04',
    secondaryColor: '#A16207',
    bgColor: '#FEFCE8',
    accentColor: '#DC2626',
    type: 'bottle'
  },
  {
    item_id: 35,
    slug: 'bactidol',
    brand_name: 'Bactidol Oral Antiseptic',
    generic_name: 'Hexetidine 0.1%',
    category: 'First Aid',
    dosage_form: '0.1% Gargle Solution 60mL',
    requires_prescription: false,
    price: 110.00,
    indications: 'Fast relief of sore throat, mouth ulcers (singaw), swollen gums, and bad breath caused by oral bacteria.',
    dosage_instructions: 'Swish and gargle 15mL (undiluted) for 30 seconds, then spit out. Do not swallow. Twice daily.',
    packaging: '60mL bottle with measuring cup',
    side_effects: 'Mild transient alteration of taste sensation.',
    manufacturer: 'Johnson & Johnson',
    primaryColor: '#9D174D',
    secondaryColor: '#831843',
    bgColor: '#FDF2F8',
    accentColor: '#F472B6',
    type: 'bottle'
  },
  {
    item_id: 36,
    slug: 'salonpas-patch',
    brand_name: 'Salonpas Medicated Patch',
    generic_name: 'Methyl Salicylate + Menthol',
    category: 'First Aid',
    dosage_form: 'Pain Relieving Patch (Pack of 10)',
    requires_prescription: false,
    price: 55.00,
    indications: 'Direct transdermal relief for stiff neck, sore shoulders, backache, joint sprains, and muscle fatigue.',
    dosage_instructions: 'Clean and dry affected area. Apply 1 patch up to 8 hours. Maximum 3 to 4 times daily.',
    packaging: 'Resealable foil packet containing 10 adhesive patches',
    side_effects: 'Mild skin redness or warming sensation at application site.',
    manufacturer: 'Hisamitsu',
    primaryColor: '#15803D',
    secondaryColor: '#166534',
    bgColor: '#F0FDF4',
    accentColor: '#FFFFFF',
    type: 'box'
  },
  {
    item_id: 37,
    slug: 'band-aid-waterproof',
    brand_name: 'Band-Aid Water Block',
    generic_name: 'Adhesive Bandages',
    category: 'First Aid',
    dosage_form: 'Waterproof Strip (Pack of 10)',
    requires_prescription: false,
    price: 45.00,
    indications: 'Protects everyday cuts, scrapes, and blisters from water, dirt, and bacteria with 100% waterproof seal.',
    dosage_instructions: 'Clean wound thoroughly, dry skin, and apply bandage over wound pad. Change daily or when wet.',
    packaging: 'Pack of 10 individually wrapped sterile strips',
    side_effects: 'Hypoallergenic; suitable for sensitive skin.',
    manufacturer: 'Johnson & Johnson',
    primaryColor: '#1D4ED8',
    secondaryColor: '#1E40AF',
    bgColor: '#EFF6FF',
    accentColor: '#DC2626',
    type: 'box'
  },
  {
    item_id: 38,
    slug: 'agua-oxigenada',
    brand_name: 'Rhea Agua Oxigenada',
    generic_name: 'Hydrogen Peroxide 3%',
    category: 'First Aid',
    dosage_form: '3% 10 Vol Topical Liquid 60mL',
    requires_prescription: false,
    price: 26.00,
    indications: 'Effervescent cleansing and decontamination of superficial dirty cuts, scratches, and minor sores.',
    dosage_instructions: 'Pour a small amount onto cotton and gently wipe over wound area. Effervesces on contact.',
    packaging: '60mL amber bottle with seal cap',
    side_effects: 'Mild temporary bleaching of skin. Do not swallow.',
    manufacturer: 'Philusa',
    primaryColor: '#78350F',
    secondaryColor: '#92400E',
    bgColor: '#FFFBEB',
    accentColor: '#F59E0B',
    type: 'bottle'
  },

  // --- STRICT PRESCRIPTION SAFEGUARD (Testing Compliance) ---
  {
    item_id: 39,
    slug: 'amoxil',
    brand_name: 'Amoxil',
    generic_name: 'Amoxicillin Trihydrate',
    category: 'Antibiotic',
    dosage_form: '500mg Capsule',
    requires_prescription: true,
    price: 15.00,
    indications: 'Broad-spectrum penicillin antibiotic for bacterial respiratory, ENT, skin, and urinary tract infections.',
    dosage_instructions: 'Strictly as prescribed by a licensed physician. Complete the full course of treatment.',
    packaging: 'Foil blister of 10 capsules (Rx Required)',
    side_effects: 'Diarrhea, nausea, allergic rash. NEVER dispense without valid physician prescription.',
    manufacturer: 'GSK',
    primaryColor: '#B91C1C',
    secondaryColor: '#991B1B',
    bgColor: '#FEF2F2',
    accentColor: '#F59E0B',
    type: 'capsule-blister'
  },
  {
    item_id: 40,
    slug: 'cozaar',
    brand_name: 'Cozaar',
    generic_name: 'Losartan Potassium',
    category: 'Blood Pressure',
    dosage_form: '50mg Film-Coated Tablet',
    requires_prescription: true,
    price: 32.00,
    indications: 'Maintenance treatment of essential hypertension (high blood pressure) and stroke prevention in hypertensive patients.',
    dosage_instructions: 'Take 1 tablet daily or as directed by cardiologist/physician. Do not abruptly stop taking.',
    packaging: 'Blister strip of 10 tablets (Rx Required)',
    side_effects: 'Dizziness, low blood pressure, fatigue. Monitored strictly by physician.',
    manufacturer: 'Organon',
    primaryColor: '#1E3A8A',
    secondaryColor: '#172554',
    bgColor: '#EFF6FF',
    accentColor: '#38BDF8',
    type: 'blister'
  }
];

// Helper to generate realistic visual packaging SVG for any medicine
function generateMedicineSvg(med) {
  let innerGraphic = '';

  if (med.type === 'blister' || med.type === 'capsule-blister') {
    const isCapsule = med.type === 'capsule-blister';
    innerGraphic = `
      <!-- Blister Strip Foreground -->
      <g filter='url(#shadow)'>
        <rect x='70' y='180' width='260' height='150' rx='14' fill='url(#foilGrad)' stroke='#94A3B8' stroke-width='1.5'/>
        <line x1='70' y1='255' x2='330' y2='255' stroke='#94A3B8' stroke-dasharray='4,4' stroke-width='1'/>
        
        <!-- Row 1 -->
        <g transform='translate(105, 218)'>
          ${isCapsule ? 
            `<rect x='-20' y='-10' width='40' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>
             <rect x='0' y='-10' width='20' height='20' rx='10' fill='${med.accentColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
               <line x1='-14' y1='0' x2='14' y2='0' stroke='#E2E8F0' stroke-width='2'/>`
          }
        </g>
        <g transform='translate(170, 218)'>
          ${isCapsule ? 
            `<rect x='-20' y='-10' width='40' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>
             <rect x='0' y='-10' width='20' height='20' rx='10' fill='${med.accentColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
               <line x1='-14' y1='0' x2='14' y2='0' stroke='#E2E8F0' stroke-width='2'/>`
          }
        </g>
        <g transform='translate(235, 218)'>
          ${isCapsule ? 
            `<rect x='-20' y='-10' width='40' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>
             <rect x='0' y='-10' width='20' height='20' rx='10' fill='${med.accentColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
               <line x1='-14' y1='0' x2='14' y2='0' stroke='#E2E8F0' stroke-width='2'/>`
          }
        </g>
        <g transform='translate(295, 218)'>
          ${isCapsule ? 
            `<rect x='-16' y='-10' width='32' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>`
          }
        </g>

        <!-- Row 2 -->
        <g transform='translate(105, 292)'>
          ${isCapsule ? 
            `<rect x='-20' y='-10' width='40' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>
             <rect x='0' y='-10' width='20' height='20' rx='10' fill='${med.accentColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
               <line x1='-14' y1='0' x2='14' y2='0' stroke='#E2E8F0' stroke-width='2'/>`
          }
        </g>
        <g transform='translate(170, 292)'>
          ${isCapsule ? 
            `<rect x='-20' y='-10' width='40' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>
             <rect x='0' y='-10' width='20' height='20' rx='10' fill='${med.accentColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
               <line x1='-14' y1='0' x2='14' y2='0' stroke='#E2E8F0' stroke-width='2'/>`
          }
        </g>
        <g transform='translate(235, 292)'>
          ${isCapsule ? 
            `<rect x='-20' y='-10' width='40' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>
             <rect x='0' y='-10' width='20' height='20' rx='10' fill='${med.accentColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
               <line x1='-14' y1='0' x2='14' y2='0' stroke='#E2E8F0' stroke-width='2'/>`
          }
        </g>
        <g transform='translate(295, 292)'>
          ${isCapsule ? 
            `<rect x='-16' y='-10' width='32' height='20' rx='10' fill='${med.primaryColor}' stroke='#FFFFFF' stroke-width='1.5'/>`
            : `<circle cx='0' cy='0' r='18' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>`
          }
        </g>
      </g>
    `;
  } else if (med.type === 'bottle' || med.type === 'syrup-bottle' || med.type === 'drops-bottle') {
    innerGraphic = `
      <!-- Medicine Bottle Foreground -->
      <g filter='url(#shadow)'>
        <!-- Bottle Cap -->
        <rect x='165' y='145' width='70' height='25' rx='6' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
        <line x1='175' y1='145' x2='175' y2='170' stroke='#E2E8F0' stroke-width='2'/>
        <line x1='190' y1='145' x2='190' y2='170' stroke='#E2E8F0' stroke-width='2'/>
        <line x1='205' y1='145' x2='205' y2='170' stroke='#E2E8F0' stroke-width='2'/>
        <line x1='220' y1='145' x2='220' y2='170' stroke='#E2E8F0' stroke-width='2'/>
        
        <!-- Bottle Neck -->
        <rect x='178' y='170' width='44' height='15' fill='#94A3B8' opacity='0.5'/>
        
        <!-- Bottle Body -->
        <rect x='140' y='185' width='120' height='160' rx='16' fill='${med.type === 'syrup-bottle' ? '#78350F' : '#F8FAFC'}' stroke='#94A3B8' stroke-width='2'/>
        
        <!-- Bottle Label -->
        <rect x='145' y='210' width='110' height='115' rx='8' fill='#FFFFFF' stroke='#E2E8F0'/>
        <text x='200' y='235' font-family='system-ui, sans-serif' font-size='13' font-weight='900' fill='${med.primaryColor}' text-anchor='middle'>${med.brand_name.length > 10 ? med.brand_name.split(' ')[0] : med.brand_name}</text>
        <text x='200' y='252' font-family='system-ui, sans-serif' font-size='8' font-weight='700' fill='#475569' text-anchor='middle'>${med.generic_name.split('+')[0].trim()}</text>
        <text x='200' y='270' font-family='system-ui, sans-serif' font-size='7.5' font-weight='600' fill='${med.secondaryColor}' text-anchor='middle'>${med.dosage_form}</text>
        <rect x='160' y='290' width='80' height='16' rx='4' fill='${med.primaryColor}'/>
        <text x='200' y='301' font-family='system-ui, sans-serif' font-size='8' font-weight='800' fill='#FFFFFF' text-anchor='middle'>AUTHENTIC</text>
      </g>
    `;
  } else if (med.type === 'ointment-jar') {
    innerGraphic = `
      <!-- Ointment Jar Foreground -->
      <g filter='url(#shadow)'>
        <!-- Jar Lid -->
        <ellipse cx='200' cy='200' rx='85' ry='22' fill='${med.accentColor}' stroke='#059669' stroke-width='2'/>
        <!-- Jar Body -->
        <path d='M 115 200 C 115 240, 118 290, 130 310 C 145 330, 255 330, 270 310 C 282 290, 285 240, 285 200 Z' fill='${med.primaryColor}' stroke='#1E3A8A' stroke-width='2'/>
        <!-- Jar Label -->
        <ellipse cx='200' cy='260' rx='65' ry='35' fill='#FFFFFF' stroke='#CBD5E1'/>
        <text x='200' y='255' font-family='system-ui, sans-serif' font-size='14' font-weight='900' fill='${med.primaryColor}' text-anchor='middle'>${med.brand_name}</text>
        <text x='200' y='272' font-family='system-ui, sans-serif' font-size='8' font-weight='700' fill='#475569' text-anchor='middle'>VAPORIZING OINTMENT</text>
      </g>
    `;
  } else {
    // Standard Box / Sachet / Patch
    innerGraphic = `
      <!-- Product Box Foreground -->
      <g filter='url(#shadow)'>
        <rect x='90' y='180' width='220' height='150' rx='14' fill='#FFFFFF' stroke='#CBD5E1' stroke-width='2'/>
        <rect x='90' y='180' width='220' height='36' rx='14' fill='${med.primaryColor}'/>
        <text x='200' y='204' font-family='system-ui, sans-serif' font-size='14' font-weight='900' fill='#FFFFFF' text-anchor='middle'>${med.brand_name}</text>
        <text x='200' y='240' font-family='system-ui, sans-serif' font-size='10' font-weight='700' fill='#1E293B' text-anchor='middle'>${med.generic_name.split('+')[0].trim()}</text>
        <text x='200' y='260' font-family='system-ui, sans-serif' font-size='8.5' font-weight='600' fill='${med.secondaryColor}' text-anchor='middle'>${med.dosage_form}</text>
        <rect x='130' y='285' width='140' height='24' rx='6' fill='${med.bgColor}' stroke='${med.primaryColor}' stroke-width='1'/>
        <text x='200' y='301' font-family='system-ui, sans-serif' font-size='8.5' font-weight='800' fill='${med.primaryColor}' text-anchor='middle'>${med.packaging.split('(')[0]}</text>
      </g>
    `;
  }

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' width='400' height='400'>
  <defs>
    <linearGradient id='bgGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='${med.bgColor}'/>
      <stop offset='100%' stop-color='#FFFFFF'/>
    </linearGradient>
    <linearGradient id='boxGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='${med.primaryColor}'/>
      <stop offset='100%' stop-color='${med.secondaryColor}'/>
    </linearGradient>
    <linearGradient id='foilGrad' x1='0%' y1='0%' x2='100%' y2='100%'>
      <stop offset='0%' stop-color='#F8FAFC'/>
      <stop offset='50%' stop-color='#E2E8F0'/>
      <stop offset='100%' stop-color='#CBD5E1'/>
    </linearGradient>
    <filter id='shadow' x='-10%' y='-10%' width='125%' height='125%'>
      <feDropShadow dx='0' dy='8' stdDeviation='10' flood-color='${med.secondaryColor}' flood-opacity='0.16'/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width='400' height='400' rx='28' fill='url(#bgGrad)'/>
  <circle cx='340' cy='60' r='100' fill='${med.primaryColor}' opacity='0.05'/>
  <circle cx='60' cy='340' r='80' fill='${med.accentColor}' opacity='0.08'/>

  <!-- Primary Packaging Box (Background) -->
  <g filter='url(#shadow)'>
    <rect x='50' y='50' width='300' height='160' rx='18' fill='url(#boxGrad)' stroke='${med.primaryColor}' stroke-width='2'/>
    
    <!-- White Header Banner -->
    <path d='M 50 64 Q 50 50 68 50 L 332 50 Q 350 50 350 64 L 350 105 L 50 105 Z' fill='#FFFFFF'/>
    <text x='70' y='88' font-family='system-ui, -apple-system, sans-serif' font-size='24' font-weight='900' fill='${med.primaryColor}' letter-spacing='-0.5'>${med.brand_name}</text>
    
    <!-- Rx / OTC Tag -->
    ${med.requires_prescription 
      ? `<rect x='280' y='65' width='50' height='24' rx='6' fill='#DC2626'/>
         <text x='305' y='82' font-family='system-ui, sans-serif' font-size='12' font-weight='900' fill='#FFFFFF' text-anchor='middle'>Rx</text>`
      : `<rect x='250' y='65' width='80' height='24' rx='6' fill='#059669'/>
         <text x='290' y='81' font-family='system-ui, sans-serif' font-size='10' font-weight='800' fill='#FFFFFF' text-anchor='middle'>100% OTC</text>`
    }

    <!-- Product Subtitle -->
    <text x='70' y='132' font-family='system-ui, sans-serif' font-size='13' font-weight='700' fill='#FFFFFF'>${med.generic_name}</text>
    <text x='70' y='152' font-family='system-ui, sans-serif' font-size='11' font-weight='600' fill='#F8FAFC' opacity='0.9'>${med.dosage_form} • ${med.category}</text>
    
    <!-- Manufacturer Seal -->
    <rect x='70' y='170' width='110' height='20' rx='5' fill='#FFFFFF' fill-opacity='0.2'/>
    <text x='125' y='184' font-family='system-ui, sans-serif' font-size='9' font-weight='800' fill='#FFFFFF' text-anchor='middle'>${med.manufacturer.toUpperCase()}</text>
  </g>

  <!-- Dynamic Foreground Medicine Graphic -->
  ${innerGraphic}
</svg>`;
}

// 1. Generate All 40 SVG Visual Assets
console.log('Generating 40 accurate SVG packaging assets in public/medicines/...');
MEDICINES.forEach((med) => {
  const svgContent = generateMedicineSvg(med);
  const filePath = path.join(publicMedicinesDir, `${med.slug}.svg`);
  fs.writeFileSync(filePath, svgContent, 'utf8');
});
console.log('✓ Successfully created 40 medicine SVG graphics.');

// 2. Generate Complete Master CSV (public/philippines_otc_medicines.csv)
console.log('Generating public/philippines_otc_medicines.csv...');
const csvHeaders = [
  'item_id',
  'brand_name',
  'generic_name',
  'category',
  'dosage_form',
  'requires_prescription',
  'default_price',
  'indications',
  'dosage_instructions',
  'packaging',
  'side_effects',
  'image_url'
];

function escapeCsv(text) {
  if (text === null || text === undefined) return '';
  const stringVal = String(text);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
}

const csvRows = MEDICINES.map((m) => {
  return [
    m.item_id,
    escapeCsv(m.brand_name),
    escapeCsv(m.generic_name),
    escapeCsv(m.category),
    escapeCsv(m.dosage_form),
    m.requires_prescription ? 'TRUE' : 'FALSE',
    m.price.toFixed(2),
    escapeCsv(m.indications),
    escapeCsv(m.dosage_instructions),
    escapeCsv(m.packaging),
    escapeCsv(m.side_effects),
    escapeCsv(`/medicines/${m.slug}.svg`)
  ].join(',');
});

const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
const csvPath = path.join(__dirname, '..', 'public', 'philippines_otc_medicines.csv');
fs.writeFileSync(csvPath, csvContent, 'utf8');
console.log(`✓ Successfully generated ${csvPath} (${MEDICINES.length} medicines)`);

// 3. Generate Complete Supabase SQL Seed (supabase/seed_master_catalog.sql)
console.log('Generating supabase/seed_master_catalog.sql...');
const sqlLines = [];
sqlLines.push('-- CarePoint Complete Philippine Medicine Master Catalog');
sqlLines.push('-- 40 Authentic OTC & Essential Medicines');
sqlLines.push('');
sqlLines.push('-- 1. Populate Master Catalog');
sqlLines.push('INSERT INTO master_catalog (item_id, generic_name, brand_name, category, dosage_form, requires_prescription, indications, dosage_instructions, packaging, side_effects, image_url) VALUES');

const sqlValues = MEDICINES.map((m, idx) => {
  const isLast = idx === MEDICINES.length - 1;
  const esc = (txt) => (txt ? `'${String(txt).replace(/'/g, "''")}'` : 'NULL');
  return `  (${m.item_id}, ${esc(m.generic_name)}, ${esc(m.brand_name)}, ${esc(m.category)}, ${esc(m.dosage_form)}, ${m.requires_prescription}, ${esc(m.indications)}, ${esc(m.dosage_instructions)}, ${esc(m.packaging)}, ${esc(m.side_effects)}, '/medicines/${m.slug}.svg')${isLast ? ';' : ','}`;
});

sqlLines.push(sqlValues.join('\n'));
sqlLines.push('');
sqlLines.push('-- 2. Seed Pharmacy Inventory for Partner Pharmacies (MetroCare ID:1, HealthFirst ID:2, CityCare ID:3)');
sqlLines.push('INSERT INTO pharmacy_inventory (pharmacy_id, item_id, price, stock_quantity, is_active) VALUES');

const inventoryValues = [];
MEDICINES.forEach((m) => {
  // MetroCare (Pharmacy 1)
  const price1 = m.price;
  const stock1 = m.requires_prescription ? 0 : Math.floor(40 + (m.item_id * 7) % 120);
  inventoryValues.push(`  (1, ${m.item_id}, ${price1.toFixed(2)}, ${stock1}, true)`);

  // HealthFirst (Pharmacy 2) - Slightly varied price
  const price2 = +(m.price * (0.95 + ((m.item_id % 5) * 0.025))).toFixed(2);
  const stock2 = m.requires_prescription ? 0 : Math.floor(25 + (m.item_id * 11) % 90);
  inventoryValues.push(`  (2, ${m.item_id}, ${price2.toFixed(2)}, ${stock2}, true)`);

  // CityCare (Pharmacy 3)
  const price3 = +(m.price * (0.98 + ((m.item_id % 3) * 0.02))).toFixed(2);
  const stock3 = m.requires_prescription ? 0 : Math.floor(30 + (m.item_id * 13) % 100);
  inventoryValues.push(`  (3, ${m.item_id}, ${price3.toFixed(2)}, ${stock3}, true)`);
});

sqlLines.push(inventoryValues.join(',\n') + ';');
sqlLines.push('');

const sqlPath = path.join(__dirname, '..', 'supabase', 'seed_master_catalog.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
console.log(`✓ Successfully generated ${sqlPath}`);

// 4. Output dataset JSON for frontend services
const jsonPath = path.join(__dirname, '..', 'src', 'shared', 'data', 'medicines.json');
const jsonDir = path.dirname(jsonPath);
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}
fs.writeFileSync(jsonPath, JSON.stringify(MEDICINES, null, 2), 'utf8');
console.log(`✓ Successfully exported JSON data to ${jsonPath}`);

// 5. Output TypeScript file for clean type-safe imports
const tsPath = path.join(__dirname, '..', 'src', 'shared', 'data', 'medicines.ts');
const tsContent = `// Auto-generated Philippine OTC & Prescription Medicines Catalog
export interface CatalogMedicineData {
  item_id: number;
  slug: string;
  brand_name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  requires_prescription: boolean;
  price: number;
  indications: string;
  dosage_instructions: string;
  packaging: string;
  side_effects: string;
  manufacturer: string;
  primaryColor?: string;
  secondaryColor?: string;
  bgColor?: string;
  accentColor?: string;
  type?: string;
}

export const PHILIPPINE_MEDICINES: CatalogMedicineData[] = ${JSON.stringify(MEDICINES, null, 2)};
`;
fs.writeFileSync(tsPath, tsContent, 'utf8');
console.log(`✓ Successfully exported TypeScript data to ${tsPath}`);

console.log('\nAll generation completed successfully!');
