"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useToast } from "./Toast";
import { haptic } from "@/lib/haptics";
import {
  Copy, Check, Phone, MessageCircle, Landmark, X, Wallet,
} from "lucide-react";
import Sheet from "./Sheet";

/**
 * Coordonnées de règlement de la commission.
 *
 * Le professeur voyait « 2 400 DA à régler » sans savoir où envoyer
 * l'argent. Il fallait qu'il demande, ou qu'il fouille dans la page
 * d'abonnement — deux frictions qui retardent le paiement, et donc
 * ta trésorerie.
 */

const PAYMENT = {
  rip: "00799999002593548667",
  primaryPhone: "0674202411",   // appel + WhatsApp
  otherPhones: ["0798465842", "0558435083"],
};

function waLink(phone: string, text: string): string {
  return `https://wa.me/213${phone.replace(/^0/, "")}?text=${encodeURIComponent(text)}`;
}

export default function CommissionPaymentInfo({
  open,
  onClose,
  amount,
  teacherName,
}: {
  open: boolean;
  onClose: () => void;
  /** Montant dû, en dinars */
  amount: number;
  teacherName?: string;
}) {
  const { isRTL } = useLang();
  const toast = useToast();
  const [copied, setCopied] = useState<"rip" | "amount" | null>(null);

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-DZ");

  function copy(what: "rip" | "amount") {
    const value = what === "rip" ? PAYMENT.rip : String(Math.round(amount));
    navigator.clipboard.writeText(value);
    haptic("success");
    setCopied(what);
    toast.success(isRTL ? "تم النسخ" : "Copié");
    setTimeout(() => setCopied(null), 2000);
  }

  const message = isRTL
    ? `مرحباً، أنا ${teacherName || ""}. قمت بتحويل ${fmt(amount)} دج كعمولة.`
    : `Bonjour, je suis ${teacherName || ""}. J'ai viré ${fmt(amount)} DA de commission.`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isRTL ? "تسوية العمولة" : "Régler ma commission"}
      subtitle={`${fmt(amount)} ${DA}`}
    >
      {/* ═══ MONTANT ═══ */}
      <div style={{
        background: "rgba(255,140,0,0.09)",
        border: "1px solid rgba(255,140,0,0.28)",
        borderRadius: 14, padding: "15px 16px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            color: "#a78bfa", fontSize: 10.5, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.7px",
          }}>
            {isRTL ? "المبلغ المستحق" : "Montant à régler"}
          </div>
          <div style={{ color: "#FF8C00", fontWeight: 900, fontSize: 26, marginTop: 3 }}>
            {fmt(amount)} <span style={{ fontSize: 14 }}>{DA}</span>
          </div>
        </div>
        <button onClick={() => copy("amount")} style={copyBtn(copied === "amount")}>
          {copied === "amount" ? <Check size={13} /> : <Copy size={13} />}
          {isRTL ? "نسخ" : "Copier"}
        </button>
      </div>

      {/* ═══ RIP ═══ */}
      <p style={label}>
        <Landmark size={12} style={{ color: "#FF8C00" }} />
        {isRTL ? "الحساب البريدي (RIP)" : "Compte CCP (RIP)"}
      </p>

      <div style={{
        background: "linear-gradient(140deg, rgba(255,140,0,0.07), rgba(124,58,237,0.06))",
        border: "2px dashed rgba(255,140,0,0.34)",
        borderRadius: 14, padding: "14px 16px", marginBottom: 18,
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, flexWrap: "wrap",
        }}>
          <span style={{
            color: "#FF8C00", fontWeight: 800, fontSize: 16,
            letterSpacing: "1px", fontFamily: "monospace", wordBreak: "break-all",
          }}>
            {PAYMENT.rip}
          </span>
          <button onClick={() => copy("rip")} style={copyBtn(copied === "rip")}>
            {copied === "rip" ? <Check size={13} /> : <Copy size={13} />}
            {isRTL ? "نسخ" : "Copier"}
          </button>
        </div>
      </div>

      {/* ═══ CONTACT ═══ */}
      <p style={label}>
        <Phone size={12} style={{ color: "#FF8C00" }} />
        {isRTL ? "بعد التحويل، أعلمنا" : "Après le virement, prévenez-nous"}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <a
          href={waLink(PAYMENT.primaryPhone, message)}
          target="_blank" rel="noopener noreferrer"
          onClick={() => haptic("tap")}
          style={{
            ...contactBtn,
            background: "rgba(34,197,94,0.14)",
            color: "#4ade80",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <MessageCircle size={14} /> WhatsApp
        </a>
        <a
          href={`tel:${PAYMENT.primaryPhone}`}
          onClick={() => haptic("tap")}
          className="os-btn-ghost"
          style={contactBtn}
        >
          <Phone size={14} /> {PAYMENT.primaryPhone}
        </a>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        {PAYMENT.otherPhones.map(p => (
          <a key={p} href={`tel:${p}`} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            color: "#6d28d9", fontSize: 12, textDecoration: "none",
          }}>
            <Phone size={11} /> {p}
          </a>
        ))}
      </div>

      {/* ═══ RAPPEL ═══ */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 9,
        background: "rgba(59,130,246,0.06)",
        border: "1px solid rgba(59,130,246,0.2)",
        borderRadius: 12, padding: "12px 13px",
      }}>
        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>ℹ️</span>
        <p style={{ color: "#93c5fd", fontSize: 11.5, margin: 0, lineHeight: 1.7 }}>
          {isRTL
            ? "احتفظ بوصل التحويل. يُسجَّل الدفع يدوياً خلال 24 ساعة، وستتلقّى إشعاراً."
            : "Conservez votre reçu de virement. Le paiement est enregistré manuellement sous 24 heures, et vous recevrez une notification."}
        </p>
      </div>
    </Sheet>
  );
}

const label: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  color: "#a78bfa", fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.7px",
  margin: "0 0 9px",
};

function copyBtn(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
    background: active ? "rgba(34,197,94,0.16)" : "rgba(255,140,0,0.14)",
    color: active ? "#4ade80" : "#FF8C00",
    border: `1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(255,140,0,0.3)"}`,
    fontSize: 12, fontWeight: 700, padding: "8px 14px",
    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
  };
}

const contactBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  fontSize: 13, fontWeight: 700, padding: "10px 16px",
  borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
  textDecoration: "none",
};
