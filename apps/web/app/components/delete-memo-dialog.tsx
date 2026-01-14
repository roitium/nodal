import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from '~/components/ui/dialog';
import { useDeleteMemo } from '~/hooks/use-queries';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface DeleteMemoDialogProps {
  memoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteMemoDialog({ memoId, open, onOpenChange }: DeleteMemoDialogProps) {
  const deleteMemoMutation = useDeleteMemo();

  const handleDelete = async () => {
    try {
      await deleteMemoMutation.mutateAsync(memoId);
      toast.success('Memo deleted successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to delete memo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Delete Memo</span>
          </DialogTitle>
        </DialogHeader>
        
        <DialogDescription className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this memo? This action cannot be undone.
          </p>
          <p className="text-sm text-destructive mt-2">
            All comments and associated files will also be deleted.
          </p>
        </DialogDescription>
        
        <DialogFooter className="sm:justify-end">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={deleteMemoMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleteMemoMutation.isPending}
          >
            {deleteMemoMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}