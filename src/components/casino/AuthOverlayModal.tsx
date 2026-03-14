import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Eye, EyeOff, LogIn, UserPlus, Mail, Lock, User, Phone, FileText, Shield, Zap, Trophy, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export type AuthMode = "login" | "register" | "forgot";

type AuthOverlayModalProps = {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
};

function validateCpf(cpf: string) {
  const nums = cpf.replace(/\D/g, "");
  if (nums.length !== 11 || /^(\d)\1{10}$/.test(nums)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(nums[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(nums[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(nums[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === Number(nums[10]);
}

function validatePhone(phone: string) {
  const nums = phone.replace(/\D/g, "");
  return nums.length === 10 || nums.length === 11;
}

function formatCpf(value: string) {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
}

function formatPhone(value: string) {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return nums;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

export function AuthOverlayModal({ open, mode, onClose, onModeChange }: AuthOverlayModalProps) {
  const { settings } = useSiteSettings();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerCpf, setRegisterCpf] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const phoneError = useMemo(() => {
    const nums = registerPhone.replace(/\D/g, "");
    if (!nums.length || nums.length >= 10) return "";
    return "Telefone inválido. Use (XX) XXXXX-XXXX";
  }, [registerPhone]);

  const cpfError = useMemo(() => {
    const nums = registerCpf.replace(/\D/g, "");
    if (nums.length === 11 && !validateCpf(nums)) return "CPF inválido";
    return "";
  }, [registerCpf]);

  const passwordStrength = useMemo(() => {
    const p = registerPassword;
    if (!p) return { level: 0, label: "", color: "" };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { level: score, label: "Fraca", color: "bg-destructive" };
    if (score <= 3) return { level: score, label: "Média", color: "bg-yellow-500" };
    return { level: score, label: "Forte", color: "bg-primary" };
  }, [registerPassword]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Login realizado!" });
    onClose();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    setForgotSent(true);
    toast({ title: "E-mail enviado!", description: "Verifique sua caixa de entrada para redefinir a senha." });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    const cpfDigits = registerCpf.replace(/\D/g, "");
    const phoneDigits = registerPhone.replace(/\D/g, "");

    if (!acceptTerms) {
      toast({ title: "Aceite os termos", description: "Você precisa aceitar os termos para continuar.", variant: "destructive" });
      return;
    }

    if (!validateCpf(cpfDigits)) {
      toast({ title: "CPF inválido", description: "Verifique o CPF digitado.", variant: "destructive" });
      return;
    }

    if (!validatePhone(phoneDigits)) {
      toast({ title: "Telefone inválido", description: "Use o formato (XX) XXXXX-XXXX.", variant: "destructive" });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      toast({ title: "Senhas não conferem", description: "As senhas digitadas são diferentes.", variant: "destructive" });
      return;
    }

    if (registerPassword.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: {
          display_name: displayName,
          cpf: cpfDigits,
          phone: phoneDigits,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Cadastro realizado!", description: "Confirme seu e-mail para concluir o acesso." });
    onClose();
  }

  if (!open) return null;

  const siteName = settings?.site_name || "SantiagoBet";

  return (
    <div className="fixed inset-0 z-[85] bg-background/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 elevated-shadow overflow-hidden max-h-[95vh] overflow-y-auto">
        {/* Gradient header */}
        <div
          className="flex flex-col items-center justify-center py-5 sm:py-6 px-6 relative"
          style={{
            background: "linear-gradient(135deg, hsl(222 47% 8%), hsl(142 50% 15%), hsl(222 47% 6%))",
          }}
        >
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/10 text-white/60">
            <X className="h-4 w-4" />
          </button>
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={siteName} className="h-10 sm:h-12 w-auto object-contain drop-shadow-lg" />
          ) : (
            <span className="text-xl font-bold text-white tracking-tight">{siteName}</span>
          )}
          <p className="text-white/50 text-[10px] mt-1.5 tracking-wide">
            {mode === "login" && "Acesse sua conta e comece a ganhar"}
            {mode === "register" && "Crie sua conta em menos de 1 minuto"}
            {mode === "forgot" && "Recupere o acesso à sua conta"}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          {/* ───── LOGIN ───── */}
          {mode === "login" && (
            <div className="space-y-4">
              {/* Social proof */}
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> 100% Seguro</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Saque rápido</span>
                <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-primary" /> +10k jogadores</span>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Seu e-mail"
                    required
                    className="bg-secondary border-border/40 h-11 pl-10"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="bg-secondary border-border/40 h-11 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setForgotSent(false); onModeChange("forgot"); }}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold h-11 shadow-lg shadow-primary/25">
                  <LogIn className="h-4 w-4 mr-2" />
                  {loading ? "Entrando..." : "Entrar na conta"}
                </Button>
              </form>

              <div className="text-center pt-1">
                <p className="text-xs text-muted-foreground">
                  Não tem conta?{" "}
                  <button onClick={() => onModeChange("register")} className="text-primary font-semibold hover:underline">
                    Crie uma conta grátis
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ───── FORGOT PASSWORD ───── */}
          {mode === "forgot" && (
            <div className="space-y-4">
              <button
                onClick={() => onModeChange("login")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
              </button>

              {forgotSent ? (
                <div className="text-center space-y-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">E-mail enviado!</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Enviamos um link de recuperação para <strong className="text-foreground">{forgotEmail}</strong>. Verifique sua caixa de entrada e spam.
                  </p>
                  <Button onClick={() => { setForgotSent(false); onModeChange("login"); }} variant="outline" size="sm" className="text-xs">
                    Voltar ao login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Recuperar senha</h3>
                  <p className="text-xs text-muted-foreground">
                    Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Seu e-mail cadastrado"
                      required
                      className="bg-secondary border-border/40 h-11 pl-10"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold h-11">
                    {loading ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* ───── REGISTER ───── */}
          {mode === "register" && (
            <div className="space-y-4">
              {/* Urgency */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                <p className="text-[10px] text-primary font-semibold">🎁 Cadastre-se agora e ganhe bônus de boas-vindas!</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-2.5">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nome completo"
                    required
                    className="bg-secondary border-border/40 h-10 pl-10"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="E-mail"
                    required
                    className="bg-secondary border-border/40 h-10 pl-10"
                  />
                </div>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={registerCpf}
                    onChange={(e) => setRegisterCpf(formatCpf(e.target.value))}
                    placeholder="CPF"
                    required
                    className="bg-secondary border-border/40 h-10 pl-10"
                  />
                </div>
                {cpfError && <p className="text-[11px] text-destructive pl-1">{cpfError}</p>}

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(formatPhone(e.target.value))}
                    placeholder="Telefone (XX) XXXXX-XXXX"
                    required
                    className="bg-secondary border-border/40 h-10 pl-10"
                  />
                </div>
                {phoneError && <p className="text-[11px] text-destructive pl-1">{phoneError}</p>}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showRegisterPassword ? "text" : "password"}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Criar senha (mín. 6 caracteres)"
                    required
                    className="bg-secondary border-border/40 h-10 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showRegisterPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Password strength */}
                {registerPassword && (
                  <div className="flex items-center gap-2 px-1">
                    <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`flex-1 rounded-full transition-all ${i <= passwordStrength.level ? passwordStrength.color : "bg-border/30"}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] font-medium ${passwordStrength.color === "bg-destructive" ? "text-destructive" : passwordStrength.color === "bg-yellow-500" ? "text-yellow-500" : "text-primary"}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showRegisterPassword ? "text" : "password"}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Confirmar senha"
                    required
                    className="bg-secondary border-border/40 h-10 pl-10"
                  />
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5 rounded border-border accent-primary"
                  />
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Tenho 18+ e aceito os{" "}
                    <Link to="/termos" className="text-primary hover:underline" onClick={onClose}>termos de uso</Link>
                    {" "}e{" "}
                    <Link to="/privacidade" className="text-primary hover:underline" onClick={onClose}>política de privacidade</Link>.
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={loading || !acceptTerms || !!cpfError || !!phoneError}
                  className="w-full bg-primary text-primary-foreground font-bold h-11 shadow-lg shadow-primary/25"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {loading ? "Cadastrando..." : "Criar minha conta"}
                </Button>
              </form>

              <div className="text-center pt-1">
                <p className="text-xs text-muted-foreground">
                  Já tem conta?{" "}
                  <button onClick={() => onModeChange("login")} className="text-primary font-semibold hover:underline">
                    Fazer login
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
