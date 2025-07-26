import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'

export default function Home() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('try_table').select('try_column')
      if (error) console.error(error)
      else setData(data)
    }
    fetchData()
  }, [])

  return (
  <main>
      <h1>🐱 Hola Mundo</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
  </main>
  );
}
