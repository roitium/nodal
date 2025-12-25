import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Memo {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
  resources?: {
      id: string;
      externalLink: string;
      type: string;
  }[];
}

interface MemoCardProps {
  memo: Memo;
  currentUserId?: string;
  onDelete?: (id: string) => void;
}

export function MemoCard({ memo, currentUserId, onDelete }: MemoCardProps) {
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
          <span className="text-xs text-slate-400">
            {new Date(memo.createdAt).toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 whitespace-pre-wrap">
        {memo.content}
        {memo.resources && memo.resources.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
                {memo.resources.map(res => (
                    <div key={res.id}>
                        {res.type.startsWith('image/') ? (
                             <img src={res.externalLink} alt="Resource" className="rounded-md max-h-60 object-cover" />
                        ) : (
                            <a href={res.externalLink} target="_blank" className="text-blue-500 underline text-sm">View Attachment</a>
                        )}
                    </div>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
