import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { useUser, useCreateMemo } from '~/hooks/use-queries'
import { toast } from 'sonner'
import { FileUpload } from '~/components/file-upload'

interface CreateMemoData {
  content: string
  visibility: 'public' | 'private'
  resources?: string[]
}

interface CreateMemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateMemoDialog({ open, onOpenChange }: CreateMemoDialogProps) {
  const { data: currentUser } = useUser()
  const createMemoMutation = useCreateMemo()
  const [formData, setFormData] = useState<CreateMemoData>({
    content: '',
    visibility: 'public',
    resources: [],
  })
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; filename: string }>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content.trim()) return

    try {
      await createMemoMutation.mutateAsync({
        content: formData.content.trim(),
        visibility: formData.visibility,
        resources: formData.resources,
      })
      toast.success('Memo created successfully!')
      setFormData({ content: '', visibility: 'public', resources: [] })
      setUploadedFiles([])
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to create memo')
    }
  }

  const handleFilesUploaded = (fileIds: string[]) => {
    setFormData(prev => ({ ...prev, resources: fileIds }))
  }

  const handleRemoveFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      resources: prev.resources?.filter(id => id !== fileId) || []
    }))
  }

  if (!currentUser) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Memo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind?"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
              className="resize-none"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Attachments</Label>
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              uploadedFiles={uploadedFiles.map(file => ({ id: file.id, filename: file.filename }))}
              onRemoveFile={handleRemoveFile}
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <Label htmlFor="visibility">Visibility:</Label>
            <select
              id="visibility"
              value={formData.visibility}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                visibility: e.target.value as 'public' | 'private' 
              }))}
              className="rounded-md border border-input bg-background px-3 py-1"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMemoMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMemoMutation.isPending || !formData.content.trim()}
            >
              {createMemoMutation.isPending ? 'Creating...' : 'Create Memo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}