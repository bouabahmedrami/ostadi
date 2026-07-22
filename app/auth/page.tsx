"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { WILAYAS, UserRole } from "@/lib/types";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register, user, profile } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(
    params.get("mode") === "register" ? "register" : "login"
  );
  const [role, setRole] = useState<UserRole>(
    params.get("role") === "teacher" ? "teacher" : "student"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("Alger");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.role === "teacher") router.push("/dashboard");
      else router.push("/mes-cours");
    }
  }, [user, profile, router]);

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!name || !phone) { setError("Tous les champs sont requis."); setLoading(false); return; }
        await register(email, password, name, phone, wilaya, role);
      }
    } catch (e: any) {
      const msg = e?.code === "auth/email-already-in-use" ? "Email déjà utilisé."
        : e?.code === "auth/wrong-password" ? "Mot de passe incorrect."
        : e?.code === "auth/user-not-found" ? "Compte introuvable."
        : "Une erreur s'est produite.";
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <div className="grid-bg min-h-screen flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <img src="/ostadi-logo.svg" alt="Ostadi" className="h-12 mx-auto" />
          </Link>
          <p className="text-purple-400 text-sm mt-3">
            {mode === "login" ? "Bon retour sur Ostadi !" : "Rejoignez Ostadi aujourd'hui"}
          </p>
        </div>

        <div className="card border-purple-800/50 shadow-xl">
          {/* Mode toggle */}
          <div className="flex bg-[#0D0118] rounded-xl p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  mode === m ? "bg-purple-700 text-white shadow" : "text-purple-400 hover:text-purple-200"
                }`}>
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {/* Role selector */}
            {mode === "register" && (
              <div>
                <label className="label">Je suis</label>
                <div className="flex gap-3">
                  {(["student", "teacher"] as const).map((r) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        role === r
                          ? "border-[#FF8C00] bg-orange-900/20 text-[#FF8C00]"
                          : "border-purple-800/50 text-purple-400 hover:border-purple-600"
                      }`}>
                      {r === "student" ? "🎓 Élève / Parent" : "👨‍🏫 Professeur"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "register" && (
              <>
                <div>
                  <label className="label">Nom complet</label>
                  <input className="input-field" placeholder="Mohamed Amrani" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input className="input-field" placeholder="0555 XX XX XX" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="label">Wilaya</label>
                  <select className="input-field" value={wilaya} onChange={e => setWilaya(e.target.value)}>
                    {WILAYAS.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input className="input-field" type="email" placeholder="vous@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <input className="input-field pr-10" type={showPass ? "text" : "password"}
                  placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-800/50">
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full mt-1 py-3">
              {loading ? "Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
