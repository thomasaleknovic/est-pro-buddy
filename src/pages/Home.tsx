import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Download } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-estimas.svg";

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Estimas" className="h-8" />
          </div>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/signup">
              <Button>Começar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Crie Orçamentos Profissionais em Minutos
          </h2>
          <p className="text-xl text-muted-foreground">
            Sistema completo para gestão de orçamentos com download em PDF. 
            Simples, rápido e profissional.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link to="/signup">
              <Button size="lg" className="shadow-elegant">
                Criar Conta Grátis
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">
                Acessar Sistema
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-lg border shadow-card hover:shadow-elegant transition-shadow">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gestão Completa</h3>
            <p className="text-muted-foreground">
              Crie, edite e gerencie todos os seus orçamentos em um só lugar
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-card hover:shadow-elegant transition-shadow">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Download em PDF</h3>
            <p className="text-muted-foreground">
              Gere PDFs profissionais dos seus orçamentos com um clique
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-card hover:shadow-elegant transition-shadow">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Busca e Filtros</h3>
            <p className="text-muted-foreground">
              Encontre rapidamente qualquer orçamento com busca avançada
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2025 Estimas. Sistema de gestão de orçamentos.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;