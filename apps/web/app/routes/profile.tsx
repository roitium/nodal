import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { useTranslation } from "react-i18next";
import { useUser } from "~/hooks/queries/use-user";
import { useUpdateProfile } from "~/hooks/mutations/use-update-profile";
import type { Route } from "./+types/profile";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - Nodal" },
    { name: "description", content: "Manage your Nodal profile." },
  ];
}

export default function ProfileRoute() {
  const { t } = useTranslation();
  const { data: user } = useUser();
  const updateProfileMutation = useUpdateProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    setAvatarUrl(user.avatarUrl ?? "");
    setCoverImageUrl(user.coverImageUrl ?? "");
    setBio(user.bio ?? "");
  }, [user]);

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      displayName !== (user.displayName ?? "") ||
      avatarUrl !== (user.avatarUrl ?? "") ||
      coverImageUrl !== (user.coverImageUrl ?? "") ||
      bio !== (user.bio ?? "")
    );
  }, [avatarUrl, bio, coverImageUrl, displayName, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await updateProfileMutation.mutateAsync({
      displayName: displayName.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      bio: bio.trim() || undefined,
    });
  };

  return (
    <div className="stagger-fade space-y-6 pb-20">
      <div className="mb-4 md:mb-6">
        <h1 className="app-heading text-2xl font-semibold">{t("profile.title")}</h1>
      </div>

      <Card className="surface-card rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("profile.editTitle")}</CardTitle>
          <CardDescription>{t("profile.editDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("profile.username")}</Label>
              <Input id="username" value={user?.username ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("profile.email")}</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">{t("profile.displayName")}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("profile.displayNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">{t("profile.avatarUrl")}</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coverImageUrl">{t("profile.coverImageUrl")}</Label>
              <Input
                id="coverImageUrl"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">{t("profile.bio")}</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t("profile.bioPlaceholder")}
                rows={4}
              />
            </div>

            <Button
              type="submit"
              disabled={!hasChanges || updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending
                ? t("profile.saving")
                : t("profile.save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
