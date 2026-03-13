import { CasinoSidebar } from "@/components/casino/CasinoSidebar";
import { TopBar } from "@/components/casino/TopBar";
import { motion } from "framer-motion";
import { 
  DollarSign, Users, TrendingUp, ArrowDownToLine, ArrowUpFromLine, 
  Activity, BarChart3 
} from "lucide-react";

const stats = [
  { label: "GGR (Bruto)", value: "R$ 145.230", change: "+12.5%", icon: DollarSign, positive: true },
  { label: "NGR (Líquido)", value: "R$ 98.450", change: "+8.2%", icon: TrendingUp, positive: true },
  { label: "Depósitos Hoje", value: "R$ 52.100", change: "+23.1%", icon: ArrowDownToLine, positive: true },
  { label: "Saques Hoje", value: "R$ 18.600", change: "-5.3%", icon: ArrowUpFromLine, positive: false },
  { label: "Cadastros Hoje", value: "127", change: "+18.7%", icon: Users, positive: true },
  { label: "Jogadores Ativos", value: "342", change: "+4.1%", icon: Activity, positive: true },
];

const recentUsers = [
  { id: "USR-8842", name: "João S.", email: "joao@email.com", deposit: "R$ 500", status: "Ativo", date: "13/03/2026" },
  { id: "USR-8841", name: "Maria L.", email: "maria@email.com", deposit: "R$ 1.200", status: "Ativo", date: "13/03/2026" },
  { id: "USR-8840", name: "Carlos R.", email: "carlos@email.com", deposit: "R$ 250", status: "Pendente", date: "13/03/2026" },
  { id: "USR-8839", name: "Ana P.", email: "ana@email.com", deposit: "R$ 800", status: "Ativo", date: "12/03/2026" },
  { id: "USR-8838", name: "Pedro M.", email: "pedro@email.com", deposit: "R$ 150", status: "Bloqueado", date: "12/03/2026" },
];

const apiLogs = [
  { time: "14:32:18", service: "BSPAY", type: "CASH-IN", status: "200", amount: "R$ 500,00", user: "USR-8842" },
  { time: "14:31:45", service: "Playfiver", type: "LAUNCH", status: "200", amount: "—", user: "USR-8841" },
  { time: "14:30:12", service: "iGameWin", type: "BALANCE", status: "200", amount: "R$ 1.200", user: "USR-8841" },
  { time: "14:28:55", service: "BSPAY", type: "CASH-OUT", status: "201", amount: "R$ 300,00", user: "USR-8839" },
  { time: "14:27:30", service: "Playfiver", type: "CALLBACK", status: "200", amount: "R$ 45,00", user: "USR-8840" },
];

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <CasinoSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onSearch={() => {}} />
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-card border border-border/40 p-4 card-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-[10px] font-mono font-semibold ${stat.positive ? 'text-primary' : 'text-destructive'}`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="rounded-xl bg-card border border-border/40 card-shadow">
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Últimos Cadastros
                </h2>
                <span className="text-xs text-muted-foreground">Hoje</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium">Depósito</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                        <td className="p-3 font-mono text-muted-foreground">{u.id}</td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-muted-foreground text-[10px]">{u.email}</p>
                        </td>
                        <td className="p-3 font-mono text-foreground">{u.deposit}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            u.status === "Ativo" ? "bg-primary/15 text-primary" :
                            u.status === "Pendente" ? "bg-accent/15 text-accent" :
                            "bg-destructive/15 text-destructive"
                          }`}>
                            {u.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API Logs */}
            <div className="rounded-xl bg-card border border-border/40 card-shadow">
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Logs de API
                </h2>
                <span className="text-xs text-muted-foreground">Tempo real</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground">
                      <th className="text-left p-3 font-medium">Hora</th>
                      <th className="text-left p-3 font-medium">Serviço</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiLogs.map((log, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-surface-hover transition-colors">
                        <td className="p-3 font-mono text-muted-foreground">{log.time}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            log.service === "BSPAY" ? "bg-primary/15 text-primary" :
                            log.service === "Playfiver" ? "bg-accent/15 text-accent" :
                            "bg-secondary text-secondary-foreground"
                          }`}>
                            {log.service}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-foreground">{log.type}</td>
                        <td className="p-3">
                          <span className="text-primary font-mono">{log.status}</span>
                        </td>
                        <td className="p-3 font-mono text-foreground">{log.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
