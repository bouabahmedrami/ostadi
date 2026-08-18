"use client";
import { useLang } from "@/lib/lang-context";
import { haptic } from "@/lib/haptics";
import Sheet from "./Sheet";
import { AlertTriangle, HelpCircle } from "lucide-react";

/**
 * Demande de confirmation.
 *
 * Remplace window.confirm(), qui sur Android affiche le nom de
 * domaine au-dessus du message — « ostadi-eta.vercel.app
 * indique... ». Rien ne rappelle plus brutalement à l'utilisateur
 * qu'il est sur un site web et non dans une application.
 *
 * S'utilise avec le hook useConfirm :
 *
 *   const { confirm, confirmState, answerConfirm } = useConfirm();
 *   ...
 *   if (await confirm("Supprimer ce cours ?", { danger: true })) {
 *     await deleteClasse(id);
 *   }
 *   ...
 *   <ConfirmDialog state={confirmState} onAnswer={answerConfirm} />
 */
export default function ConfirmDialog({
  state,
  onAnswer,
}: {
  state: {
    open: boolean;
    title: string;
    message?: string;
    danger?: boolean;
  };
  onAnswer: (ok: boolean) => void;
}) {
  const { isRTL } = useLang();

  return (
    <Sheet
      open={state.open}
      onClose={() => onAnswer(false)}
      maxHeight={60}
    >
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <span style={{
          width: 56, height: 56, borderRadius: 18,
          margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: state.danger
            ? "rgba(239, 68, 68, 0.13)"
            : "rgba(124, 58, 237, 0.14)",
          color: state.danger ? "#f87171" : "#a78bfa",
        }}>
          {state.danger ? <AlertTriangle size={25} /> : <HelpCircle size={25} />}
        </span>

        <h3 style={{
          color: "white", fontWeight: 800, fontSize: 17,
          margin: "0 0 8px", lineHeight: 1.4,
        }}>
          {state.title}
        </h3>

        {state.message && (
          <p style={{
            color: "#8b7bb8", fontSize: 13.5,
            margin: "0 auto 24px", maxWidth: 340, lineHeight: 1.65,
            whiteSpace: "pre-line",
          }}>
            {state.message}
          </p>
        )}

        <div style={{
          display: "flex", gap: 10, marginTop: state.message ? 0 : 22,
        }}>
          <button
            onClick={() => onAnswer(false)}
            className="os-btn-ghost"
            style={{ flex: 1, padding: "13px", fontSize: 14 }}
          >
            {isRTL ? "إلغاء" : "Annuler"}
          </button>

          <button
            onClick={() => onAnswer(true)}
            className={state.danger ? "" : "os-btn-chalk"}
            style={{
              flex: 1, padding: "13px", fontSize: 14, fontWeight: 750,
              borderRadius: 14, border: "none", cursor: "pointer",
              fontFamily: "inherit", color: "white",
              ...(state.danger ? {
                background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                boxShadow: "0 4px 16px rgba(220, 38, 38, 0.28)",
              } : {}),
            }}
          >
            {state.danger
              ? (isRTL ? "حذف" : "Supprimer")
              : (isRTL ? "تأكيد" : "Confirmer")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
