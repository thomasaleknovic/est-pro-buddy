import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Download, Trash2, Loader2, Edit } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AppHeader } from "@/components/AppHeader";

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
  frete: number;
  desconto_total: number;
}

interface BudgetItem {
  id: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  desconto: number;
  tipo_desconto: string;
}

interface Profile {
  full_name: string | null;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  logo_url: string | null;
}

const BudgetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  const [desconto, setDesconto] = useState(0);
  const [tipoDesconto, setTipoDesconto] = useState<"percentual" | "valor">("percentual");
  
  const [editData, setEditData] = useState({
    cliente_nome: "",
    cpf: "",
    endereco: "",
    cep: "",
    telefone: "",
    forma_pagamento: "",
    observacoes: "",
    frete: 0,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchBudget();
    fetchItems();
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

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
      setEditData({
        cliente_nome: data.cliente_nome,
        cpf: data.cpf,
        endereco: data.endereco,
        cep: data.cep,
        telefone: data.telefone,
        forma_pagamento: data.forma_pagamento,
        observacoes: data.observacoes || "",
        frete: data.frete || 0,
      });
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

  const calculateItemTotal = (quantidade: number, preco: number, desconto: number, tipo: string) => {
    const subtotal = quantidade * preco;
    if (tipo === "percentual") {
      return subtotal - (subtotal * desconto / 100);
    }
    return subtotal - desconto;
  };

  const calculateTotal = (items: BudgetItem[], frete: number = 0) => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    return itemsTotal + frete;
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    const total = calculateItemTotal(quantidade, precoUnitario, desconto, tipoDesconto);

    const { error } = await supabase.from("budget_items").insert({
      budget_id: id,
      descricao,
      quantidade,
      preco_unitario: precoUnitario,
      desconto,
      tipo_desconto: tipoDesconto,
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

    toast({
      title: "Item adicionado!",
    });

    setDescricao("");
    setQuantidade(1);
    setPrecoUnitario(0);
    setDesconto(0);
    setTipoDesconto("percentual");
    setDialogOpen(false);
    fetchBudget();
    fetchItems();
  };

  const handleEditBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const { error } = await supabase
      .from("budgets")
      .update({
        cliente_nome: editData.cliente_nome,
        cpf: editData.cpf,
        endereco: editData.endereco,
        cep: editData.cep,
        telefone: editData.telefone,
        forma_pagamento: editData.forma_pagamento,
        observacoes: editData.observacoes,
        frete: editData.frete,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar orçamento",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Orçamento atualizado!",
    });

    setEditDialogOpen(false);
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

    fetchBudget();
    fetchItems();
  };

  const handleDownloadPDF = async () => {
    if (!budget) return;

    const doc = new jsPDF();
    const greenColor: [number, number, number] = [23, 189, 144]; // #17bd90
    const grayColor: [number, number, number] = [217, 217, 217]; // #d9d9d9
    const darkGrayColor: [number, number, number] = [102, 102, 102]; // #666666
    
    // Header com logo e ordem de serviço
    let yPos = 15;
    
    // Logo à esquerda
    if (profile?.logo_url) {
      try {
        doc.addImage(profile.logo_url, "PNG", 15, yPos, 40, 20);
      } catch (e) {
        console.error("Erro ao adicionar logo:", e);
      }
    }
    
    // Ordem de serviço e data à direita
    doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
    doc.rect(120, yPos, 75, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Ordem de serviço:", 122, yPos + 6);
    doc.text(id?.substring(0, 8) || "N/A", 165, yPos + 6);
    
    doc.setFillColor(greenColor[0], greenColor[1], greenColor[2]);
    doc.rect(120, yPos + 10, 75, 10, "F");
    doc.text("Data:", 122, yPos + 16);
    doc.text(new Date().toLocaleDateString("pt-BR"), 165, yPos + 16);
    
    // Seção de dados da empresa e cliente
    yPos = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    // Dados da empresa (lado esquerdo)
    doc.setFont(undefined, "bold");
    const empresaNome = profile?.full_name || "SUA EMPRESA";
    doc.text(empresaNome.toUpperCase(), 15, yPos);
    
    doc.setFont(undefined, "normal");
    yPos += 5;
    if (profile?.cpf_cnpj) {
      doc.text(profile.cpf_cnpj, 15, yPos);
      yPos += 5;
    }
    if (profile?.email) {
      doc.text(profile.email, 15, yPos);
      yPos += 5;
    }
    if (profile?.telefone) {
      doc.text(profile.telefone, 15, yPos);
    }
    
    // Dados do cliente (lado direito)
    let clientYPos = 50;
    doc.setFont(undefined, "bold");
    doc.text(budget.cliente_nome.toUpperCase(), 110, clientYPos);
    
    doc.setFont(undefined, "normal");
    clientYPos += 5;
    doc.text(`CPF: ${budget.cpf}`, 110, clientYPos);
    clientYPos += 5;
    doc.text(`CEP: ${budget.cep}`, 110, clientYPos);
    clientYPos += 5;
    doc.text(`Endereço: ${budget.endereco}`, 110, clientYPos, { maxWidth: 85 });
    
    // Tabela de itens
    yPos = Math.max(yPos, clientYPos) + 15;
    
    const tableData = items.map(item => [
      item.descricao,
      item.quantidade.toString(),
      formatCurrency(item.preco_unitario),
      formatCurrency(item.total),
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [["DESCRIÇÃO", "QUANTIDADE", "PREÇO UNITÁRIO", "TOTAL"]],
      body: tableData,
      theme: "grid",
      headStyles: { 
        fillColor: greenColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: {
        fillColor: grayColor,
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 85, halign: "left" },
        1: { cellWidth: 35, halign: "center" },
        2: { cellWidth: 35, halign: "center" },
        3: { cellWidth: 35, halign: "center" },
      },
      margin: { left: 15, right: 15 },
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    const totalBoxX = 145;
    const totalBoxWidth = 50;
    
    // Box do total
    doc.setFillColor(darkGrayColor[0], darkGrayColor[1], darkGrayColor[2]);
    doc.rect(totalBoxX, finalY, totalBoxWidth, 10, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Total", totalBoxX + 2, finalY + 6);
    doc.text(formatCurrency(budget.total || 0), totalBoxX + totalBoxWidth - 2, finalY + 6, { align: "right" });
    
    // Seção de forma de pagamento e observações
    let footerY = finalY + 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    
    // Forma de pagamento (lado esquerdo)
    doc.setFont(undefined, "bold");
    doc.text("Forma de Pagamento", 15, footerY);
    doc.setFont(undefined, "normal");
    doc.text(budget.forma_pagamento, 15, footerY + 5);
    
    // Observações (lado direito)
    if (budget.observacoes) {
      doc.setFont(undefined, "bold");
      doc.text("Observação", 110, footerY);
      doc.setFont(undefined, "normal");
      const obsLines = doc.splitTextToSize(budget.observacoes, 85);
      doc.text(obsLines, 110, footerY + 5);
    }
    
    doc.save(`orcamento-${budget.cliente_nome}.pdf`);
    
    toast({
      title: "PDF gerado!",
      description: "O orçamento foi baixado com sucesso.",
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
      <AppHeader />

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button onClick={handleDownloadPDF} className="shadow-elegant">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="desconto">Desconto</Label>
                      <Input
                        id="desconto"
                        type="number"
                        step="0.01"
                        min="0"
                        value={desconto}
                        onChange={(e) => setDesconto(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipoDesconto">Tipo</Label>
                      <Select value={tipoDesconto} onValueChange={(v: any) => setTipoDesconto(v)}>
                        <SelectTrigger id="tipoDesconto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentual">Percentual (%)</SelectItem>
                          <SelectItem value="valor">Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">Total do item</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(calculateItemTotal(quantidade, precoUnitario, desconto, tipoDesconto))}
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
                        {item.desconto > 0 && (
                          <span className="text-primary ml-2">
                            (-{item.desconto}{item.tipo_desconto === "percentual" ? "%" : " R$"})
                          </span>
                        )}
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
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p>{formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}</p>
                  </div>
                  {budget.frete > 0 && (
                    <div className="flex justify-between text-sm">
                      <p className="text-muted-foreground">Frete</p>
                      <p>{formatCurrency(budget.frete)}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-lg font-semibold">Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(budget.total || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditBudget} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_cliente_nome">Nome do Cliente</Label>
                <Input
                  id="edit_cliente_nome"
                  value={editData.cliente_nome}
                  onChange={(e) =>
                    setEditData({ ...editData, cliente_nome: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_cpf">CPF</Label>
                <Input
                  id="edit_cpf"
                  value={editData.cpf}
                  onChange={(e) => setEditData({ ...editData, cpf: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_telefone">Telefone</Label>
                <Input
                  id="edit_telefone"
                  value={editData.telefone}
                  onChange={(e) =>
                    setEditData({ ...editData, telefone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_cep">CEP</Label>
                <Input
                  id="edit_cep"
                  value={editData.cep}
                  onChange={(e) => setEditData({ ...editData, cep: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit_endereco">Endereço</Label>
                <Input
                  id="edit_endereco"
                  value={editData.endereco}
                  onChange={(e) =>
                    setEditData({ ...editData, endereco: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_forma_pagamento">Forma de Pagamento</Label>
                <Select
                  value={editData.forma_pagamento}
                  onValueChange={(value) =>
                    setEditData({ ...editData, forma_pagamento: value })
                  }
                >
                  <SelectTrigger id="edit_forma_pagamento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao-credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao-debito">Cartão de Débito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_frete">Frete (R$)</Label>
                <Input
                  id="edit_frete"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editData.frete}
                  onChange={(e) =>
                    setEditData({ ...editData, frete: Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit_observacoes">Observações</Label>
                <Textarea
                  id="edit_observacoes"
                  value={editData.observacoes}
                  onChange={(e) =>
                    setEditData({ ...editData, observacoes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetDetail;