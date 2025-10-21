import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Download, Trash2, Loader2 } from "lucide-react";

interface Budget {
  id: string;
  cliente_nome: string;
  cpf: string;
  endereco: string;
  cep: string;
  telefone: string;
  forma_pagamento: string;
  observacoes: string;
  total: number;
  status: string;
}

interface BudgetItem {
  id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
}

const BudgetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBudget();
    fetchItems();
  }, [id]);

  const fetchBudget = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        title: "Erro ao carregar orçamento",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } else {
      setBudget(data);
    }
    setLoading(false);
  };

  const fetchItems = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("budget_items")
      .select("*")
      .eq("budget_id", id);

    if (error) {
      toast({
        title: "Erro ao carregar itens",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(data || []);
    }
  };

  const calculateTotal = (items: BudgetItem[]) => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    const total = quantidade * precoUnitario;

    const { error } = await supabase.from("budget_items").insert({
      budget_id: id,
      descricao,
      quantidade,
      preco_unitario: precoUnitario,
      total,
    });

    if (error) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const newItems = await fetchItems();
    
    const newTotal = calculateTotal([...items, { id: '', descricao, quantidade, preco_unitario: precoUnitario, total }]);
    await supabase
      .from("budgets")
      .update({ total: newTotal })
      .eq("id", id);

    toast({
      title: "Item adicionado!",
    });

    setDescricao("");
    setQuantidade(1);
    setPrecoUnitario(0);
    setDialogOpen(false);
    fetchBudget();
    fetchItems();
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from("budget_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast({
        title: "Erro ao deletar item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item removido!",
    });

    const updatedItems = items.filter(item => item.id !== itemId);
    setItems(updatedItems);
    
    const newTotal = calculateTotal(updatedItems);
    await supabase
      .from("budgets")
      .update({ total: newTotal })
      .eq("id", id!);
    
    fetchBudget();
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O download em PDF estará disponível em breve!",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!budget) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={handleDownloadPDF} className="shadow-elegant">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h2 className="text-3xl font-bold mb-8">Orçamento</h2>

        {/* Client Info */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{budget.cliente_nome}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{budget.cpf}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{budget.telefone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CEP</p>
                <p className="font-medium">{budget.cep}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Endereço</p>
                <p className="font-medium">{budget.endereco}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                <p className="font-medium capitalize">{budget.forma_pagamento.replace('-', ' ')}</p>
              </div>
              {budget.observacoes && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium">{budget.observacoes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Itens do Orçamento</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantidade">Quantidade</Label>
                      <Input
                        id="quantidade"
                        type="number"
                        min="1"
                        value={quantidade}
                        onChange={(e) => setQuantidade(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="precoUnitario">Preço Unitário</Label>
                      <Input
                        id="precoUnitario"
                        type="number"
                        step="0.01"
                        min="0"
                        value={precoUnitario}
                        onChange={(e) => setPrecoUnitario(Number(e.target.value))}
                        required
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">Total do item</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(quantidade * precoUnitario)}
                    </p>
                  </div>
                  <Button type="submit" className="w-full">
                    Adicionar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum item adicionado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantidade}x {formatCurrency(item.preco_unitario)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-primary">{formatCurrency(item.total)}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(budget.total)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BudgetDetail;