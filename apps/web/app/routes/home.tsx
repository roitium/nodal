import { Header } from '~/components/header'
import { MemoTimeline } from '~/components/memo-timeline'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Timeline</h1>
            <p className="text-muted-foreground">See what's happening in the community</p>
          </div>
          
          <MemoTimeline />
        </div>
      </main>
    </div>
  )
}