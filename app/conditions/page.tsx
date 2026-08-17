"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import {
  FileText, ArrowLeft, Shield, Banknote, GraduationCap,
  AlertTriangle, Scale, UserCheck, Lock, ChevronDown,
 CalendarX } from "lucide-react";
import Link from "next/link";

export const CGU_VERSION = "1.0";
export const CGU_DATE = "2026-07-30";

interface Section {
  id: string;
  icon: React.ReactNode;
  titleFr: string;
  titleAr: string;
  contentFr: string[];
  contentAr: string[];
}

const SECTIONS: Section[] = [
  {
    id: "objet",
    icon: <FileText size={17} />,
    titleFr: "1. Objet de la plateforme",
    titleAr: "1. موضوع المنصة",
    contentFr: [
      "Ostadi est une plateforme de mise en relation entre professeurs indépendants et élèves (ou leurs parents) en Algérie, pour des cours de soutien scolaire dispensés en ligne.",
      "Ostadi agit exclusivement comme intermédiaire technique. La plateforme n'emploie pas les professeurs, ne dispense aucun cours, et n'est pas partie au contrat pédagogique conclu entre le professeur et l'élève.",
      "L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes conditions.",
    ],
    contentAr: [
      "أستاذي منصة للربط بين الأساتذة المستقلين والطلاب (أو أوليائهم) في الجزائر، من أجل دروس الدعم المدرسي عبر الإنترنت.",
      "تعمل أستاذي حصرياً كوسيط تقني. المنصة لا توظّف الأساتذة، ولا تقدّم أي درس، وليست طرفاً في العقد التربوي المبرم بين الأستاذ والطالب.",
      "استخدام المنصة يعني القبول الكامل بهذه الشروط.",
    ],
  },
  {
    id: "professeur",
    icon: <GraduationCap size={17} />,
    titleFr: "2. Engagements du professeur",
    titleAr: "2. التزامات الأستاذ",
    contentFr: [
      "Le professeur déclare disposer des compétences et qualifications qu'il présente sur son profil. Il s'engage à fournir des documents authentiques lors de la vérification (diplôme, pièce d'identité).",
      "Il est seul responsable du contenu pédagogique qu'il dispense, de sa qualité, et du respect des horaires annoncés.",
      "Il s'engage à honorer les cours réservés. En cas d'annulation, il doit prévenir les élèves inscrits dans un délai raisonnable et procéder au remboursement s'il a déjà été payé.",
      "Le professeur exerce en toute indépendance. Aucun lien de subordination n'existe entre lui et Ostadi. Il lui appartient de se conformer à ses obligations fiscales et sociales au regard de la législation algérienne.",
    ],
    contentAr: [
      "يصرّح الأستاذ بامتلاكه الكفاءات والمؤهلات التي يعرضها في ملفه الشخصي. ويلتزم بتقديم وثائق أصلية عند التوثيق (الشهادة، بطاقة الهوية).",
      "هو المسؤول الوحيد عن المحتوى التربوي الذي يقدّمه، وعن جودته، وعن احترام المواعيد المعلنة.",
      "يلتزم بإجراء الدروس المحجوزة. في حالة الإلغاء، يجب إعلام الطلاب المسجّلين في وقت معقول وردّ المبلغ إن كان قد استلمه.",
      "يمارس الأستاذ نشاطه باستقلالية تامة. لا توجد أي علاقة تبعية بينه وبين أستاذي. وعليه الامتثال لالتزاماته الجبائية والاجتماعية وفق التشريع الجزائري.",
    ],
  },
  {
    id: "mineurs",
    icon: <Shield size={17} />,
    titleFr: "3. Protection des élèves mineurs",
    titleAr: "3. حماية الطلاب القُصّر",
    contentFr: [
      "La majorité des élèves inscrits sur Ostadi sont mineurs. Le professeur s'engage à adopter en toutes circonstances un comportement professionnel, respectueux et adapté à un public jeune.",
      "Les échanges doivent rester strictement pédagogiques et se dérouler via les canaux de la plateforme (messagerie intégrée, salle de cours). Tout échange privé prolongé sortant du cadre du cours est déconseillé.",
      "Sont formellement interdits : tout propos ou contenu à caractère sexuel, discriminatoire, violent ou dégradant ; toute demande d'informations personnelles sans lien avec le cours ; toute tentative d'isoler un élève de ses parents ou tuteurs.",
      "Les parents ou tuteurs légaux sont invités à superviser les cours suivis par leurs enfants mineurs et peuvent y assister.",
      "Tout signalement de comportement inapproprié entraîne la suspension immédiate du compte concerné, sans préavis, et pourra faire l'objet d'un signalement aux autorités compétentes.",
    ],
    contentAr: [
      "غالبية الطلاب المسجّلين في أستاذي قُصّر. يلتزم الأستاذ باعتماد سلوك مهني ومحترم ومناسب لجمهور يافع في كل الأحوال.",
      "يجب أن تبقى المحادثات تربوية بحتة وأن تجري عبر قنوات المنصة (المراسلة المدمجة، قاعة الدرس). لا يُنصح بأي تواصل خاص مطوّل خارج إطار الدرس.",
      "يُمنع منعاً باتاً: أي كلام أو محتوى ذي طابع جنسي أو تمييزي أو عنيف أو مهين؛ أي طلب لمعلومات شخصية لا علاقة لها بالدرس؛ أي محاولة لعزل الطالب عن والديه أو أوليائه.",
      "يُدعى الأولياء إلى الإشراف على الدروس التي يتابعها أبناؤهم القُصّر ويمكنهم حضورها.",
      "أي إبلاغ عن سلوك غير لائق يؤدي إلى التعليق الفوري للحساب المعني، دون إشعار مسبق، وقد يكون موضوع إبلاغ للسلطات المختصة.",
    ],
  },
  {
    id: "paiement",
    icon: <Banknote size={17} />,
    titleFr: "4. Paiements et commission",
    titleAr: "4. المدفوعات والعمولة",
    contentFr: [
      "Les paiements des cours s'effectuent directement entre l'élève et le professeur, en dehors de la plateforme (BaridiMob, CIB, espèces ou tout autre moyen convenu entre les parties).",
      "Ostadi ne collecte ni ne détient les sommes versées par les élèves et ne peut donc être tenue responsable d'un défaut de paiement, d'un litige tarifaire ou d'un remboursement.",
      "Le professeur reverse à Ostadi une commission de 10 % du montant des cours effectivement réalisés via la plateforme. Cette commission est déclarée dans l'espace « Mes Revenus » et réglée mensuellement.",
      "Un abonnement mensuel ou annuel facultatif est proposé aux professeurs souhaitant bénéficier d'une visibilité renforcée. Il est sans engagement de durée et peut être interrompu à tout moment ; les sommes déjà versées ne sont pas remboursables.",
      "Les tarifs indiqués sur la plateforme sont fixés librement par chaque professeur.",
    ],
    contentAr: [
      "تتم مدفوعات الدروس مباشرة بين الطالب والأستاذ، خارج المنصة (بريدي موب، CIB، نقداً أو أي وسيلة أخرى متفق عليها).",
      "أستاذي لا تحصّل ولا تحتفظ بالمبالغ المدفوعة من الطلاب، وبالتالي لا يمكن تحميلها مسؤولية عدم الدفع أو نزاع في السعر أو استرجاع.",
      "يدفع الأستاذ لأستاذي عمولة قدرها 10٪ من مبلغ الدروس المنجزة فعلياً عبر المنصة. تُعلن هذه العمولة في فضاء «أرباحي» وتُسدّد شهرياً.",
      "يُقترح اشتراك شهري أو سنوي اختياري للأساتذة الراغبين في ظهور أفضل. وهو دون التزام بمدة ويمكن إيقافه في أي وقت؛ المبالغ المدفوعة غير قابلة للاسترجاع.",
      "الأسعار المعروضة على المنصة يحدّدها كل أستاذ بحرية.",
    ],
  },
  {
    id: "annulation",
    icon: <CalendarX size={17} />,
    titleFr: "5. Annulations et reports",
    titleAr: "5. الإلغاء والتأجيل",
    contentFr: [
      "Lorsqu'un professeur annule une séance, il doit rembourser intégralement l'élève ou lui proposer une séance de remplacement, acceptée par ce dernier. Les annulations répétées sans motif légitime peuvent entraîner la suspension du compte.",
      "Lorsqu'un élève annule plus de 24 heures avant le début de la séance, il peut prétendre au remboursement intégral. En deçà de 24 heures, le remboursement relève de l'appréciation du professeur. Une absence non signalée ne donne droit à aucun remboursement.",
      "En cas de défaillance technique de la salle vidéo, imputable à l'une ou l'autre partie, la séance est reportée sans frais supplémentaires. Le problème doit être signalé le jour même via la messagerie du cours.",
      "Pour un abonnement mensuel, toute séance manquée par le professeur doit être rattrapée. Une séance manquée par l'élève n'est pas remboursée, mais les supports déposés restent accessibles.",
      "Ostadi ne détenant pas les sommes versées, elle ne procède à aucun remboursement direct. Elle intervient en qualité d'arbitre en cas de litige et peut suspendre un compte ne respectant pas les présentes règles.",
    ],
    contentAr: [
      "عندما يلغي الأستاذ حصة، عليه إرجاع المبلغ كاملاً للطالب أو اقتراح حصة تعويضية يقبلها هذا الأخير. الإلغاء المتكرّر دون سبب مشروع قد يؤدّي إلى تعليق الحساب.",
      "إذا ألغى الطالب قبل أكثر من 24 ساعة من بداية الحصة، يحقّ له استرجاع كامل المبلغ. أقل من 24 ساعة، يبقى الاسترجاع من تقدير الأستاذ. الغياب دون إعلام لا يمنح أيّ حق في الاسترجاع.",
      "في حال عطل تقني في قاعة الفيديو، من أيّ طرف كان، تُؤجَّل الحصة دون تكلفة إضافية. يجب الإبلاغ عن المشكل في نفس اليوم عبر محادثة الدرس.",
      "بالنسبة للاشتراك الشهري، كلّ حصة يفوّتها الأستاذ يجب تعويضها. الحصة التي يفوّتها الطالب لا تُسترجَع، لكن تبقى الوثائق المرفوعة متاحة له.",
      "بما أن أستاذي لا تحتفظ بالمبالغ المدفوعة، فهي لا تقوم بأيّ استرجاع مباشر. تتدخّل بصفة محكّم عند النزاع، ويمكنها تعليق حساب لا يحترم هذه القواعد.",
    ],
  },
  {
    id: "verification",
    icon: <UserCheck size={17} />,
    titleFr: "6. Vérification et badge",
    titleAr: "5. التوثيق والشارة",
    contentFr: [
      "Ostadi propose une procédure de vérification facultative permettant d'obtenir un badge « Profil vérifié ».",
      "Cette vérification porte sur l'authenticité apparente des documents transmis. Elle ne constitue ni une validation des compétences pédagogiques, ni une garantie de la qualité des cours dispensés.",
      "La transmission de documents falsifiés entraîne la fermeture définitive du compte.",
      "Ostadi se réserve le droit de retirer un badge à tout moment.",
    ],
    contentAr: [
      "تقترح أستاذي إجراء توثيق اختياري يتيح الحصول على شارة «ملف موثّق».",
      "يتعلق هذا التوثيق بالمظهر الأصلي للوثائق المُرسلة. ولا يشكّل مصادقة على الكفاءات التربوية ولا ضماناً لجودة الدروس.",
      "إرسال وثائق مزوّرة يؤدي إلى الإغلاق النهائي للحساب.",
      "تحتفظ أستاذي بحق سحب الشارة في أي وقت.",
    ],
  },
  {
    id: "donnees",
    icon: <Lock size={17} />,
    titleFr: "7. Données personnelles",
    titleAr: "6. المعطيات الشخصية",
    contentFr: [
      "Les données collectées (identité, coordonnées, wilaya, documents de vérification) sont utilisées uniquement pour le fonctionnement du service et ne sont ni vendues ni cédées à des tiers commerciaux.",
      "Le traitement est effectué conformément à la loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel.",
      "Les documents de vérification sont accessibles uniquement à l'administrateur de la plateforme et conservés le temps nécessaire au traitement du dossier.",
      "Chaque utilisateur peut demander la consultation, la rectification ou la suppression de ses données en écrivant à l'adresse de contact figurant sur le site.",
    ],
    contentAr: [
      "المعطيات المجمّعة (الهوية، بيانات الاتصال، الولاية، وثائق التوثيق) تُستعمل فقط لتشغيل الخدمة ولا تُباع ولا تُنقل لأطراف تجارية.",
      "تتم المعالجة وفقاً للقانون رقم 18-07 المؤرخ في 10 جوان 2018 المتعلق بحماية الأشخاص الطبيعيين في مجال معالجة المعطيات ذات الطابع الشخصي.",
      "وثائق التوثيق متاحة فقط لمدير المنصة وتُحفظ للمدة الضرورية لمعالجة الملف.",
      "يمكن لكل مستخدم طلب الاطلاع على معطياته أو تصحيحها أو حذفها عبر مراسلة عنوان الاتصال المذكور في الموقع.",
    ],
  },
  {
    id: "interdits",
    icon: <AlertTriangle size={17} />,
    titleFr: "8. Comportements interdits",
    titleAr: "8. السلوكيات الممنوعة",
    contentFr: [
      "Créer un compte sous une fausse identité ou usurper l'identité d'autrui.",
      "Publier un contenu illicite, diffamatoire, haineux, violent ou contraire aux bonnes mœurs.",
      "Contourner la plateforme pour éviter la commission après une mise en relation initiée via Ostadi.",
      "Publier de faux avis ou manipuler le système de notation.",
      "Extraire massivement les données de la plateforme ou en perturber le fonctionnement.",
      "Tout manquement peut entraîner la suspension ou la suppression du compte sans préavis ni indemnité.",
    ],
    contentAr: [
      "إنشاء حساب بهوية مزيّفة أو انتحال هوية الغير.",
      "نشر محتوى غير قانوني أو تشهيري أو كراهي أو عنيف أو مخالف للآداب العامة.",
      "الالتفاف على المنصة لتفادي العمولة بعد ربط تمّ عبر أستاذي.",
      "نشر تقييمات مزيّفة أو التلاعب بنظام التقييم.",
      "الاستخراج المكثّف لمعطيات المنصة أو تعطيل عملها.",
      "أي إخلال قد يؤدي إلى تعليق أو حذف الحساب دون إشعار أو تعويض.",
    ],
  },
  {
    id: "responsabilite",
    icon: <Scale size={17} />,
    titleFr: "9. Responsabilité et litiges",
    titleAr: "9. المسؤولية والنزاعات",
    contentFr: [
      "Ostadi met en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans garantie d'un fonctionnement ininterrompu ou exempt d'erreurs.",
      "La responsabilité d'Ostadi ne saurait être engagée en cas de litige entre un professeur et un élève, de défaut de paiement, de qualité insuffisante d'un cours, ou d'interruption technique liée à un tiers (opérateur, hébergeur, fournisseur de visioconférence).",
      "Les présentes conditions sont régies par le droit algérien. En cas de litige, une solution amiable sera recherchée en priorité ; à défaut, les juridictions algériennes compétentes seront saisies.",
      "Ostadi peut modifier ces conditions. Les utilisateurs seront informés des changements substantiels et leur acceptation pourra être à nouveau requise.",
    ],
    contentAr: [
      "تبذل أستاذي الوسائل المعقولة لضمان توفّر الخدمة، دون ضمان عمل متواصل أو خالٍ من الأخطاء.",
      "لا تتحمّل أستاذي المسؤولية في حالة نزاع بين أستاذ وطالب، أو عدم دفع، أو جودة غير كافية لدرس، أو انقطاع تقني مرتبط بطرف ثالث (متعامل، مستضيف، مزوّد خدمة الفيديو).",
      "تخضع هذه الشروط للقانون الجزائري. في حالة نزاع، يُبحث أولاً عن حل ودّي؛ وإلا تُرفع القضية أمام الجهات القضائية الجزائرية المختصة.",
      "يمكن لأستاذي تعديل هذه الشروط. سيُعلم المستخدمون بالتغييرات الجوهرية وقد يُطلب قبولهم من جديد.",
    ],
  },
];

export default function ConditionsPage() {
  const { isRTL } = useLang();
  const [open, setOpen] = useState<string | null>("objet");

  return (
    <div className="cgu-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="cgu-container">

        <Link href="/" className="cgu-back">
          <ArrowLeft size={15} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          {isRTL ? "الرئيسية" : "Accueil"}
        </Link>

        {/* ── En-tête ── */}
        <div className="cgu-header">
          <div className="cgu-icon"><FileText size={20} /></div>
          <div>
            <h1 className="cgu-title">
              {isRTL ? "شروط الاستخدام" : "Conditions générales d'utilisation"}
            </h1>
            <p className="cgu-sub">
              {isRTL ? `النسخة ${CGU_VERSION} — ` : `Version ${CGU_VERSION} — `}
              {new Date(CGU_DATE).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
                day: "2-digit", month: "long", year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* ── Avertissement ── */}
        <div className="cgu-notice">
          <Shield size={16} />
          <p>
            {isRTL
              ? "أستاذي وسيط تقني فقط. الدروس والمدفوعات تتم مباشرة بين الأستاذ والطالب."
              : "Ostadi est un intermédiaire technique. Les cours et les paiements se font directement entre le professeur et l'élève."}
          </p>
        </div>

        {/* ── Sections ── */}
        <div className="cgu-sections">
          {SECTIONS.map(s => {
            const isOpen = open === s.id;
            const title = isRTL ? s.titleAr : s.titleFr;
            const content = isRTL ? s.contentAr : s.contentFr;
            return (
              <div key={s.id} className={`cgu-section ${isOpen ? "cgu-section-open" : ""}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="cgu-section-head"
                >
                  <span className="cgu-section-icon">{s.icon}</span>
                  <span className="cgu-section-title">{title}</span>
                  <ChevronDown
                    size={16}
                    className="cgu-chevron"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                {isOpen && (
                  <div className="cgu-section-body">
                    {content.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="cgu-footer">
          {isRTL
            ? "بإنشاء حساب على أستاذي، تُقرّ بأنك قرأت هذه الشروط وقبلتها."
            : "En créant un compte sur Ostadi, vous reconnaissez avoir lu et accepté ces conditions."}
        </p>
      </div>

      <style jsx global>{`
        .cgu-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 20% 8%, rgba(124,58,237,0.08) 0%, transparent 45%),
            linear-gradient(rgba(168,85,247,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.02) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 28px 16px 70px;
        }
        .cgu-container { max-width: 760px; margin: 0 auto; }

        .cgu-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #a78bfa; text-decoration: none; font-size: 13px; font-weight: 600;
          margin-bottom: 20px; padding: 7px 13px; border-radius: 10px; transition: all 0.2s ease;
        }
        .cgu-back:hover { background: rgba(124,58,237,0.12); color: white; gap: 9px; }

        .cgu-header { display: flex; align-items: center; gap: 13px; margin-bottom: 20px; }
        .cgu-icon {
          width: 48px; height: 48px; border-radius: 15px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(255,140,0,0.18), rgba(124,58,237,0.18));
          border: 1px solid rgba(255,140,0,0.26);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .cgu-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.4px; line-height: 1.25; }
        .cgu-sub { color: #8b7bb8; font-size: 12px; margin: 4px 0 0; }

        .cgu-notice {
          display: flex; align-items: flex-start; gap: 11px;
          background: rgba(255,140,0,0.07); border: 1px solid rgba(255,140,0,0.24);
          border-radius: 14px; padding: 14px 16px; margin-bottom: 22px;
        }
        .cgu-notice svg { color: #FF8C00; flex-shrink: 0; margin-top: 1px; }
        .cgu-notice p { color: #fdba74; font-size: 13px; margin: 0; line-height: 1.6; }

        .cgu-sections { display: flex; flex-direction: column; gap: 9px; }
        .cgu-section {
          background: linear-gradient(145deg, rgba(20,8,45,0.85), rgba(15,5,30,0.85));
          border: 1px solid rgba(124,58,237,0.16);
          border-radius: 15px; overflow: hidden;
          transition: border-color 0.25s ease;
        }
        .cgu-section-open { border-color: rgba(168,85,247,0.32); }
        .cgu-section-head {
          width: 100%; display: flex; align-items: center; gap: 12px;
          background: none; border: none; cursor: pointer;
          padding: 15px 16px; text-align: start; font-family: inherit;
        }
        .cgu-section-icon {
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          background: rgba(124,58,237,0.14); color: #a78bfa;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.25s ease;
        }
        .cgu-section-open .cgu-section-icon {
          background: rgba(255,140,0,0.16); color: #FF8C00;
        }
        .cgu-section-title {
          flex: 1; color: white; font-weight: 700; font-size: 14px; line-height: 1.4;
        }
        .cgu-chevron { color: #6d28d9; flex-shrink: 0; transition: transform 0.28s ease; }

        .cgu-section-body {
          padding: 0 16px 18px 16px;
          animation: cguOpen 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        [dir="rtl"] .cgu-section-body { padding: 0 16px 18px 16px; }
        @keyframes cguOpen {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cgu-section-body p {
          color: #a78bfa; font-size: 13px; line-height: 1.75;
          margin: 0 0 11px; padding-inline-start: 46px;
        }
        .cgu-section-body p:last-child { margin-bottom: 0; }
        @media (max-width: 520px) {
          .cgu-section-body p { padding-inline-start: 0; }
        }

        .cgu-footer {
          color: #6d28d9; font-size: 12px; text-align: center;
          margin: 30px 0 0; line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
