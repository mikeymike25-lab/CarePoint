import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonIcon
} from '@ionic/react';
import {
  timeOutline,
  shieldCheckmarkOutline,
  storefrontOutline,
  heartOutline,
  medkitOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  trendingUpOutline,
  globeOutline
} from 'ionicons/icons';

interface TimelineEvent {
  year: string;
  quarter?: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  icon: string;
  badgeColor: string;
}

const timelineEvents: TimelineEvent[] = [
  {
    year: '2024',
    quarter: 'Q3 - Q4',
    title: 'The Inception & Architecture',
    subtitle: 'Addressing the Fragmented Philippine Pharmacy Landscape',
    description:
      'CarePoint was conceived during an intensive Systems Integration study in response to recurring healthcare challenges across the Philippines: long pharmacy queues, unpredictable local medicine stock, and lack of verified digital access to daily over-the-counter remedies.',
    highlights: [
      'Engineered cross-platform mobile and web architecture with Ionic & React',
      'Established structural FDA OTC compliance and prescription verification barriers',
      'Engineered instant real-time order tracking and store synchronization'
    ],
    icon: medkitOutline,
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    year: '2025',
    quarter: 'Q1 - Q3',
    title: 'Real-Time Dispatch & Partner Onboarding',
    subtitle: 'Connecting Community Pharmacies with Patients',
    description:
      'The platform expanded beyond a catalog viewer into a fully interactive two-sided ecosystem. Local partner pharmacies in Metro Manila and neighboring provinces were integrated into the live CarePoint dispatch board, enabling on-demand pickup and mapped motorcycle courier deliveries.',
    highlights: [
      'Launched instant live dispatch boards for pharmacy pharmacists',
      'Integrated OpenStreetMap GPS routing and reverse-geocoded addresses',
      'Built live Rx inquiry messaging with direct pharmacist chat'
    ],
    icon: storefrontOutline,
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  {
    year: '2026',
    quarter: 'Current Era',
    title: 'The Unified Healthcare Platform',
    subtitle: 'AI-Powered Triage, Role Governance, & Multi-Platform Deployment',
    description:
      'CarePoint evolved into a multi-tier healthcare operating system. Introducing granular Pharmacy Owner vs Staff operational roles, platform-wide AI healthcare triage, native Android/iOS bundling with Capacitor, and comprehensive admin governance.',
    highlights: [
      'Multi-tier role model: Admin, Pharmacy Owner, Pharmacy Staff, and Customer',
      'Integrated CarePoint AI Healthbot with safety disclaimers',
      'Automated stock deduction and zero-downtime inventory controls'
    ],
    icon: sparklesOutline,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
];

const coreValues = [
  {
    icon: shieldCheckmarkOutline,
    title: 'Patient Safety First',
    desc: 'Strict OTC-only checkout guarantees prescription drugs can never be improperly purchased without certified clinical consultation.'
  },
  {
    icon: storefrontOutline,
    title: 'Empowering Local Pharmacies',
    desc: 'Connecting neighborhood drugstores and local pharmacy owners directly with digital customers in their immediate barangays.'
  },
  {
    icon: trendingUpOutline,
    title: 'Radical Price Transparency',
    desc: 'Real-time medicine pricing and nearby branch comparison allow customers to make informed, cost-effective decisions.'
  },
  {
    icon: globeOutline,
    title: 'Data Privacy & Security',
    desc: 'Strict compliance with Republic Act No. 10173 (Data Privacy Act of 2012) reinforced by multi-layered end-to-end data encryption and strict branch-level access controls.'
  }
];

const CompanyHistory: React.FC = () => {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="px-2 sm:px-6" style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900 text-base sm:text-lg">Company History</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full flex flex-col gap-6">

          {/* Hero Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-4 text-teal-600 shadow-xs">
              <IonIcon icon={timeOutline} className="text-3xl" />
            </div>

            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-600 mb-1">
              CarePoint Healthcare Journey
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
              Transforming Pharmacy Care in the Philippines
            </h1>

            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              CarePoint was founded with a singular purpose: to make over-the-counter medicine purchasing transparent, effortless, and accessible for every Filipino family while elevating local community pharmacies into digital hubs.
            </p>
          </div>

          {/* Mission & Vision Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                  <IonIcon icon={heartOutline} className="text-xl" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Our Mission</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To democratize access to everyday healthcare essentials by bridging patients with verified neighborhood pharmacies through modern real-time technology, dependable delivery, and clear, transparent pricing.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-3">
                  <IonIcon icon={sparklesOutline} className="text-xl" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Our Vision</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To become the leading digital bridge between licensed Philippine pharmacies and Filipino communities — setting the benchmark for safety, patient privacy, and ethical healthcare logistics.
                </p>
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-4">
            <div className="px-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700">
                Milestones & Evolution
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                The CarePoint Journey
              </h2>
            </div>

            <div className="space-y-3 pt-1">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex items-stretch gap-3 sm:gap-4">
                  {/* Clean Minimal Timeline Spine Column */}
                  <div className="flex flex-col items-center shrink-0 w-5">
                    {/* Minimal Node Indicator */}
                    <div className="w-3.5 h-3.5 rounded-full bg-teal-600 ring-4 ring-teal-100 shrink-0 mt-3.5" />
                    {/* Connecting Vertical Line (omitted for the final item) */}
                    {index < timelineEvents.length - 1 && (
                      <div className="w-0.5 flex-1 bg-teal-200/80 my-1.5 rounded-full" />
                    )}
                  </div>

                  {/* Event Card */}
                  <div className="flex-1 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-2.5 min-w-0 mb-2">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${event.badgeColor}`}>
                        {event.year} {event.quarter && `• ${event.quarter}`}
                      </span>
                      <IonIcon icon={event.icon} className="text-teal-600 text-base" />
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">{event.title}</h3>
                      <p className="text-xs font-semibold text-teal-700 mt-0.5">{event.subtitle}</p>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Key Deliverables</div>
                      <ul className="space-y-1">
                        {event.highlights.map((item, hIdx) => (
                          <li key={hIdx} className="flex items-start gap-1.5 text-xs text-slate-600">
                            <IonIcon icon={checkmarkCircleOutline} className="text-teal-600 text-sm shrink-0 mt-0.5" />
                            <span className="leading-snug">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Values Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
            <div className="text-center max-w-lg mx-auto">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-600">
                Guiding Principles
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                Our Core Values
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {coreValues.map((val, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <IonIcon icon={val.icon} className="text-lg" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">{val.title}</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{val.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default CompanyHistory;
