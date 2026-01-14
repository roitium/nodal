import { useEffect, useState } from 'react'
import { Header } from '~/components/header'

export default function TestPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/memos/timeline')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">API Test</h1>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
            Error: {error}
          </div>
        )}
        
        {data ? (
          <pre className="bg-muted p-4 rounded-lg overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <p className="text-muted-foreground">Loading...</p>
        )}
      </main>
    </div>
  )
}