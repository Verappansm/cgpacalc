import { loginAndFetch } from '@/lib/vtop-scraper'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { sessionState, username, password, captchaAnswer } = body as Record<string, string>

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 })
  }

  try {
    const data = await loginAndFetch({
      sessionState: sessionState ?? '',
      username,
      password,
      captchaAnswer: captchaAnswer ?? '',
    })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Connection failed.' },
      { status: 401 },
    )
  }
}
