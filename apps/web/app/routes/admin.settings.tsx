import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";
import { client } from "~/lib/rpc";
import type { Route } from "./+types/admin.settings";

interface Setting {
  key: string;
  value: string;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
  updated_by: string | null;
}

const getSettingGroups = (t: (key: string) => string) => ({
  system: {
    title: t("admin.settings.groups.system"),
    description: t("admin.settings.groups.systemDesc"),
    keys: ["ROOT_DOMAIN", "STORAGE_PROVIDER", "STORAGE_BUCKET"],
  },
  supabase: {
    title: t("admin.settings.groups.supabase"),
    description: t("admin.settings.groups.supabaseDesc"),
    keys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  s3: {
    title: t("admin.settings.groups.s3"),
    description: t("admin.settings.groups.s3Desc"),
    keys: ["S3_ENDPOINT", "S3_PUBLIC_URL", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  },
});

const immutableKeys = new Set(["DATABASE_URL", "JWT_SECRET"]);

function validateValue(key: string, value: string): string | null {
  if (value === "") {
    const nonEmptyKeys = ["STORAGE_BUCKET", "SUPABASE_SERVICE_ROLE_KEY", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
    if (nonEmptyKeys.includes(key)) {
      return "Value cannot be empty";
    }
    return null;
  }

  switch (key) {
    case "ROOT_DOMAIN": {
      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(:\d+)?$/;
      if (!domainRegex.test(value)) {
        return "Invalid domain format";
      }
      break;
    }
    case "STORAGE_PROVIDER": {
      if (!["supabase", "s3", "r2"].includes(value)) {
        return "Must be one of: supabase, s3, r2";
      }
      break;
    }
    case "SUPABASE_URL":
    case "S3_ENDPOINT":
    case "S3_PUBLIC_URL": {
      try {
        new URL(value);
      } catch {
        return "Invalid URL format";
      }
      break;
    }
  }

  return null;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Admin - Nodal" },
    { name: "description", content: "Manage application settings." },
  ];
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const response = await client.api.v1.admin.settings.$get();
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Failed to fetch settings");
      }
      return data.data as Setting[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      const response = await client.api.v1.admin.settings.$patch({
        json: { settings: [data] },
      });
      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error ?? "Failed to update setting");
      }
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("admin.settings.messages.updated"));
      setIsDialogOpen(false);
      setEditingSetting(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("admin.settings.messages.updateFailed"));
    },
  });

  const handleEdit = (setting: Setting) => {
    if (immutableKeys.has(setting.key)) {
      toast.error(t("admin.settings.messages.cannotEdit"));
      return;
    }
    setEditingSetting(setting);
    setInputValue("");
    setValidationError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;

    const error = validateValue(editingSetting.key, inputValue);
    if (error) {
      setValidationError(error);
      return;
    }

    updateMutation.mutate({
      key: editingSetting.key,
      value: inputValue,
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSetting(null);
    setInputValue("");
    setValidationError(null);
  };

  const settingGroups = getSettingGroups(t);

  const getSettingsByGroup = (groupKey: keyof ReturnType<typeof getSettingGroups>) => {
    if (!settings) return [];
    const groupKeys = settingGroups[groupKey].keys;
    return settings.filter((s) => groupKeys.includes(s.key));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("admin.settings.messages.never");
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{t("admin.settings.messages.loadError")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-settings"] })}
        >
          {t("admin.settings.actions.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="stagger-fade space-y-6 pb-20">
      <div className="mb-4 md:mb-6">
        <h1 className="app-heading text-2xl font-semibold">
          {t("admin.settings.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("admin.settings.description")}
        </p>
      </div>

      {(Object.keys(settingGroups) as Array<keyof ReturnType<typeof getSettingGroups>>).map((groupKey) => {
        const group = settingGroups[groupKey];
        const groupSettings = getSettingsByGroup(groupKey);

        return (
          <Card key={groupKey} className="surface-card rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{group.title}</CardTitle>
              <CardDescription>{group.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupSettings.map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border/50 p-4"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">{setting.key}</Label>
                        {setting.is_secret && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {t("admin.settings.messages.secret")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {setting.value || t("admin.settings.messages.notSet")}
                      </p>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground/70">{setting.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/50">
                        {t("admin.settings.messages.lastUpdated")}: {formatDate(setting.updated_at)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(setting)}
                      disabled={immutableKeys.has(setting.key)}
                      data-testid={`edit-${setting.key}`}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      {t("admin.settings.actions.edit")}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.settings.messages.editSetting")}: {editingSetting?.key}
            </DialogTitle>
            <DialogDescription>
              {editingSetting?.is_secret
                ? t("admin.settings.messages.secretWarning")
                : t("admin.settings.messages.enterValue")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">{t("admin.settings.messages.value")}</Label>
              {editingSetting?.key === "STORAGE_PROVIDER" ? (
                <select
                  id="value"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setValidationError(null);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid={`input-${editingSetting?.key}`}
                >
                  <option value="">{t("admin.settings.messages.selectProvider")}</option>
                  <option value="supabase">Supabase</option>
                  <option value="s3">S3</option>
                  <option value="r2">R2</option>
                </select>
              ) : (
                <Input
                  id="value"
                  type={editingSetting?.is_secret ? "password" : "text"}
                  placeholder={t("admin.settings.messages.enterNewValue")}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setValidationError(null);
                  }}
                  data-testid={`input-${editingSetting?.key}`}
                />
              )}
              {validationError && (
                <p className="text-sm text-destructive">{validationError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                {t("admin.settings.actions.cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="save-button">
                {updateMutation.isPending
                  ? t("admin.settings.actions.saving")
                  : t("admin.settings.actions.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}