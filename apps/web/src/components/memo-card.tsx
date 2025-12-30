import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Trash2, Lock, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Memo } from "@/types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

interface MemoCardProps {
  memo: Memo;
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onCommentSuccess?: () => void;
}

export function MemoCard({ memo, currentUserId, onDelete, onCommentSuccess }: MemoCardProps) {
  const { token } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComment = async () => {
    if (!comment.trim() || !token) return;
    setIsSubmitting(true);
    try {
      await apiFetch("/api/v1/memos/publish", {
        method: "POST",
        token,
        body: JSON.stringify({
          content: comment,
          parentId: memo.id,
          visibility: memo.visibility, // Match parent's visibility by default
        }),
      });
      setComment("");
      setShowReply(false);
      if (onCommentSuccess) onCommentSuccess();
    } catch (error) {
      console.error("Failed to post comment:", error);
      alert("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4 pb-2">
        <Avatar>
          <AvatarImage src={memo.author.avatarUrl} alt={memo.author.username} />
          <AvatarFallback>{memo.author.username[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{memo.author.displayName || memo.author.username}</span>
              <span className="text-sm text-slate-500">@{memo.author.username}</span>
            </div>
            <div className="flex items-center gap-2">
              {memo.visibility === "private" && (
                <Lock className="h-3 w-3 text-slate-400" title="Private" />
              )}
              {currentUserId === memo.userId && onDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this memo?")) {
                      onDelete(memo.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {new Date(memo.createdAt).toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 whitespace-pre-wrap">
        <div className="mb-2">
            {memo.content}
        </div>
        {memo.resources && memo.resources.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
                {memo.resources.map(res => (
                    <div key={res.id}>
                        {res.type.startsWith('image/') ? (
                             <img src={res.externalLink} alt="Resource" className="rounded-md max-h-60 object-cover" />
                        ) : (
                            <a href={res.externalLink} target="_blank" rel="noreferrer" className="text-blue-500 underline text-sm">View Attachment</a>
                        )}
                    </div>
                ))}
            </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex flex-col items-stretch">
        {token && (
            <div className="flex justify-start">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-slate-500 gap-1.5"
                    onClick={() => setShowReply(!showReply)}
                >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs">Reply</span>
                </Button>
            </div>
        )}

        {showReply && (
            <div className="mt-3 flex flex-col gap-2">
                <Textarea 
                    placeholder="Write a reply..."
                    className="min-h-[60px] text-sm resize-none"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end">
                    <Button 
                        size="sm" 
                        className="h-8 gap-1.5" 
                        disabled={!comment.trim() || isSubmitting}
                        onClick={handleComment}
                    >
                        <Send className="h-3.5 w-3.5" />
                        <span>{isSubmitting ? "Sending..." : "Send"}</span>
                    </Button>
                </div>
            </div>
        )}

        {memo.replies && memo.replies.length > 0 && (
            <div className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4">
                {memo.replies.map(reply => (
                    <div key={reply.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{reply.author.displayName || reply.author.username}</span>
                            <span className="text-xs text-slate-400">{new Date(reply.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap">{reply.content}</div>
                    </div>
                ))}
            </div>
        )}
      </CardFooter>
    </Card>
  );
}
