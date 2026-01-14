import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '~/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '~/hooks/use-queries';
import { CreateMemoDialog } from '~/components/create-memo-dialog';
import { EditMemoDialog } from '~/components/edit-memo-dialog';
import { DeleteMemoDialog } from '~/components/delete-memo-dialog';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { memosAPI } from '~/lib/api';
import { Markdown } from '~/components/markdown';
import { ImageGrid, SingleImage } from '~/components/image-grid';
import type { Memo, User, Resource, MemoParams } from '~/lib/api';
import type { AxiosResponse } from 'axios';
import type { ApiResponse, TimelineResponse } from '~/lib/api';
import { 
  MessageSquare, 
  CornerUpRight, 
  MoreHorizontal,
  Lock,
  Pin,
  Reply,
  Trash2,
  Edit3,
  Paperclip,
  FileText,
  Image as ImageIcon,
  User as UserIcon
} from 'lucide-react';

interface CommentItemProps {
  comment: Memo;
  depth?: number;
}

function CommentItem({ comment, depth = 0 }: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false);
  const { data: currentUser } = useUser();
  
  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isOwner = currentUser?.id === comment.userId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`${depth > 0 ? 'ml-4 mt-2' : 'mt-2'}`}>
      <Card className="border-l-2 border-primary shadow-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={comment.author.avatarUrl} alt={comment.author.username} />
                <AvatarFallback>{getInitials(comment.author.displayName || comment.author.username)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{comment.author.displayName || comment.author.username}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {comment.visibility === 'private' && <Lock className="h-3 w-3" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-1 px-3">
          <div className="text-sm">
            <Markdown content={comment.content} />
          </div>
          
          {comment.resources && comment.resources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {comment.resources.map((resource) => {
                const isImage = resource.type.startsWith('image/');
                return (
                  <div key={resource.id} className="inline-flex items-center">
                    {isImage ? (
                      <div className="flex items-center space-x-1">
                        <ImageIcon className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground truncate max-w-24">{resource.filename}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <FileText className="h-3 w-3" />
                        <span className="text-xs text-muted-foreground truncate max-w-24">{resource.filename}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-1 px-3 pb-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
              {isOwner && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            
            {hasReplies && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? '▼' : '▶'} {comment.replies?.length}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {hasReplies && showReplies && (
        <div className="mt-1">
          {comment.replies?.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface MemoCardProps {
  memo: Memo;
}

function MemoCard({ memo }: MemoCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: currentUser } = useUser();
  
  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isOwner = currentUser?.id === memo.userId;
  const hasReplies = memo.replies && memo.replies.length > 0;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow mb-2">
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={memo.author.avatarUrl} alt={memo.author.username} />
                <AvatarFallback>{getInitials(memo.author.displayName || memo.author.username)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{memo.author.displayName || memo.author.username}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {memo.visibility === 'private' && <Lock className="h-3 w-3 text-muted-foreground" />}
              {memo.isPinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-2 px-3">
          <div className="text-sm">
            <Markdown content={memo.content} />
          </div>
          
          {memo.resources && memo.resources.length > 0 && (
            <div className="mt-3">
              {(() => {
                const images = memo.resources.filter(r => r.type.startsWith('image/'));
                const files = memo.resources.filter(r => !r.type.startsWith('image/'));
                
                return (
                  <div>
                    {images.length > 0 && <ImageGrid images={images} />}
                    
                    {files.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {files.map((file) => (
                          <div key={file.id} className="flex items-center space-x-2 py-1">
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">{file.filename}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {memo.quotedMemo && (
            <div className="mt-3 p-2 bg-muted rounded-md border-l-2 border-primary">
              <div className="flex items-center space-x-1 mb-1">
                <CornerUpRight className="h-3 w-3 text-muted-foreground" />
                <div className="flex items-center space-x-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={memo.quotedMemo.author.avatarUrl} />
                    <AvatarFallback className="text-xs">{getInitials(memo.quotedMemo.author.displayName || memo.quotedMemo.author.username)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{memo.quotedMemo.author.displayName || memo.quotedMemo.author.username}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2">
                <Markdown content={memo.quotedMemo.content} />
              </div>
            </div>
          )}

          {hasReplies && showComments && (
            <div className="mt-3 pt-2 border-t">
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {memo.replies?.map((comment) => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-2 px-3 pb-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {hasReplies && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="h-6 px-2"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {memo.replies?.length}
                  {showComments && <span className="ml-1 text-xs">▼</span>}
                </Button>
              )}
            </div>
            
            {isOwner && (
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
      
      {editDialogOpen && (
        <EditMemoDialog 
          memo={memo} 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen} 
        />
      )}
      
      {deleteDialogOpen && (
        <DeleteMemoDialog 
          memoId={memo.id}
          open={deleteDialogOpen} 
          onOpenChange={setDeleteDialogOpen}
        />
      )}
    </>
  );
}

interface MemoTimelineProps {
  username?: string;
}

export function MemoTimeline({ username }: MemoTimelineProps) {
  const { data: currentUser } = useUser();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { 
    data: infiniteData, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['memos', 'timeline', username],
    queryFn: async ({ pageParam = undefined }) => {
      const cursor = pageParam ? {
        cursorCreatedAt: pageParam.createdAt,
        cursorId: pageParam.id
      } : undefined;
      
      const response: AxiosResponse<ApiResponse<TimelineResponse>> = await memosAPI.getTimeline({
        username,
        ...cursor,
        limit: 20
      });
      
      return response.data;
    },
    getNextPageParam: (lastPage: ApiResponse<TimelineResponse>) => {
      return lastPage.data.nextCursor ?? undefined;
    },
    initialPageParam: undefined,
  });

  const memos: Memo[] = infiniteData?.pages.flatMap(page => page.data.data ?? []) ?? [];

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading memos...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>Failed to load memos</p>
        <p className="text-sm mt-2 text-muted-foreground">Please ensure backend is running on http://localhost:3000</p>
        <p className="text-xs mt-2 text-muted-foreground">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {currentUser && (
        <div className="flex justify-end mb-3">
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <span className="mr-1">+</span> New Memo
          </Button>
        </div>
      )}
      
      <CreateMemoDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      <div className="space-y-2">
        {memos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No memos yet. {currentUser ? 'Create your first memo!' : 'Login to create memos.'}</p>
          </div>
        ) : (
          memos.map((memo) => (
            <MemoCard key={memo.id} memo={memo} />
          ))
        )}
      </div>
      
      {hasNextPage && (
        <div className="flex justify-center mt-3">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            size="sm"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}