import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Switch } from "~/components/ui/switch";
import { toast } from "sonner";
import {
  Search,
  Edit2,
  Trash2,
  Shield,
  UserX,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { client } from "~/lib/rpc";
import { useUser } from "~/hooks/queries/use-user";
import type { Route } from "./+types/admin.users";

interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  banned: boolean;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UpdateUserData {
  isAdmin?: boolean;
  banned?: boolean;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
}

interface UsersResponse {
  data: {
    users: User[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Users - Admin - Nodal" },
    { name: "description", content: "Manage users in Nodal." },
  ];
}

export default function AdminUsersRoute() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: currentUser } = useUser();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isAdminFilter, setIsAdminFilter] = useState<boolean | undefined>(undefined);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [banningUser, setBanningUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["admin-users", page, debouncedSearch, isAdminFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }
      if (isAdminFilter !== undefined) {
        params.append("isAdmin", String(isAdminFilter));
      }

      const response = await client.api.v1.admin.users.$get({
        query: Object.fromEntries(params),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Failed to fetch users");
      }
      return result as UsersResponse;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }) => {
      const response = await client.api.v1.admin.users[":id"].$patch({
        param: { id },
        json: data,
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Failed to update user");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("admin.userUpdated", "User updated successfully"));
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("admin.updateFailed", "Failed to update user"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await client.api.v1.admin.users[":id"].$delete({
        param: { id },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("admin.userDeleted", "User deleted successfully"));
      setDeletingUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("admin.deleteFailed", "Failed to delete user"));
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, banned }: { id: string; banned: boolean }) => {
      const response = await client.api.v1.admin.users[":id"].$patch({
        param: { id },
        json: { banned },
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error ?? "Failed to update user");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        banningUser?.banned
          ? t("admin.userEnabled", "User enabled successfully")
          : t("admin.userBanned", "User banned successfully")
      );
      setBanningUser(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || t("admin.banFailed", "Failed to update user status"));
    },
  });

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      isAdmin: formData.get("isAdmin") === "on",
      displayName: (formData.get("displayName") as string)?.trim() || undefined,
      bio: (formData.get("bio") as string)?.trim() || undefined,
      avatarUrl: (formData.get("avatarUrl") as string)?.trim() || undefined,
      coverImageUrl: (formData.get("coverImageUrl") as string)?.trim() || undefined,
      banned: formData.get("banned") === "on",
    };

    updateMutation.mutate({ id: editingUser.id, data });
  };

  const handleBanConfirm = () => {
    if (!banningUser) return;
    banMutation.mutate({ id: banningUser.id, banned: !banningUser.banned });
  };

  const handleDeleteConfirm = () => {
    if (!deletingUser) return;
    deleteMutation.mutate(deletingUser.id);
  };

  const isSelfAction = (userId: string) => currentUser?.id === userId;

  const users = data?.data?.users ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="stagger-fade space-y-6 pb-20">
      <div className="mb-4 md:mb-6">
        <h1 className="app-heading text-2xl font-semibold">
          {t("admin.users", "Users")}
        </h1>
      </div>

      <Card className="surface-card rounded-2xl border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t("admin.manageUsers", "Manage Users")}</CardTitle>
          <CardDescription>
            {t("admin.manageUsersDesc", "View, edit, and manage user accounts.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("admin.searchUsers", "Search users...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="search-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="admin-filter" className="text-sm">
                {t("admin.adminOnly", "Admin only")}
              </Label>
              <Switch
                id="admin-filter"
                checked={isAdminFilter === true}
                onCheckedChange={(checked) => {
                  setIsAdminFilter(checked ? true : undefined);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.username", "Username")}</TableHead>
                  <TableHead>{t("admin.email", "Email")}</TableHead>
                  <TableHead>{t("admin.role", "Role")}</TableHead>
                  <TableHead>{t("admin.status", "Status")}</TableHead>
                  <TableHead>{t("admin.createdAt", "Created")}</TableHead>
                  <TableHead className="text-right">
                    {t("admin.actions", "Actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">
                          {t("admin.loading", "Loading...")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <span className="text-muted-foreground">
                        {t("admin.noUsers", "No users found.")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        {user.isAdmin ? (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {t("admin.admin", "Admin")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {t("admin.user", "User")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive" className="gap-1">
                            <UserX className="h-3 w-3" />
                            {t("admin.banned", "Banned")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 dark:text-green-400">
                            {t("admin.active", "Active")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingUser(user)}
                            disabled={isSelfAction(user.id)}
                            title={t("admin.edit", "Edit")}
                            data-testid="edit-button"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setBanningUser(user)}
                            disabled={isSelfAction(user.id)}
                            title={user.banned ? t("admin.enable", "Enable") : t("admin.ban", "Ban")}
                            data-testid="ban-button"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeletingUser(user)}
                            disabled={isSelfAction(user.id)}
                            title={t("admin.delete", "Delete")}
                            className="text-destructive hover:text-destructive"
                            data-testid="delete-button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("admin.pageOf", "Page {{page}} of {{total}}", {
                  page: pagination.page,
                  total: pagination.totalPages,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUser", "Edit User")}</DialogTitle>
            <DialogDescription>
              {t("admin.editUserDesc", "Update user information and permissions.")}
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">{t("admin.username", "Username")}</Label>
                <Input id="edit-username" value={editingUser.username} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">{t("admin.email", "Email")}</Label>
                <Input id="edit-email" value={editingUser.email} disabled />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-isAdmin"
                  name="isAdmin"
                  defaultChecked={editingUser.isAdmin}
                  disabled={isSelfAction(editingUser.id)}
                />
                <Label htmlFor="edit-isAdmin">{t("admin.isAdmin", "Is Admin")}</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayName">{t("admin.displayName", "Display Name")}</Label>
                <Input
                  id="edit-displayName"
                  name="displayName"
                  defaultValue={editingUser.displayName ?? ""}
                  placeholder={t("admin.displayNamePlaceholder", "Display name")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bio">{t("admin.bio", "Bio")}</Label>
                <Textarea
                  id="edit-bio"
                  name="bio"
                  defaultValue={editingUser.bio ?? ""}
                  placeholder={t("admin.bioPlaceholder", "User bio")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-avatarUrl">{t("admin.avatarUrl", "Avatar URL")}</Label>
                <Input
                  id="edit-avatarUrl"
                  name="avatarUrl"
                  defaultValue={editingUser.avatarUrl ?? ""}
                  placeholder="https://example.com/avatar.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-coverImageUrl">{t("admin.coverImageUrl", "Cover Image URL")}</Label>
                <Input
                  id="edit-coverImageUrl"
                  name="coverImageUrl"
                  defaultValue={editingUser.coverImageUrl ?? ""}
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-banned"
                  name="banned"
                  defaultChecked={editingUser.banned}
                  disabled={isSelfAction(editingUser.id)}
                />
                <Label htmlFor="edit-banned">{t("admin.banned", "Banned")}</Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  {t("admin.cancel", "Cancel")}
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("admin.saving", "Saving...")}
                    </>
                  ) : (
                    t("admin.save", "Save")
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!banningUser} onOpenChange={(open) => !open && setBanningUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banningUser?.banned
                ? t("admin.enableUser", "Enable User")
                : t("admin.banUser", "Ban User")}
            </DialogTitle>
            <DialogDescription>
              {banningUser?.banned
                ? t("admin.enableConfirm", "Are you sure you want to enable {{username}}?", {
                    username: banningUser?.username,
                  })
                : t("admin.banConfirm", "Are you sure you want to ban {{username}}? They will not be able to access their account.", {
                    username: banningUser?.username,
                  })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanningUser(null)}>
              {t("admin.cancel", "Cancel")}
            </Button>
            <Button
              variant={banningUser?.banned ? "default" : "destructive"}
              onClick={handleBanConfirm}
              disabled={banMutation.isPending}
            >
              {banMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("admin.processing", "Processing...")}
                </>
              ) : banningUser?.banned ? (
                t("admin.enable", "Enable")
              ) : (
                t("admin.ban", "Ban")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {t("admin.deleteUser", "Delete User")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "admin.deleteConfirm",
                "Are you sure you want to delete {{username}}? This action cannot be undone. All their memos and resources will be permanently deleted.",
                { username: deletingUser?.username }
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>
              {t("admin.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("admin.deleting", "Deleting...")}
                </>
              ) : (
                t("admin.delete", "Delete")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}