import { fetchCaptcha } from '@/lib/vtop-scraper'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await fetchCaptcha()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? 'Failed to reach VTOP.' },
      { status: 500 },
    )
  }
}
