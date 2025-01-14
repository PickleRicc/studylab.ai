import { createServerClient } from '@supabase/ssr'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const testId = req.query.testId
    if (!testId) {
        return res.status(400).json({ error: 'Test ID is required' })
    }

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get: (name) => req.cookies[name],
                    set: (name, value, options) => res.setHeader('Set-Cookie', value),
                    remove: (name, options) => res.setHeader('Set-Cookie', name),
                },
            }
        )

        const { data: test, error } = await supabase
            .from('tests')
            .select('status, title')
            .eq('id', testId)
            .single()

        if (error) {
            console.error('Error fetching test status:', error)
            return res.status(500).json({ error: 'Failed to fetch test status' })
        }

        if (!test) {
            return res.status(404).json({ error: 'Test not found' })
        }

        return res.status(200).json({ 
            status: test.status,
            title: test.title
        })
    } catch (error) {
        console.error('Error:', error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}
