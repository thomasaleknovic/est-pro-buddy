import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp, FileText, DollarSign, Calendar } from "lucide-react";
import { startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, subDays, subWeeks, subMonths, subYears, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "day" | "week" | "month" | "year";

interface Budget {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [budgets, setBudgets] = useState<Budget[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [period]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    await fetchBudgets();
  };

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (period) {
      case "day":
        start = subDays(now, 30);
        break;
      case "week":
        start = subWeeks(now, 12);
        break;
      case "month":
        start = subMonths(now, 12);
        break;
      case "year":
        start = subYears(now, 5);
        break;
    }

    return { start, end };
  };

  const fetchBudgets = async () => {
    setLoading(true);
    const { start, end } = getDateRange();

    const { data, error } = await supabase
      .from("budgets")
      .select("id, total, status, created_at")
      .is("deleted_at", null)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching budgets:", error);
    } else {
      setBudgets(data || []);
    }
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getChartData = () => {
    const { start, end } = getDateRange();
    let intervals: Date[];

    switch (period) {
      case "day":
        intervals = eachDayOfInterval({ start, end });
        break;
      case "week":
        intervals = eachWeekOfInterval({ start, end });
        break;
      case "month":
        intervals = eachMonthOfInterval({ start, end });
        break;
      case "year":
        intervals = eachYearOfInterval({ start, end });
        break;
    }

    return intervals.map(date => {
      let periodStart: Date;
      let periodEnd: Date;

      switch (period) {
        case "day":
          periodStart = date;
          periodEnd = date;
          break;
        case "week":
          periodStart = startOfWeek(date, { locale: ptBR });
          periodEnd = endOfWeek(date, { locale: ptBR });
          break;
        case "month":
          periodStart = startOfMonth(date);
          periodEnd = endOfMonth(date);
          break;
        case "year":
          periodStart = startOfYear(date);
          periodEnd = endOfYear(date);
          break;
      }

      const periodBudgets = budgets.filter(b => {
        const budgetDate = new Date(b.created_at);
        return budgetDate >= periodStart && budgetDate <= periodEnd;
      });

      const total = periodBudgets.reduce((sum, b) => sum + Number(b.total), 0);
      const count = periodBudgets.length;

      let label: string;
      switch (period) {
        case "day":
          label = format(date, "dd/MM", { locale: ptBR });
          break;
        case "week":
          label = `${format(periodStart, "dd/MM", { locale: ptBR })}`;
          break;
        case "month":
          label = format(date, "MMM/yy", { locale: ptBR });
          break;
        case "year":
          label = format(date, "yyyy", { locale: ptBR });
          break;
      }

      return {
        date: label,
        total,
        count,
        average: count > 0 ? total / count : 0,
      };
    });
  };

  const getStatusData = () => {
    const statusCount = budgets.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status === "draft" ? "Rascunho" : "Aprovado",
      value: count,
    }));
  };

  const getTotalRevenue = () => budgets.reduce((sum, b) => sum + Number(b.total), 0);
  const getAverageValue = () => budgets.length > 0 ? getTotalRevenue() / budgets.length : 0;
  const getTotalCount = () => budgets.length;

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const chartData = getChartData();
  const statusData = getStatusData();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Analytics</h1>
              <p className="text-muted-foreground">Visualize o desempenho dos seus orçamentos</p>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <TabsList>
                <TabsTrigger value="day">Dias</TabsTrigger>
                <TabsTrigger value="week">Semanas</TabsTrigger>
                <TabsTrigger value="month">Meses</TabsTrigger>
                <TabsTrigger value="year">Anos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getTotalCount()}</div>
                <p className="text-xs text-muted-foreground">orçamentos criados no período</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getAverageValue())}</div>
                <p className="text-xs text-muted-foreground">média por orçamento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getTotalRevenue())}</div>
                <p className="text-xs text-muted-foreground">soma de todos os orçamentos</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quantidade de Orçamentos</CardTitle>
                <CardDescription>Orçamentos criados por período</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Receita por Período</CardTitle>
                <CardDescription>Valor total dos orçamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valor Médio por Período</CardTitle>
                <CardDescription>Ticket médio dos orçamentos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status dos Orçamentos</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;
