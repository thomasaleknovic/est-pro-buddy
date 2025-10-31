import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Loader2, FileText, Trash2, CheckCircle, RotateCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, Session } from "@supabase/supabase-js";
import { AppHeader } from "@/components/AppHeader";

interface Budget {
  id: string;
  cliente_nome: string;
  cpf: string;
  status: string;
  total: number;
  created_at: string;
  deleted_at: string | null;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [deletedBudgets, setDeletedBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [filteredDeletedBudgets, setFilteredDeletedBudgets] = useState<Budget[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/login");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchBudgets();
    }
  }, [user]);

  useEffect(() => {
    const applyFilters = (budgetList: Budget[]) => {
      let filtered = budgetList;

      // Filter by search
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (budget) =>
            budget.cliente_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            budget.cpf.includes(searchQuery)
        );
      }

      // Filter by status
      if (statusFilter !== "all") {
        filtered = filtered.filter((budget) => budget.status === statusFilter);
      }

      // Filter by value range
      const min = minValue ? parseFloat(minValue) : 0;
      const max = maxValue ? parseFloat(maxValue) : Infinity;
      filtered = filtered.filter((budget) => budget.total >= min && budget.total <= max);

      return filtered;
    };

    setFilteredBudgets(applyFilters(budgets));
    setFilteredDeletedBudgets(applyFilters(deletedBudgets));
  }, [searchQuery, statusFilter, minValue, maxValue, budgets, deletedBudgets]);

  const fetchBudgets = async () => {
    setLoading(true);
    
    // Fetch active budgets
    const { data: activeBudgets, error: activeError } = await supabase
      .from("budgets")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Fetch deleted budgets
    const { data: trashBudgets, error: trashError } = await supabase
      .from("budgets")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (activeError) {
      toast({
        title: "Erro ao carregar orçamentos",
        description: activeError.message,
        variant: "destructive",
      });
    } else {
      setBudgets(activeBudgets || []);
      setFilteredBudgets(activeBudgets || []);
    }

    if (trashError) {
      toast({
        title: "Erro ao carregar lixeira",
        description: trashError.message,
        variant: "destructive",
      });
    } else {
      setDeletedBudgets(trashBudgets || []);
      setFilteredDeletedBudgets(trashBudgets || []);
    }
    
    setLoading(false);
  };


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleDeleteBudget = async (budgetId: string) => {
    const { error } = await supabase
      .from("budgets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", budgetId);

    if (error) {
      toast({
        title: "Erro ao mover para lixeira",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Orçamento movido para lixeira",
      description: "O orçamento será excluído permanentemente após 30 dias.",
    });

    fetchBudgets();
  };

  const handleRestoreBudget = async (budgetId: string) => {
    const { error } = await supabase
      .from("budgets")
      .update({ deleted_at: null })
      .eq("id", budgetId);

    if (error) {
      toast({
        title: "Erro ao restaurar orçamento",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Orçamento restaurado",
      description: "O orçamento foi restaurado com sucesso.",
    });

    fetchBudgets();
  };

  const handlePermanentDelete = async (budgetId: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

    if (error) {
      toast({
        title: "Erro ao excluir permanentemente",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Orçamento excluído permanentemente",
      description: "O orçamento foi removido definitivamente.",
    });

    fetchBudgets();
  };

  const handleToggleStatus = async (budgetId: string, currentStatus: string) => {
    // Cycle through statuses: draft -> sent -> approved -> draft
    let newStatus: string;
    if (currentStatus === "draft") {
      newStatus = "sent";
    } else if (currentStatus === "sent") {
      newStatus = "approved";
    } else {
      newStatus = "draft";
    }

    const { error } = await supabase
      .from("budgets")
      .update({ status: newStatus })
      .eq("id", budgetId);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const statusLabels = {
      draft: "rascunho",
      sent: "enviado",
      approved: "aprovado"
    };

    toast({
      title: "Status atualizado",
      description: `Orçamento marcado como ${statusLabels[newStatus as keyof typeof statusLabels]}.`,
    });

    fetchBudgets();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <AppHeader />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Meus Orçamentos</h2>
            <p className="text-muted-foreground">Gerencie todos os seus orçamentos</p>
          </div>
          <Link to="/budget/new">
            <Button className="shadow-elegant">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-card mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label className="text-sm text-muted-foreground mb-2 block">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
              </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Valor</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Active and Deleted Budgets */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Ativos ({filteredBudgets.length})
            </TabsTrigger>
            <TabsTrigger value="deleted">
              Lixeira ({filteredDeletedBudgets.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Budgets Tab */}
          <TabsContent value="active">
            {filteredBudgets.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Tente buscar com outros termos"
                  : "Comece criando seu primeiro orçamento"}
              </p>
              {!searchQuery && (
                <Link to="/budget/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Orçamento
                  </Button>
                </Link>
              )}
            </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBudgets.map((budget) => (
                  <Card key={budget.id} className="shadow-card hover:shadow-elegant transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <Link to={`/budget/${budget.id}`} className="flex-1">
                          <CardTitle className="text-lg hover:text-primary transition-colors">
                            {budget.cliente_nome}
                          </CardTitle>
                        </Link>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleToggleStatus(budget.id, budget.status);
                            }}
                            title={budget.status === "approved" ? "Marcar como rascunho" : "Marcar como aprovado"}
                          >
                            <CheckCircle className={`h-4 w-4 ${budget.status === "approved" ? "text-primary" : "text-muted-foreground"}`} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mover para lixeira?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O orçamento será movido para a lixeira e excluído automaticamente após 30 dias.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)}>
                                  Mover para lixeira
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link to={`/budget/${budget.id}`}>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CPF:</span>
                            <span className="font-medium">{budget.cpf}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-bold text-primary">
                              {formatCurrency(budget.total)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Data:</span>
                            <span>{formatDate(budget.created_at)}</span>
                          </div>
                          <div className="pt-2">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                budget.status === "draft"
                                  ? "bg-secondary text-secondary-foreground"
                                  : budget.status === "sent"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {budget.status === "draft" 
                                ? "Rascunho" 
                                : budget.status === "sent"
                                ? "Enviado"
                                : "Aprovado"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deleted Budgets Tab */}
          <TabsContent value="deleted">
            {filteredDeletedBudgets.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Lixeira vazia</h3>
                  <p className="text-muted-foreground">
                    Nenhum orçamento na lixeira
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeletedBudgets.map((budget) => {
                  const deletedDate = budget.deleted_at ? new Date(budget.deleted_at) : null;
                  const expirationDate = deletedDate ? new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
                  const daysRemaining = expirationDate ? Math.ceil((expirationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

                  return (
                    <Card key={budget.id} className="shadow-card hover:shadow-elegant transition-shadow opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{budget.cliente_nome}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRestoreBudget(budget.id)}
                              title="Restaurar orçamento"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. O orçamento será excluído permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handlePermanentDelete(budget.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir permanentemente
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">CPF:</span>
                            <span className="font-medium">{budget.cpf}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total:</span>
                            <span className="font-bold text-primary">
                              {formatCurrency(budget.total)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Excluído em:</span>
                            <span>{deletedDate ? formatDate(budget.deleted_at!) : "-"}</span>
                          </div>
                          <div className="pt-2">
                            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive">
                              Expira em {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;