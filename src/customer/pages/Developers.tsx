import React from 'react';
import { 
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, 
  IonButtons, IonMenuButton, IonIcon
} from '@ionic/react';
import { 
  starOutline, 
  codeSlashOutline
} from 'ionicons/icons';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  isLead?: boolean;
  description: string;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Mike Angelo P. Salamat',
    role: 'Project Lead & Main Developer',
    image: '/Salamat.png',
    isLead: true,
    description: 'Spearheaded full-stack system architecture, database design with Supabase, and core application development using Ionic React.'
  },
  {
    name: 'Joseph Pj P. Abus',
    role: 'Software Engineer',
    image: '/Abus.png',
    description: 'Contributed to application design, system architecture analysis, and module integration testing.'
  },
  {
    name: 'Ruspel Joshua V. Espinoza',
    role: 'Software Engineer',
    image: '/Espinoza.png',
    description: 'Assisted in feature design, system workflow planning, and UI quality assurance.'
  },
  {
    name: 'Jonathan Bayjon',
    role: 'Software Engineer',
    image: '/Bayhon.png',
    description: 'Collaborated on system documentation, requirements mapping, and feature integration.'
  },
  {
    name: 'Nathaniel Santos',
    role: 'Software Engineer',
    image: '/Santos.png',
    description: 'Supported data modeling, system specification documentation, and unit verification.'
  }
];

const Developers: React.FC = () => {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="px-4 md:px-8" style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
          <IonButtons slot="start">
            <IonMenuButton className="text-slate-900" />
          </IonButtons>
          <IonTitle className="font-bold text-slate-900">About the Developers</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ '--background': 'var(--bg-app)' } as React.CSSProperties}>
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto w-full flex flex-col gap-6">

          {/* Hero Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3 text-teal-600 shadow-xs">
              <IonIcon icon={codeSlashOutline} className="text-2xl" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
              CarePoint Development Team
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              IT 005-IT31S4 • Integrative Programming and Technologies
            </p>
          </div>

          {/* Team Members Section */}
          <div className="flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Project Team & Contributors
            </h2>

            {/* Team Members Grid - Minimal, consistent theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {teamMembers.map((member) => (
                <div 
                  key={member.name}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-teal-500/30 hover:shadow-sm transition-all"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img 
                      src={member.image} 
                      alt={member.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                        member.isLead 
                          ? 'text-teal-800 bg-teal-100 border border-teal-200/70' 
                          : 'text-teal-700 bg-teal-50'
                      }`}>
                        {member.isLead && <IonIcon icon={starOutline} className="text-xs text-amber-500" />}
                        {member.role}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {member.name}
                    </h4>
                    <p className="text-xs text-slate-500 leading-snug line-clamp-2 mt-0.5">
                      {member.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Footer */}
          <div className="bg-white/60 rounded-2xl p-4 border border-slate-200/60 text-center">
            <p className="text-xs text-slate-500 font-medium">
              CarePoint Hybrid Pharmacy Platform • IT 005-IT31S4 Integrative Programming and Technologies
            </p>
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default Developers;
