import { Toaster } from "~/components/ui/sonner"

export function App() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-center mb-8">Nodal Memo App</h1>
        <p className="text-center text-muted-foreground">
          Frontend implementation coming soon...
        </p>
      </div>
    </div>
  )
}