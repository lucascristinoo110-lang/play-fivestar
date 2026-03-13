import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Fingerprint, User, Mail, Phone, Lock, CheckSquare } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Register() {
  const [cpf, setCpf] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) {
      toast({ title: "Aceite os termos", description: "Você precisa aceitar os termos para continuar.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Senhas não conferem", description: "As senhas digitadas são diferentes.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, cpf: cpf.replace(/\D/g, ""), phone: phone.replace(/\D/g, "") },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cadastro realizado!", description: "Sua conta foi criada com sucesso." });
      navigate("/");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={settings?.site_name || "Logo"} className="h-10 mx-auto object-contain" />
          ) : (
            <h1 className="text-2xl font-bold text-gradient-green tracking-tight">{settings?.site_name || "NEXUS"}</h1>
          )}
          <p className="text-muted-foreground text-sm mt-3">Vamos começar criando sua conta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3 rounded-xl bg-card border border-border/40 p-6 card-shadow">
          {/* CPF */}
          <div className="relative">
            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              value={cpf}
              onChange={e => setCpf(formatCpf(e.target.value))}
              placeholder="CPF"
              required
              className="pl-10 bg-secondary border-border/40 h-12"
            />
          </div>

          {/* Nome */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Nome e sobrenome"
              required
              className="pl-10 bg-secondary border-border/40 h-12"
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              className="pl-10 bg-secondary border-border/40 h-12"
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
            <Input
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="Número de telefone"
              required
              className="pl-10 bg-secondary border-border/40 h-12"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite sua senha"
              required
              className="pl-10 pr-10 bg-secondary border-border/40 h-12"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua senha"
              required
              className="pl-10 bg-secondary border-border/40 h-12"
            />
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
              className="mt-1 rounded border-border accent-primary"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Tenho 18 anos de idade e aceito os <span className="text-primary cursor-pointer hover:underline">Termos e Condições</span> e <span className="text-primary cursor-pointer hover:underline">Política de Privacidade</span>
            </span>
          </label>

          <Button type="submit" disabled={loading || !acceptTerms} className="w-full bg-primary text-primary-foreground font-semibold h-12 text-sm">
            {loading ? "Cadastrando..." : "Cadastrar agora"}
          </Button>

          <p className="text-center text-sm text-muted-foreground pt-1">
            Já tem uma conta? <Link to="/login" className="text-primary hover:underline font-medium">Faça login aqui</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
