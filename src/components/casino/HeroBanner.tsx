import heroBanner from "@/assets/hero-banner.jpg";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl overflow-hidden card-shadow"
    >
      <img
        src={heroBanner}
        alt="Nexus Casino - Sua sorte, nossa tecnologia"
        className="w-full h-48 sm:h-56 md:h-64 object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent flex items-center">
        <div className="px-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Sua sorte, nossa <span className="text-gradient-green">tecnologia</span>.
          </h1>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            342 jogadores ativos agora • Depósito confirmado em 1.2s
          </p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
            Jogar Agora
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
