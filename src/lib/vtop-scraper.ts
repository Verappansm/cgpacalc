import * as cheerio from 'cheerio'
// undici is bundled with Node.js 18+ — use it directly to bypass VTOP's
// incomplete TLS certificate chain (UNABLE_TO_VERIFY_LEAF_SIGNATURE)
import { Agent, fetch as undiciFetch } from 'undici'
import type {
  VtopCourse, VtopCourseMarks, VtopData,
  VtopGradeHistory, VtopSemester,
} from './vtop-types'

const BASE = 'https://vtopcc.vit.ac.in/vtop'
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

// VTOP has an incomplete TLS cert chain so we must skip cert validation
const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } })

// ── Session store ─────────────────────────────────────────────────────────────
// Attached to `global` so it survives Turbopack hot-reloads between requests
type Session = { cookies: string; csrf: string; lastUsed: number }

declare global {
  // eslint-disable-next-line no-var
  var __vtopSessions: Map<string, Session> | undefined
}

const sessions: Map<string, Session> = globalThis.__vtopSessions ?? new Map()
globalThis.__vtopSessions = sessions

function cleanup() {
  const cutoff = Date.now() - 3_600_000
  for (const [k, s] of sessions) if (s.lastUsed < cutoff) sessions.delete(k)
}

function genId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

// ── Cookie merging ────────────────────────────────────────────────────────────
function mergeCookies(existing: string, newHeader: string | null): string {
  if (!newHeader) return existing
  const jar = new Map<string, string>()
  for (const pair of existing.split(';').map(s => s.trim()).filter(Boolean)) {
    const i = pair.indexOf('=')
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
  }
  const parts = newHeader.split(/,(?=\s*[A-Za-z][A-Za-z0-9_-]*\s*=)/)
  for (const part of parts) {
    const nameValue = part.split(';')[0].trim()
    const i = nameValue.indexOf('=')
    if (i > 0) jar.set(nameValue.slice(0, i).trim(), nameValue.slice(i + 1).trim())
  }
  return Array.from(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

// ── HTTP helpers (all via undici to bypass cert issues) ───────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UndiciInit = any

async function vtopGet(path: string, cookies: string) {
  const r = await undiciFetch(`${BASE}${path}`, {
    method: 'GET',
    headers: { 'User-Agent': UA, Cookie: cookies, Accept: 'text/html,*/*' },
    dispatcher: tlsAgent,
    redirect: 'follow',
  } as UndiciInit)
  return { text: await r.text(), cookies: mergeCookies(cookies, r.headers.get('set-cookie')) }
}

async function vtopPost(path: string, cookies: string, data: Record<string, string>) {
  const r = await undiciFetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: cookies,
      Referer: `${BASE}/login`,
      Origin: 'https://vtopcc.vit.ac.in',
      Accept: 'text/html,*/*',
    },
    body: new URLSearchParams(data).toString(),
    dispatcher: tlsAgent,
    redirect: 'follow',
  } as UndiciInit)
  return { text: await r.text(), cookies: mergeCookies(cookies, r.headers.get('set-cookie')) }
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseSemesters($: ReturnType<typeof cheerio.load>): VtopSemester[] {
  const sems: VtopSemester[] = []
  $('select').each((_, sel) => {
    const attr = (($(sel).attr('name') ?? '') + ($(sel).attr('id') ?? '')).toLowerCase()
    if (!attr.includes('sem') && !attr.includes('semester')) return
    $(sel).find('option').each((_, opt) => {
      const val = ($(opt).attr('value') ?? '').trim()
      const label = $(opt).text().trim()
      if (val && val !== '' && val !== '0' && !/select/i.test(val)) {
        sems.push({ id: val, label })
      }
    })
  })
  return sems
}

// VTOP timetable: courses live inside #studentDetailsList > table
// Headers use <th>; credits column says "L T P J C" (last digit = total credits)
function parseCourseTable($: ReturnType<typeof cheerio.load>): VtopCourse[] {
  const courses: VtopCourse[] = []

  // Try scoped to #studentDetailsList first (android repo selector), then fall back to any table
  const root = $('#studentDetailsList').length > 0 ? $('#studentDetailsList') : $.root()

  root.find('table').each((_, table) => {
    const hdrs = $(table).find('th').map((_, th) => $(th).text().trim().toLowerCase()).get()
    if (hdrs.length === 0) return
    if (!hdrs.some(h => h.includes('course') || h.includes('code'))) return

    const idx = {
      // android repo: exact "course" heading = course name; "code" = course code
      code:    hdrs.findIndex(h => h.includes('code')),
      name:    hdrs.findIndex(h => h === 'course' || (h.includes('course') && !h.includes('type') && !h.includes('code') && !h.includes('title'))) >= 0
               ? hdrs.findIndex(h => h === 'course' || (h.includes('course') && !h.includes('type') && !h.includes('code') && !h.includes('title')))
               : hdrs.findIndex(h => h.includes('title')),
      type:    hdrs.findIndex(h => h.includes('type')),
      // android repo: credits header is "l t p j c"; also accept plain "credit"
      credits: hdrs.findIndex(h => h.includes('l t p j c') || h.includes('ltpjc') || h === 'credit' || h === 'credits'),
      faculty: hdrs.findIndex(h => h.includes('faculty') || h.includes('staff') || h.includes('lecturer')),
    }
    // Fall back: if neither code nor name found, skip
    if (idx.code < 0 && idx.name < 0) return

    $(table).find('tr').slice(1).each((_, row) => {
      const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get()
      if (cells.length < 3) return
      const code    = idx.code >= 0 ? cells[idx.code] : ''
      const name    = idx.name >= 0 ? cells[idx.name] : (idx.code >= 0 ? cells[idx.code] : '')
      const typeStr = (idx.type >= 0 ? cells[idx.type] : '').toUpperCase()

      // "L T P J C" value like "4 0 0 0 4" → last number is total credits
      let creds = 0
      if (idx.credits >= 0) {
        const credCell = cells[idx.credits] ?? ''
        const nums = credCell.split(/\s+/).map(Number).filter(n => !isNaN(n) && n >= 0)
        creds = nums[nums.length - 1] ?? 0  // last = C (credit)
        if (creds === 0) creds = nums.find(n => n > 0) ?? 0
      }

      const faculty = idx.faculty >= 0 ? cells[idx.faculty] : ''
      if ((!code && !name) || creds <= 0) return
      let type: VtopCourse['type'] = 'THEORY'
      if (typeStr.includes('LAB') || typeStr === 'L') type = 'LAB'
      else if (typeStr.includes('PROJECT') || typeStr === 'P') type = 'PROJECT'
      courses.push({ code: code || name, name: name || code, type, credits: creds, faculty })
    })

    if (courses.length > 0) return false  // stop at first matching table
  })
  return courses
}

// android repo getCreditsCGPA(): looks for a table whose first-row <td>[0] contains "credit",
// then finds "earned" and "cgpa" columns; values are in row[1] at same column indices.
function parseCGPAFromPage($: ReturnType<typeof cheerio.load>): { cgpa: number; totalCredits: number } {
  let cgpa = 0, totalCredits = 0
  $('table').each((_, table) => {
    const firstRowTds = $(table).find('tr').first().find('td')
    if (firstRowTds.length < 2) return
    if (!firstRowTds.first().text().toLowerCase().includes('credit')) return

    let earnedIdx = -1, cgpaIdx = -1
    firstRowTds.each((j, td) => {
      const txt = $(td).text().trim().toLowerCase()
      if (txt.includes('earned')) earnedIdx = j
      else if (txt.includes('cgpa')) cgpaIdx = j
    })
    if (earnedIdx < 0 && cgpaIdx < 0) return

    const n = firstRowTds.length
    const allTds = $(table).find('td').toArray()
    if (allTds.length < n * 2) return
    if (earnedIdx >= 0) {
      const v = parseFloat($(allTds[earnedIdx + n]).text().trim())
      if (!isNaN(v) && v > 0) totalCredits = v
    }
    if (cgpaIdx >= 0) {
      const v = parseFloat($(allTds[cgpaIdx + n]).text().trim())
      if (!isNaN(v) && v > 0) cgpa = v
    }
    return false  // break
  })
  return { cgpa, totalCredits }
}

// Maps a VTOP exam month string ("Jan-2023", "May-2024") to a semester label.
// VIT exam schedule: Jan/Feb = end of Fall sem; May/Jun = end of Winter sem; Nov/Dec = end of Fall sem.
function examMonthToSemLabel(examMonth: string): string {
  const parts = examMonth.split('-')
  const month = (parts[0] ?? '').toLowerCase().slice(0, 3)
  const year  = parseInt(parts[1] ?? '0')
  if (!year) return examMonth
  const yy   = String(year).slice(2)
  const prev  = year - 1
  const prevyy = String(prev).slice(2)
  if (['jan', 'feb', 'mar'].includes(month)) return `Fall Semester ${prev}-${yy}`
  if (['apr', 'may', 'jun'].includes(month)) return `Winter Semester ${prev}-${yy}`
  if (['jul', 'aug', 'sep'].includes(month)) return `Fall Semester ${year}-${String(year + 1).slice(2)}`
  if (['oct', 'nov', 'dec'].includes(month)) return `Fall Semester ${year}-${String(year + 1).slice(2)}`
  return `Semester ${examMonth}`
}

// The VTOP grade history page is a FLAT table — all courses from all semesters in one table
// with NO semester separator rows. Hidden per-course detail rows exist as td[colspan] rows
// but must be ignored. We group courses by the "Exam Month" column to reconstruct semesters.
function parseGradeHistory($: ReturnType<typeof cheerio.load>): VtopGradeHistory[] {
  // Find column indices from the tableHeader row that contains "Course Code"
  let codeIdx = 1, nameIdx = 2, creditsIdx = 4, gradeIdx = 5, examMonthIdx = 6

  $('table tr.tableHeader').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 4) return
    const txts = tds.map((_, td) => $(td).text().trim().toLowerCase()).get()
    if (!txts.some(t => t.includes('course code'))) return
    tds.each((i, td) => {
      const t = $(td).text().trim().toLowerCase()
      if (t.includes('course code'))                         codeIdx      = i
      else if (t.includes('course title') || t === 'title') nameIdx      = i
      else if (t === 'credits' || t.includes('credit'))      creditsIdx   = i
      else if (t === 'grade')                                gradeIdx     = i
      else if (t.includes('exam month'))                     examMonthIdx = i
    })
    return false  // stop at first matching header row
  })

  // Walk tableContent rows only — this skips header rows AND avoids hidden-detail colspan rows
  // (those have class="tableContent" but cells.length === 1 since a single colspan td)
  const semGroups = new Map<string, VtopGradeHistory>()

  $('table tr.tableContent').each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get()
    if (cells.length <= gradeIdx) return  // hidden detail rows have only 1 cell

    const code      = (cells[codeIdx]      ?? '').trim()
    const name      = (cells[nameIdx]      ?? '').trim()
    const credStr   = (cells[creditsIdx]   ?? '').trim()
    const grade     = (cells[gradeIdx]     ?? '').trim()
    const examMonth = (cells[examMonthIdx] ?? '').trim()

    if (!code || !/^[A-Z]{2,5}\d{3,5}[A-Z]?$/.test(code)) return  // not a real course code
    const credits = parseFloat(credStr)
    if (isNaN(credits) || credits <= 0) return  // sub-component row (ETH/ELA) has no credits
    if (!grade || grade === '-') return          // sub-component rows have dash grade
    const gradeChar = grade.charAt(0)
    if (!/^[SABCDEFN]/.test(gradeChar)) return

    const semLabel = examMonth ? examMonthToSemLabel(examMonth) : 'Unknown Semester'
    const semId    = semLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)

    if (!semGroups.has(semId)) semGroups.set(semId, { semId, semLabel, gpa: 0, credits: 0, courses: [] })
    const group = semGroups.get(semId)!
    group.courses.push({ code, name, credits: Math.round(credits), grade: gradeChar })
    group.credits += Math.round(credits)
  })

  // Compute SGPA per semester from the courses we collected
  const GP: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 }
  const result = Array.from(semGroups.values())
  for (const sem of result) {
    const tw = sem.courses.reduce((s, c) => s + c.credits * (GP[c.grade] ?? 0), 0)
    if (sem.credits > 0) sem.gpa = Math.round((tw / sem.credits) * 100) / 100
  }

  // Entries were inserted newest-first (exam months in descending order in VTOP);
  // reverse so oldest semester is first.
  return result.reverse()
}

function parseMarks($: ReturnType<typeof cheerio.load>): VtopCourseMarks[] {
  const byCode = new Map<string, VtopCourseMarks>()
  let curCode = ''

  $('table tr').each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get()

    // Course header (wide colspan cell with a course code in it)
    if ($(row).find('td[colspan]').length > 0 || cells.length === 1) {
      const txt = (cells[0] || $(row).text()).trim()
      const m = txt.match(/([A-Z]{2,4}\d{3,4}[A-Z]?)/i)
      if (m) {
        curCode = m[1].toUpperCase()
        if (!byCode.has(curCode)) byCode.set(curCode, { courseCode: curCode, courseName: txt.replace(m[1], '').replace(/[-–:]/g, '').trim() })
      }
      return
    }

    if (!curCode || cells.length < 2) return
    const testName = cells[0].toUpperCase()
    const numVals  = cells.slice(1).map(parseFloat).filter(n => !isNaN(n) && n >= 0)
    if (!numVals.length) return

    const entry = byCode.get(curCode)!
    const score = numVals[0]
    if ((testName.includes('CAT') || testName.includes('CYCLE')) && (testName.includes('1') || testName.endsWith('I'))) entry.cat1 = score
    else if ((testName.includes('CAT') || testName.includes('CYCLE')) && (testName.includes('2') || testName.endsWith('II'))) entry.cat2 = score
    else if (testName.includes('INTERNAL') || testName.startsWith('IA') || testName === 'INT') entry.internals = score
  })

  return Array.from(byCode.values())
}

function parseProfile($: ReturnType<typeof cheerio.load>): { name: string; cgpa: number; credits: number } {
  const text = $.text()
  let name = ''
  $('td, span, p').each((_, el) => {
    const label = $(el).text().trim()
    if (/Student\s+Name/i.test(label) || /Name\s*:/i.test(label)) {
      const next = $(el).next().text().trim() || $(el).closest('tr').find('td').eq(1).text().trim()
      if (next && next.length > 1 && next.length < 80) { name = next; return false as unknown as void }
    }
  })
  const cgpaMatch = text.match(/CGPA[\s:]*(\d+\.\d+)/i) || text.match(/Cumulative[^0-9]*(\d+\.\d+)/i)
  const cgpa = cgpaMatch ? parseFloat(cgpaMatch[1]) : 0
  const credMatch = text.match(/(?:Total|Earned|Completed)\s+Credits[^\d]*(\d+)/i)
  const credits = credMatch ? parseInt(credMatch[1], 10) : 0
  return { name, cgpa, credits }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchCaptcha(): Promise<{
  sessionKey: string
  captchaBase64: string | null
  isRecaptcha: boolean
  csrf: string
}> {
  cleanup()

  // 1. GET login page — grabs initial cookies + CSRF
  let { text: loginHtml, cookies } = await vtopGet('/login', '')
  let $ = cheerio.load(loginHtml)

  // 2. Serialize #stdForm and POST to prelogin/setup (required before captcha loads)
  const stdFormData: Record<string, string> = {}
  $('#stdForm').find('input, select, textarea').each((_, el) => {
    const name = $(el).attr('name')
    const val  = ($(el).val() ?? '') as string
    if (name) stdFormData[name] = val
  })

  if (Object.keys(stdFormData).length > 0) {
    try {
      const setup = await vtopPost('/prelogin/setup', cookies, stdFormData)
      cookies = setup.cookies
      // Re-fetch the login page now that setup has run — captcha image is rendered after setup
      const refreshed = await vtopGet('/login', cookies)
      cookies = refreshed.cookies
      loginHtml = refreshed.text
      $ = cheerio.load(loginHtml)
    } catch { /* continue without setup if it fails */ }
  }

  const csrf = (($('input[name="_csrf"]').val() ?? '') as string)

  // Try multiple selectors — the captcha img may not always be inside #captchaBlock
  const captchaImgSrc = (
    ($('#captchaBlock img').first().attr('src') ?? '') ||
    // Fallback: any inline base64 image on the page (captcha is always a data URI)
    ($('img[src^="data:image"]').first().attr('src') ?? '') ||
    // Fallback: img with height attribute (VIT uses height="325" on captcha img)
    ($('img[height]').first().attr('src') ?? '')
  ).trim()

  // True reCaptcha: the interactive Google widget div must exist AND no image captcha present.
  // Note: VTOP may include the reCaptcha *script* even on image-captcha pages — don't use
  // loginHtml.includes('recaptcha') because that's always true on newer VTOP builds.
  const hasRecaptchaWidget = $('[class*="g-recaptcha"]').length > 0 || $('[data-sitekey]').length > 0
  const isRecaptcha = !captchaImgSrc && hasRecaptchaWidget

  // Captcha image is inside #captchaBlock (exact selector: $('#captchaBlock img').get(0).src)
  let captchaBase64: string | null = null
  if (captchaImgSrc) {
    if (captchaImgSrc.startsWith('data:')) {
      captchaBase64 = captchaImgSrc
    } else {
      try {
        const abs = captchaImgSrc.startsWith('http')
          ? captchaImgSrc
          : `https://vtopcc.vit.ac.in${captchaImgSrc.startsWith('/') ? captchaImgSrc : '/' + captchaImgSrc}`
        const r   = await undiciFetch(abs, { headers: { Cookie: cookies, 'User-Agent': UA }, dispatcher: tlsAgent } as UndiciInit)
        const buf = await r.arrayBuffer()
        const ct  = r.headers.get('content-type') ?? 'image/jpeg'
        captchaBase64 = `data:${ct};base64,${Buffer.from(buf).toString('base64')}`
      } catch { /* captcha image not fetchable */ }
    }
  }

  const key = genId()
  sessions.set(key, { cookies, csrf, lastUsed: Date.now() })
  return { sessionKey: key, captchaBase64, isRecaptcha, csrf }
}

export async function loginAndFetch(params: {
  sessionKey: string
  username: string
  password: string
  captchaAnswer: string
}): Promise<VtopData> {
  const session = sessions.get(params.sessionKey)
  if (!session) throw new Error('Session expired — refresh the captcha and try again.')
  session.lastUsed = Date.now()

  // ── Login ──────────────────────────────────────────────────────────────────
  // VTOP sets the session cookie (JSESSIONID) on the 302 redirect response, NOT the final page.
  // redirect: 'follow' would lose that cookie, so we use 'manual' and follow manually.
  const loginRes = await undiciFetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookies,
      Referer: `${BASE}/login`,
      Origin: 'https://vtopcc.vit.ac.in',
      Accept: 'text/html,*/*',
    },
    body: new URLSearchParams({
      _csrf: session.csrf,
      username: params.username,
      password: params.password,
      captchaStr: params.captchaAnswer,
      gResponse:  params.captchaAnswer,
    }).toString(),
    dispatcher: tlsAgent,
    redirect: 'manual',
  } as UndiciInit)

  // Capture cookies from the login response (may be the 302 redirect response)
  let cookies = mergeCookies(session.cookies, loginRes.headers.get('set-cookie'))
  console.log('[VTOP] login status:', loginRes.status, '| cookies:', cookies.slice(0, 400))

  let loginText: string
  if (loginRes.status >= 300 && loginRes.status < 400) {
    // VTOP redirected — follow manually so we keep the 302 cookies
    const location = loginRes.headers.get('location') ?? ''
    const fullUrl  = location.startsWith('http') ? location : `https://vtopcc.vit.ac.in${location}`
    console.log('[VTOP] login redirect ->', fullUrl)
    const followed = await vtopGet(fullUrl.replace('https://vtopcc.vit.ac.in/vtop', ''), cookies)
    cookies   = followed.cookies
    loginText = followed.text
  } else {
    loginText = await loginRes.text()
  }

  const $l = cheerio.load(loginText)
  console.log('[VTOP] post-login page title:', $l('title').text().trim())

  // Detect failure: still on login page (captchaStr input still present) AND no authorizedIDX
  const errMsg = $l('.error-message, .alert-danger, #errorMsg, .errormesg, [class*="error"]').first().text().trim()
  const stillOnLogin = $l('input[name="captchaStr"]').length > 0 && $l('input[name="authorizedIDX"]').length === 0
  if (stillOnLogin || /invalid|wrong|incorrect|captcha|locked|maximum/i.test(errMsg)) {
    sessions.delete(params.sessionKey)
    throw new Error(errMsg || 'Login failed — check your credentials or captcha.')
  }

  const authorizedID = (
    ($l('input[name="authorizedIDX"]').val() as string) ||
    ($l('input[name="authorizedID"]').val() as string) ||
    params.username
  )
  const newCsrf = (($l('input[name="_csrf"]').val() as string) || session.csrf)

  const postBase = {
    _csrf: newCsrf,
    authorizedID,
    verifyMenu: 'true',
    nocache: Date.now().toString(),
  }

  console.log('[VTOP] authorizedID:', authorizedID, '| newCsrf len:', newCsrf.length)

  // ── Student profile ────────────────────────────────────────────────────────
  let name = '', cgpa = 0, totalCredits = 0
  try {
    const r = await vtopPost('/studentsRecord/StudentProfileAllView', cookies, postBase)
    cookies = r.cookies
    console.log('[VTOP] profile HTML snippet:', r.text.slice(0, 3000))
    const prof = parseProfile(cheerio.load(r.text))
    console.log('[VTOP] parsed profile:', prof)
    name = prof.name; cgpa = prof.cgpa; totalCredits = prof.credits
  } catch (e) { console.error('[VTOP] profile error:', e) }

  // ── Grade history + CGPA ──────────────────────────────────────────────────
  let gradeHistory: VtopGradeHistory[] = []
  try {
    const r = await vtopPost('/examinations/examGradeView/StudentGradeHistory', cookies, { ...postBase, nocache: Date.now().toString() })
    cookies = r.cookies
    console.log('[VTOP] gradeHistory HTML snippet:', r.text.slice(0, 5000))
    const $gh = cheerio.load(r.text)
    gradeHistory = parseGradeHistory($gh)
    console.log('[VTOP] parsed gradeHistory count:', gradeHistory.length, gradeHistory.map(h => ({ sem: h.semLabel, gpa: h.gpa, courses: h.courses.length })))

    // CGPA comes from the grade history page's summary table (android repo getCreditsCGPA())
    if (cgpa === 0) {
      const ghCGPA = parseCGPAFromPage($gh)
      console.log('[VTOP] CGPA from grade history page:', ghCGPA)
      if (ghCGPA.cgpa > 0) cgpa = ghCGPA.cgpa
      if (ghCGPA.totalCredits > 0) totalCredits = ghCGPA.totalCredits
    }

    // Fallback: compute CGPA from grade history if summary table parse also failed
    if (cgpa === 0 && gradeHistory.length > 0) {
      const GP: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 }
      const totalW = gradeHistory.reduce((s, h) => s + h.courses.reduce((cs, c) => cs + c.credits * (GP[c.grade] ?? 0), 0), 0)
      const totalC = gradeHistory.reduce((s, h) => s + h.credits, 0)
      if (totalC > 0) { cgpa = Math.round((totalW / totalC) * 100) / 100; totalCredits = totalC }
    }
  } catch (e) { console.error('[VTOP] gradeHistory error:', e) }

  // ── Current timetable ─────────────────────────────────────────────────────
  let semesters: VtopSemester[] = []
  const coursesBySem: Record<string, VtopCourse[]> = {}

  try {
    const r = await vtopPost('/academics/common/StudentTimeTableChn', cookies, { ...postBase, nocache: Date.now().toString() })
    cookies = r.cookies
    const $tt = cheerio.load(r.text)
    semesters = parseSemesters($tt)
    console.log('[VTOP] parsed semesters:', semesters)

    if (semesters.length > 0) {
      const latest = semesters[0]
      const r2 = await vtopPost('/processViewTimeTable', cookies, { ...postBase, semesterSubId: latest.id, nocache: Date.now().toString() })
      cookies = r2.cookies
      console.log('[VTOP] processViewTimeTable HTML snippet:', r2.text.slice(0, 3000))
      const parsed = parseCourseTable(cheerio.load(r2.text))
      console.log('[VTOP] parsed courses for latest sem:', parsed.length, parsed.slice(0, 3))
      coursesBySem[latest.id] = parsed
    } else {
      const courses = parseCourseTable($tt)
      if (courses.length > 0) {
        const sid = 'current'
        semesters.push({ id: sid, label: 'Current Semester' })
        coursesBySem[sid] = courses
      }
    }
  } catch (e) { console.error('[VTOP] timetable error:', e) }

  // Fill past semesters from grade history.
  // Match grade history labels to timetable semester IDs so the same key is used everywhere.
  const normLabel = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/i year|ii year|iii year|iv year/gi, '').trim()
  for (const h of gradeHistory) {
    // Try to find a matching timetable semester by normalized label
    const match = semesters.find(s => normLabel(s.label) === normLabel(h.semLabel))
    const key   = match ? match.id : h.semId
    const label = match ? match.label : h.semLabel

    if (!semesters.find(s => s.id === key)) semesters.push({ id: key, label })
    if (!coursesBySem[key]) {
      coursesBySem[key] = h.courses.map(c => ({
        code: c.code, name: c.name, type: 'THEORY' as const, credits: c.credits,
      }))
    }
    h.semId = key  // normalise history entry to use the timetable key
  }

  // ── Current marks ─────────────────────────────────────────────────────────
  let currentSemMarks: VtopCourseMarks[] = []
  try {
    const r = await vtopPost('/examinations/doStudentMarkView', cookies, { ...postBase, nocache: Date.now().toString() })
    currentSemMarks = parseMarks(cheerio.load(r.text))
  } catch { /* partial data ok */ }

  sessions.delete(params.sessionKey)

  return {
    name: name || params.username,
    regNumber: authorizedID,
    cgpa,
    totalCredits,
    semesters,
    coursesBySem,
    gradeHistory,
    currentSemMarks,
  }
}
