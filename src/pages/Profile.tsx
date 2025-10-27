import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
  cpf_cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  logo_url: string | null;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    cpf_cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    logo_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setProfile({
        full_name: data.full_name,
        cpf_cnpj: data.cpf_cnpj,
        telefone: data.telefone,
        email: data.email,
        endereco: data.endereco,
        logo_url: data.logo_url,
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        cpf_cnpj: profile.cpf_cnpj,
        telefone: profile.telefone,
        email: profile.email,
        endereco: profile.endereco,
        logo_url: profile.logo_url,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Erro ao salvar perfil",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/logo.${fileExt}`;

    // Delete old logo if exists
    if (profile.logo_url) {
      const oldPath = profile.logo_url.split("/").pop();
      if (oldPath) {
        await supabase.storage.from("logos").remove([`${user.id}/${oldPath}`]);
      }
    }

    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Erro ao fazer upload",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("logos")
      .getPublicUrl(fileName);

    // Save to database immediately
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: publicUrl })
      .eq("user_id", user.id);

    if (updateError) {
      toast({
        title: "Erro ao salvar logo",
        description: updateError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    setProfile({ ...profile, logo_url: publicUrl });
    setUploading(false);
    
    toast({
      title: "Logo atualizado!",
      description: "Seu logo foi salvo com sucesso.",
    });
  };

  const handleRemoveLogo = async () => {
    if (!user || !profile.logo_url) return;

    const fileName = profile.logo_url.split("/").pop();
    if (!fileName) return;

    const { error: deleteError } = await supabase.storage
      .from("logos")
      .remove([`${user.id}/${fileName}`]);

    if (deleteError) {
      toast({
        title: "Erro ao remover logo",
        description: deleteError.message,
        variant: "destructive",
      });
      return;
    }

    // Save to database immediately
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: null })
      .eq("user_id", user.id);

    if (updateError) {
      toast({
        title: "Erro ao atualizar perfil",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    setProfile({ ...profile, logo_url: null });
    toast({
      title: "Logo removido!",
      description: "Seu logo foi removido com sucesso.",
    });
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

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-3xl font-bold mb-8">Meu Perfil</h2>

        <form onSubmit={handleSave}>
          <Card className="shadow-card mb-6">
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo da Empresa</Label>
                {profile.logo_url ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={profile.logo_url}
                      alt="Logo"
                      className="h-20 w-20 object-contain border rounded"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="max-w-xs"
                    />
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Nome da Empresa</Label>
                <Input
                  id="full_name"
                  value={profile.full_name || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, full_name: e.target.value })
                  }
                  placeholder="Sua Empresa Ltda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input
                  id="cpf_cnpj"
                  value={profile.cpf_cnpj || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, cpf_cnpj: e.target.value })
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={profile.telefone || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, telefone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, email: e.target.value })
                  }
                  placeholder="contato@suaempresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Input
                  id="endereco"
                  value={profile.endereco || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, endereco: e.target.value })
                  }
                  placeholder="Rua, número, bairro, cidade - UF"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
