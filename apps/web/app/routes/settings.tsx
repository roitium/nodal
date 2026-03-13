import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Route } from "./+types/settings";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Nodal" },
    { name: "description", content: "Manage your Nodal preferences." },
  ];
}

export default function SettingsRoute() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("sidebar.settings")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.preferences")}</CardTitle>
          <CardDescription>{t("settings.preferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select 
              value={i18n.language.startsWith("zh") ? "zh" : "en"} 
              onValueChange={(val) => i18n.changeLanguage(val)}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder={t("settings.selectLanguage")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <Select 
              value={theme} 
              onValueChange={setTheme}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder={t("settings.selectTheme")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}