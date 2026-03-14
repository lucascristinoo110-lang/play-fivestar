import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

export type AuthMode = "login" | "register";

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

  return (
    <div className="fixed inset-0 z-[85] bg-background/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 elevated-shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <div className="flex items-center gap-3 min-w-0">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={settings?.site_name || "Logo"} className="h-8 sm:h-9 w-auto object-contain" />
            ) : (
              <span className="text-sm font-bold text-gradient-green">{settings?.site_name || "Cassino"}</span>
            )}
            <p className="text-xs text-muted-foreground hidden sm:block">Acesse sem sair do lobby</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <Tabs value={mode} onValueChange={(value) => onModeChange(value as AuthMode)} className="p-4 sm:p-5">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="register">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-0">
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="E-mail"
                required
                className="bg-secondary border-border/40 h-11"
              />
              <div className="relative">
                <Input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Senha"
                  required
                  className="bg-secondary border-border/40 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-semibold h-11">
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-0">
            <form onSubmit={handleRegister} className="space-y-2.5">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nome completo"
                required
                className="bg-secondary border-border/40 h-10"
              />
              <Input
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                placeholder="E-mail"
                required
                className="bg-secondary border-border/40 h-10"
              />
              <Input
                value={registerCpf}
                onChange={(e) => setRegisterCpf(formatCpf(e.target.value))}
                placeholder="CPF"
                required
                className="bg-secondary border-border/40 h-10"
              />
              {cpfError && <p className="text-[11px] text-destructive">{cpfError}</p>}

              <Input
                value={registerPhone}
                onChange={(e) => setRegisterPhone(formatPhone(e.target.value))}
                placeholder="Telefone"
                required
                className="bg-secondary border-border/40 h-10"
              />
              {phoneError && <p className="text-[11px] text-destructive">{phoneError}</p>}

              <Input
                type={showRegisterPassword ? "text" : "password"}
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                placeholder="Senha"
                required
                className="bg-secondary border-border/40 h-10"
              />
              <Input
                type={showRegisterPassword ? "text" : "password"}
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                placeholder="Confirmar senha"
                required
                className="bg-secondary border-border/40 h-10"
              />

              <button
                type="button"
                onClick={() => setShowRegisterPassword((prev) => !prev)}
                className="text-[11px] text-primary hover:underline"
              >
                {showRegisterPassword ? "Ocultar senha" : "Mostrar senha"}
              </button>

              <label className="flex items-start gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-border accent-primary"
                />
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  Tenho 18+ e aceito os termos e política de privacidade.
                </span>
              </label>

              <Button
                type="submit"
                disabled={loading || !acceptTerms || !!cpfError || !!phoneError}
                className="w-full bg-primary text-primary-foreground font-semibold h-10"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? "Cadastrando..." : "Criar conta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
