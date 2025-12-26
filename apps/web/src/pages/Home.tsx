import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MemoCard } from "@/components/memo-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paperclip, X, Lock, Globe } from "lucide-react";
import { Memo, Resource, UploadUrlResponse, ApiResponse } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const { user, token } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const fetchMemos = async () => {
    try {
      const data = await apiFetch<ApiResponse<Memo[]>>(
        "/api/v1/memos/timeline?limit=10",
        {
          token: token ?? undefined,
        }
      );
      setMemos(data.data);
    } catch (error) {
      console.error("Failed to fetch memos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemos();
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const ext = file.name.split(".").pop();

    if (!ext) {
      alert("Invalid file extension");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get Upload URL
      const { uploadUrl, path } = await apiFetch<UploadUrlResponse>(
        `/api/v1/resources/upload-url?fileType=${encodeURIComponent(
          file.type
        )}&ext=${encodeURIComponent(ext)}`,
        {
          token: token!,
        }
      );

      // 2. Upload File
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      // 3. Record Upload
      const resource = await apiFetch<Resource>(
        "/api/v1/resources/record-upload",
        {
          method: "POST",
          token: token!,
          body: JSON.stringify({
            path,
            fileType: file.type,
            fileSize: file.size,
            filename: file.name,
          }),
        }
      );

      setResources((prev) => [...prev, resource]);
    } catch (error) {
      console.error("Upload failed", error);
      alert("File upload failed");
    } finally {
      setIsUploading(false);
      // Clear input value to allow selecting the same file again if needed
      e.target.value = "";
    }
  };

  const removeResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePost = async () => {
    if (!content.trim() && resources.length === 0) return;
    setIsPosting(true);
    try {
      await apiFetch("/api/v1/memos/publish", {
        method: "POST",
        token: token!,
        body: JSON.stringify({
          content,
          visibility,
          resources: resources.map((r) => r.id),
        }),
      });
      setContent("");
      setResources([]);
      setVisibility("public");
      fetchMemos(); // Refresh list
    } catch (error) {
      console.error("Failed to post memo:", error);
      alert("Failed to post memo");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/v1/memos/${id}`, {
        method: "DELETE",
        token: token!,
      });
      fetchMemos(); // Refresh list
    } catch (error) {
      console.error("Failed to delete memo:", error);
      alert("Failed to delete memo");
    }
  };

  return (
    <main className="container max-w-2xl py-6 mx-auto">
      {user && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <Textarea
              placeholder="What's on your mind?"
              className="mb-4 resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            {resources.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {resources.map((res) => (
                  <div key={res.id} className="relative group">
                    {res.type.startsWith("image/") ? (
                      <img
                        src={res.externalLink}
                        alt="preview"
                        className="h-20 w-20 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="h-20 w-20 flex items-center justify-center bg-slate-100 rounded-md border text-xs text-center p-1 overflow-hidden break-all">
                        {res.filename}
                      </div>
                    )}
                    <button
                      onClick={() => removeResource(res.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="cursor-pointer"
                  >
                    <span>
                      <Paperclip className="h-4 w-4" />
                    </span>
                  </Button>
                </label>

                <Select
                  value={visibility}
                  onValueChange={(v: "public" | "private") => setVisibility(v)}
                >
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        <span>Public</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Private</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handlePost}
                disabled={
                  isPosting ||
                  isUploading ||
                  (!content.trim() && resources.length === 0)
                }
              >
                {isPosting
                  ? "Posting..."
                  : isUploading
                  ? "Uploading..."
                  : "Post"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : memos.length > 0 ? (
                    memos.map((memo) => (
                      <MemoCard 
                        key={memo.id} 
                        memo={memo} 
                        currentUserId={user?.id}
                        onDelete={handleDelete}
                        onCommentSuccess={fetchMemos}
                      />
                    ))        ) : (
          <div className="text-center text-slate-500">No memos found.</div>
        )}
      </div>
    </main>
  );
}
