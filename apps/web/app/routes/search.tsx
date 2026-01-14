import { useState, useEffect } from 'react'
import { Header } from '~/components/header'
import { Input } from '~/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { useSearchMemos } from '~/hooks/use-queries'

interface SearchResult {
  id: string
  content: string
  createdAt: string
  visibility: string
  isPinned: boolean
  author: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
  resources?: Array<{
    id: string
    filename: string
  }>
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const { data: searchResults, isLoading } = useSearchMemos(debouncedQuery)

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Search Memos</h1>
          
          <div className="mb-8">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search memos... (minimum 2 characters)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Searching...</div>
          )}

          {searchResults && searchResults.data?.data?.length > 0 && (
            <div className="space-y-4">
              {searchResults.data.data.map((memo: any) => (
                <Card key={memo.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={memo.author.avatarUrl} alt={memo.author.username} />
                        <AvatarFallback>{getInitials(memo.author.displayName || memo.author.username)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{memo.author.displayName || memo.author.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(memo.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {memo.visibility === 'private' && (
                        <Badge variant="secondary">Private</Badge>
                      )}
                      {memo.isPinned && (
                        <Badge variant="default">Pinned</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{memo.content}</p>
                    </div>
                    
                    {memo.resources && memo.resources.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {memo.resources.map((resource: any) => (
                          <Badge key={resource.id} variant="outline">
                            📎 {resource.filename}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchResults && searchResults.data?.data?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No memos found for "{debouncedQuery}"</p>
            </div>
          )}

          {!searchResults && debouncedQuery.length >= 2 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Start typing to search for memos</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}