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

const settingGroups = {
  system: {
    title: "System",
    description: "Core application settings",
    keys: ["ROOT_DOMAIN"],
  },
  supabase: {
    title: "Storage (Supabase)",
    description: "Supabase storage configuration",
    keys: ["STORAGE_PROVIDER", "SUPABASE_URL", "STORAGE_BUCKET", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  s3: {
    title: "Storage (S3/R2)",
    description: "S3 or Cloudflare R2 storage configuration",
    keys: ["S3_ENDPOINT", "S3_PUBLIC_URL", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
  },
};

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
      toast.success(t("admin.settingsUpdated", "Settings updated successfully"));
      setIsDialogOpen(false);
      setEditingSetting(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("admin.updateFailed", "Failed to update setting"));
    },
  });

  const handleEdit = (setting: Setting) => {
    if (immutableKeys.has(setting.key)) {
      toast.error(t("admin.cannotEdit", "This setting cannot be edited"));
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

  const getSettingsByGroup = (groupKey: keyof typeof settingGroups) => {
    if (!settings) return [];
    const groupKeys = settingGroups[groupKey].keys;
    return settings.filter((s) => groupKeys.includes(s.key));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("admin.never", "Never");
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
        <p className="text-destructive">{t("admin.loadError", "Failed to load settings")}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-settings"] })}
        >
          {t("admin.retry", "Retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="stagger-fade space-y-6 pb-20">
      <div className="mb-4 md:mb-6">
        <h1 className="app-heading text-2xl font-semibold">
          {t("admin.settings", "Settings")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("admin.settingsDesc", "Manage application configuration")}
        </p>
      </div>

      {(Object.keys(settingGroups) as Array<keyof typeof settingGroups>).map((groupKey) => {
        const group = settingGroups[groupKey];
        const groupSettings = getSettingsByGroup(groupKey);

        return (
          <Card key={groupKey} className="surface-card rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>{t(`admin.group${groupKey}`, group.title)}</CardTitle>
              <CardDescription>{t(`admin.group${groupKey}Desc`, group.description)}</CardDescription>
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
                            {t("admin.secret", "Secret")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {setting.value || t("admin.notSet", "Not set")}
                      </p>
                      {setting.description && (
                        <p className="text-xs text-muted-foreground/70">{setting.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground/50">
                        {t("admin.lastUpdated", "Last updated")}: {formatDate(setting.updated_at)}
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
                      {t("admin.edit", "Edit")}
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
              {t("admin.editSetting", "Edit Setting")}: {editingSetting?.key}
            </DialogTitle>
            <DialogDescription>
              {editingSetting?.is_secret
                ? t("admin.secretWarning", "This is a secret value. Enter a new value to update it.")
                : t("admin.enterValue", "Enter a new value for this setting.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="value">{t("admin.value", "Value")}</Label>
              <Input
                id="value"
                type={editingSetting?.is_secret ? "password" : "text"}
                placeholder={t("admin.enterNewValue", "Enter new value")}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setValidationError(null);
                }}
                data-testid={`input-${editingSetting?.key}`}
              />
              {editingSetting?.key === "STORAGE_PROVIDER" && (
                <p className="text-xs text-muted-foreground">
                  {t("admin.storageProviderHint", "Must be one of: supabase, s3, r2")}
                </p>
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
                {t("admin.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="save-button">
                {updateMutation.isPending
                  ? t("admin.saving", "Saving...")
                  : t("admin.save", "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}