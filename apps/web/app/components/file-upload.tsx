import { useState, useCallback } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { useGetUploadUrl, useRecordUpload } from '~/hooks/use-queries'
import { toast } from 'sonner'

interface FileUploadProps {
  onFilesUploaded: (fileIds: string[]) => void
  uploadedFiles: Array<{
    id: string
    filename: string
  }>
  onRemoveFile: (fileId: string) => void
}

export function FileUpload({ onFilesUploaded, uploadedFiles, onRemoveFile }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const getUploadUrlMutation = useGetUploadUrl()
  const recordUploadMutation = useRecordUpload()

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const uploadedIds: string[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop() || ''
        const fileType = file.type

        const uploadUrlResponse = await getUploadUrlMutation.mutateAsync({
          fileType,
          ext,
        })

        const { signedUrl, token, path } = uploadUrlResponse.data.data

        await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': fileType,
          },
        })

        const recordResponse = await recordUploadMutation.mutateAsync({
          path,
          fileType,
          fileSize: file.size,
          filename: file.name,
          signature: token,
        })

        uploadedIds.push(recordResponse.data.data.id)
      }

      onFilesUploaded(uploadedIds)
      toast.success(`Successfully uploaded ${files.length} file(s)`)
    } catch (error) {
      toast.error('Failed to upload files')
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }, [getUploadUrlMutation, recordUploadMutation, onFilesUploaded])

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : '📎 Attach Files'}
        </Button>
        <input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file) => (
            <Badge key={file.id} variant="secondary" className="gap-1">
              📄 {file.filename}
              <button
                type="button"
                onClick={() => onRemoveFile(file.id)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}