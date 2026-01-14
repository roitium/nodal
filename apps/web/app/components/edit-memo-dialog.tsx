import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { useUser, useUpdateMemo } from '~/hooks/use-queries';
import { toast } from 'sonner';
import { FileUpload } from '~/components/file-upload';
import { Markdown } from '~/components/markdown';
import { ImageGrid } from '~/components/image-grid';
import { Paperclip, Image as ImageIcon, FileText } from 'lucide-react';
import type { Memo } from '~/lib/api';

interface EditMemoDialogProps {
  memo: Memo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemoDialog({ memo, open, onOpenChange }: EditMemoDialogProps) {
  const { data: currentUser } = useUser();
  const updateMemoMutation = useUpdateMemo();
  const [content, setContent] = useState(memo.content);
  const [visibility, setVisibility] = useState<'public' | 'private'>(memo.visibility);
  const [uploadedImageIds, setUploadedImageIds] = useState<string[]>(
    memo.resources?.filter(r => r.type.startsWith('image/')).map(r => r.id) || []
  );
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>(
    memo.resources?.filter(r => !r.type.startsWith('image/')).map(r => r.id) || []
  );

  if (!currentUser || currentUser.id !== memo.userId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    try {
      await updateMemoMutation.mutateAsync({
        id: memo.id,
        data: {
          content: content.trim(),
          visibility,
          resources: [...uploadedImageIds, ...uploadedFileIds],
        },
      });
      toast.success('Memo updated successfully!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update memo');
    }
  };

  const handleImagesUploaded = (fileIds: string[]) => {
    setUploadedImageIds(prev => [...prev, ...fileIds]);
  };

  const handleFilesUploaded = (fileIds: string[]) => {
    setUploadedFileIds(prev => [...prev, ...fileIds]);
  };

  const handleRemoveImage = (imageId: string) => {
    setUploadedImageIds(prev => prev.filter(id => id !== imageId));
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFileIds(prev => prev.filter(id => id !== fileId));
  };

  const allResources = [...(memo.resources || [])];
  const currentImages = allResources.filter(r => r.type.startsWith('image/') && (uploadedImageIds.includes(r.id) || !memo.resources?.some(mr => mr.id === r.id)));
  const currentFiles = allResources.filter(r => !r.type.startsWith('image/') && (uploadedFileIds.includes(r.id) || !memo.resources?.some(mr => mr.id === r.id)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Memo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
              placeholder="What's on your mind?"
            />
            <div className="text-xs text-muted-foreground">
              Preview:
              <div className="mt-1 p-2 bg-muted rounded border max-h-32 overflow-y-auto">
                <Markdown content={content} />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Images</Label>
              {currentImages.length > 0 && (
                <div className="mb-2">
                  <ImageGrid images={currentImages} />
                </div>
              )}
              <FileUpload
                onFilesUploaded={handleImagesUploaded}
                uploadedFiles={currentImages.map(img => ({ id: img.id, filename: img.filename }))}
                onRemoveFile={handleRemoveImage}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Files</Label>
              {currentFiles.length > 0 && (
                <div className="space-y-1 mb-2">
                  {currentFiles.map((file) => (
                    <div key={file.id} className="flex items-center space-x-2 py-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">{file.filename}</span>
                    </div>
                  ))}
                </div>
              )}
              <FileUpload
                onFilesUploaded={handleFilesUploaded}
                uploadedFiles={currentFiles.map(file => ({ id: file.id, filename: file.filename }))}
                onRemoveFile={handleRemoveFile}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Label htmlFor="visibility">Visibility:</Label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              className="text-sm rounded-md border border-input bg-background px-2 py-1"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMemoMutation.isPending}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMemoMutation.isPending || content === memo.content}
              size="sm"
            >
              {updateMemoMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}