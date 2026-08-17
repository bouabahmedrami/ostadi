"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import {
  ShieldCheck, ChevronDown, AlertTriangle, Clock, XCircle, RefreshCw,
} from "lucide-react";

/**
 * Politique d'annulation.
 *
 * Rien n'était écrit jusqu'ici. Le premier litige — un professeur qui
 * annule après paiement, un élève qui ne vient pas — serait arrivé sans
 * cadre, et se serait réglé au cas par cas, donc mal.
 *
 * Le texte reste volontairement simple : Ostadi n'encaisse pas les
 * paiements des cours, elle ne peut donc pas rembourser. Ce que la
 * plateforme peut faire, c'est fixer les règles et arbitrer.
 */
export default function CancellationPolicy({
  compact = false,
}: {
  /** Version repliée, pour la page d'un cours */
  compact?: boolean;
}) {
  const { isRTL } = useLang();
  const [open, setOpen] = useState(!compact);

  const RULES = [
    {
      icon: <XCircle size={15} />,
      color: "#f87171",
      fr: {
        title: "Le professeur annule",
        body: "Il doit rembourser intégralement l'élève, ou proposer une séance de remplacement acceptée par lui. Une annulation répétée sans motif entraîne la suspension du compte.",
      },
      ar: {
        title: "الأستاذ يلغي الدرس",
        body: "عليه إرجاع المبلغ كاملاً أو اقتراح حصة تعويضية يقبلها الطالب. الإلغاء المتكرّر دون سبب يؤدّي إلى تعليق الحساب.",
      },
    },
    {
      icon: <Clock size={15} />,
      color: "#FBBF24",
      fr: {
        title: "L'élève annule",
        body: "Plus de 24 h avant : remboursement intégral. Moins de 24 h : à la discrétion du professeur. Absence sans prévenir : aucun remboursement.",
      },
      ar: {
        title: "الطالب يلغي",
        body: "قبل أكثر من 24 ساعة : إرجاع كامل. أقل من 24 ساعة : حسب تقدير الأستاذ. الغياب دون إعلام : لا إرجاع.",
      },
    },
    {
      icon: <RefreshCw size={15} />,
      color: "#60a5fa",
      fr: {
        title: "Problème technique",
        body: "Si la salle vidéo ne fonctionne pas de votre côté ou du sien, la séance est reportée sans frais. Signalez-le le jour même via le chat du cours.",
      },
      ar: {
        title: "مشكل تقني",
        body: "إذا تعذّر عمل قاعة الفيديو من أيّ طرف، تُؤجَّل الحصة دون تكلفة. أبلغ في نفس اليوم عبر محادثة الدرس.",
      },
    },
    {
      icon: <AlertTriangle size={15} />,
      color: "#a78bfa",
      fr: {
        title: "Abonnement mensuel",
        body: "Une séance manquée par le professeur est rattrapée. Une séance manquée par l'élève n'est pas remboursée mais reste accessible via les supports déposés.",
      },
      ar: {
        title: "الاشتراك الشهري",
        body: "الحصة التي يفوّتها الأستاذ تُعوَّض. الحصة التي يفوّتها الطالب لا تُسترجَع لكن تبقى الوثائق متاحة.",
      },
    },
  ];

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(20,8,45,0.85), rgba(15,5,30,0.85))",
      border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: 16,
      overflow: "hidden",
    }}>
      {/* ── En-tête ── */}
      <button
        onClick={() => compact && setOpen(!open)}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 11,
          background: "none", border: "none",
          padding: "15px 17px",
          cursor: compact ? "pointer" : "default",
          fontFamily: "inherit",
          textAlign: isRTL ? "right" : "left",
        }}
      >
        <span style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: "rgba(124,58,237,0.16)", color: "#a78bfa",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <ShieldCheck size={16} />
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", color: "white", fontWeight: 700, fontSize: 14 }}>
            {isRTL ? "سياسة الإلغاء" : "Politique d'annulation"}
          </span>
          <span style={{ display: "block", color: "#6d28d9", fontSize: 11.5, marginTop: 2 }}>
            {isRTL
              ? "ما يحدث إذا أُلغيت الحصة"
              : "Ce qui se passe si une séance est annulée"}
          </span>
        </span>

        {compact && (
          <ChevronDown
            size={17}
            style={{
              color: "#6d28d9", flexShrink: 0,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.25s ease",
            }}
          />
        )}
      </button>

      {/* ── Règles ── */}
      {open && (
        <div style={{
          padding: "0 17px 17px",
          display: "flex", flexDirection: "column", gap: 11,
        }}>
          {RULES.map((r, i) => {
            const t = isRTL ? r.ar : r.fr;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 11,
                background: "rgba(10,0,20,0.4)",
                borderRadius: 12,
                padding: "12px 13px",
              }}>
                <span style={{ color: r.color, flexShrink: 0, marginTop: 1 }}>
                  {r.icon}
                </span>
                <div>
                  <div style={{ color: "white", fontWeight: 650, fontSize: 12.5, marginBottom: 4 }}>
                    {t.title}
                  </div>
                  <p style={{ color: "#8b7bb8", fontSize: 11.5, margin: 0, lineHeight: 1.65 }}>
                    {t.body}
                  </p>
                </div>
              </div>
            );
          })}

          {/* ── Position de la plateforme ── */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "rgba(255,140,0,0.06)",
            border: "1px solid rgba(255,140,0,0.2)",
            borderRadius: 12,
            padding: "12px 13px",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>ℹ️</span>
            <p style={{ color: "#fdba74", fontSize: 11.5, margin: 0, lineHeight: 1.7 }}>
              {isRTL
                ? "أستاذي لا تستلم مبالغ الدروس — الدفع يتمّ مباشرة بين الطالب والأستاذ. لذلك لا يمكنها الإرجاع، لكنها تتدخّل للتحكيم عند النزاع، ويمكنها تعليق حساب أستاذ لا يحترم هذه القواعد."
                : "Ostadi n'encaisse pas les paiements des cours — ils se font directement entre l'élève et le professeur. La plateforme ne peut donc pas rembourser, mais elle arbitre en cas de litige et peut suspendre un professeur qui ne respecte pas ces règles."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
