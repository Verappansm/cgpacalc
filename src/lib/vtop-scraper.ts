import * as cheerio from 'cheerio'
import { Agent, fetch as undiciFetch } from 'undici'
import type {
  VtopCourse, VtopCourseMarks, VtopData,
  VtopGradeHistory, VtopSemester,
} from './vtop-types'

const BASE = 'https://vtopcc.vit.ac.in/vtop'
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } })

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

// ── HTTP helpers ──────────────────────────────────────────────────────────────
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

function courseTypeToVtop(typeStr: string): VtopCourse['type'] {
  const t = typeStr.toUpperCase().trim()
  if (['ELA', 'EL', 'LAB'].includes(t)) return 'LAB'
  if (['PBL', 'PROJECT'].includes(t) || t.includes('PROJECT')) return 'PROJECT'
  return 'THEORY'
}

function isNonGradedType(typeStr: string, code: string): boolean {
  const t = typeStr.toUpperCase().trim()
  return t === 'SS' || t === 'ENG' || code.toUpperCase().startsWith('VITOL')
}

function parseCourseTable($: ReturnType<typeof cheerio.load>): VtopCourse[] {
  const courses: VtopCourse[] = []
  const root = $('#studentDetailsList').length > 0 ? $('#studentDetailsList') : $('body')

  root.find('table').each((_, table) => {
    const hdrs = $(table).find('th').map((_, th) => $(th).text().trim().toLowerCase()).get()
    if (hdrs.length === 0) return
    if (!hdrs.some(h => h.includes('course') || h.includes('code'))) return

    const idx = {
      code:    hdrs.findIndex(h => h.includes('code')),
      name:    hdrs.findIndex(h => h === 'course' || (h.includes('course') && !h.includes('type') && !h.includes('code') && !h.includes('title'))) >= 0
               ? hdrs.findIndex(h => h === 'course' || (h.includes('course') && !h.includes('type') && !h.includes('code') && !h.includes('title')))
               : hdrs.findIndex(h => h.includes('title')),
      type:    hdrs.findIndex(h => h.includes('type')),
      credits: hdrs.findIndex(h => h.includes('l t p j c') || h.includes('ltpjc') || h === 'credit' || h === 'credits'),
      faculty: hdrs.findIndex(h => h.includes('faculty') || h.includes('staff') || h.includes('lecturer')),
    }
    if (idx.code < 0 && idx.name < 0) return

    $(table).find('tr').slice(1).each((_, row) => {
      const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get()
      if (cells.length < 3) return

      const code    = idx.code >= 0 ? cells[idx.code] : ''
      const name    = idx.name >= 0 ? cells[idx.name] : (idx.code >= 0 ? cells[idx.code] : '')
      const typeStr = (idx.type >= 0 ? cells[idx.type] : '').toUpperCase().trim()

      if (isNonGradedType(typeStr, code)) return

      let creds = 0
      if (idx.credits >= 0) {
        const credCell = cells[idx.credits] ?? ''
        const nums = credCell.split(/\s+/).map(Number).filter(n => !isNaN(n) && n >= 0)
        creds = nums[nums.length - 1] ?? 0
        if (creds === 0) creds = nums.find(n => n > 0) ?? 0
      }

      const faculty = idx.faculty >= 0 ? cells[idx.faculty] : ''
      if ((!code && !name) || creds <= 0) return

      courses.push({
        code: code || name,
        name: name || code,
        type: courseTypeToVtop(typeStr),
        credits: creds,
        faculty,
      })
    })

    if (courses.length > 0) return false
  })
  return courses
}

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
    return false
  })
  return { cgpa, totalCredits }
}

function examMonthToSemLabel(examMonth: string): string {
  const parts = examMonth.split('-')
  const month = (parts[0] ?? '').toLowerCase().slice(0, 3)
  const year  = parseInt(parts[1] ?? '0')
  if (!year) return examMonth
  const yy   = String(year).slice(2)
  const prev  = year - 1
  if (['jan', 'feb', 'mar'].includes(month)) return `Fall Semester ${prev}-${yy}`
  if (['apr', 'may', 'jun'].includes(month)) return `Winter Semester ${prev}-${yy}`
  if (['jul', 'aug', 'sep', 'oct', 'nov', 'dec'].includes(month)) return `Fall Semester ${year}-${String(year + 1).slice(2)}`
  return `Semester ${examMonth}`
}

// Normalise a raw VTOP semester code/label to a canonical "Fall|Winter Semester YYYY-YY" form.
function normSemCode(raw: string): string | null {
  const u = raw.toUpperCase().trim()
  const m1 = u.match(/\bFS(\d{2})(\d{2})\b/)
  if (m1) return `Fall Semester 20${m1[1]}-${m1[2]}`
  const m2 = u.match(/\bWS(\d{2})(\d{2})\b/)
  if (m2) return `Winter Semester 20${m2[1]}-${m2[2]}`
  if (/WINTER/i.test(u)) {
    const ym = u.match(/(\d{4})[- ](\d{2})/)
    if (ym) return `Winter Semester ${ym[1]}-${ym[2]}`
  }
  if (/FALL|ODD/i.test(u)) {
    const ym = u.match(/(\d{4})[- ](\d{2})/)
    if (ym) return `Fall Semester ${ym[1]}-${ym[2]}`
  }
  return null
}

// Parse the semester-wise performance summary table that appears at the bottom of the
// VTOP grade history page. Returns official { semLabel, sgpa } pairs.
function parseSemesterSummaryTable($: ReturnType<typeof cheerio.load>): { semLabel: string; sgpa: number }[] {
  const entries: { semLabel: string; sgpa: number }[] = []
  $('table').each((_, table) => {
    const rows = $(table).find('tr').toArray()
    if (rows.length < 2) return
    const hdrs = $(rows[0]).find('td, th').map((_, el) => $(el).text().trim().toLowerCase()).get()
    if (!hdrs.some(h => h.includes('sgpa'))) return

    const sgpaIdx   = hdrs.findIndex(h => h.includes('sgpa'))
    const semIdx    = hdrs.findIndex(h => h.includes('register') || (h.includes('sem') && !h.includes('credit')))
    const effSemIdx = semIdx >= 0 ? semIdx : (hdrs[0] === 'sl.no' || hdrs[0] === 'sl' ? 1 : 0)

    for (let i = 1; i < rows.length; i++) {
      const cells = $(rows[i]).find('td').map((_, td) => $(td).text().trim()).get()
      if (cells.length <= sgpaIdx) continue
      const rawSem = (cells[effSemIdx] ?? '').trim()
      const sgpa   = parseFloat(cells[sgpaIdx] ?? '')
      if (!rawSem || isNaN(sgpa) || sgpa <= 0 || sgpa > 10) continue
      const label = normSemCode(rawSem)
      if (label) entries.push({ semLabel: label, sgpa })
    }
    if (entries.length > 0) return false
  })
  return entries
}

// Find the semester in `sems` whose year is closest to the year embedded in `label`.
function findNearestSem(label: string, sems: VtopGradeHistory[]): VtopGradeHistory | undefined {
  const ym = label.match(/(\d{4})-(\d{2})/)
  if (!ym) return undefined
  const yr = parseInt(ym[1])
  let best: VtopGradeHistory | undefined
  let minDist = Infinity
  for (const s of sems) {
    const m = s.semLabel.match(/(\d{4})-(\d{2})/)
    if (!m) continue
    const d = Math.abs(parseInt(m[1]) - yr)
    if (d < minDist) { minDist = d; best = s }
  }
  return best
}

function parseGradeHistory($: ReturnType<typeof cheerio.load>): VtopGradeHistory[] {
  let codeIdx = 1, nameIdx = 2, creditsIdx = 4, gradeIdx = 5, examMonthIdx = 6, typeIdx = -1

  $('table tr.tableHeader').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 4) return
    const txts = tds.map((_, td) => $(td).text().trim().toLowerCase()).get()
    if (!txts.some(t => t.includes('course code'))) return
    tds.each((i, td) => {
      const t = $(td).text().trim().toLowerCase()
      if (t.includes('course code'))                              codeIdx      = i
      else if (t.includes('course title') || t === 'title')      nameIdx      = i
      else if (t === 'credits' || t.includes('credit'))           creditsIdx   = i
      else if (t === 'grade')                                     gradeIdx     = i
      else if (t.includes('exam month'))                          examMonthIdx = i
      else if (t.includes('course type') || t === 'type' || t.includes('crs') && t.includes('type')) typeIdx = i
    })
    return false
  })

  const GP: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0, N: 0 }
  const semGroups = new Map<string, VtopGradeHistory>()

  $('table tr.tableContent').each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get()
    if (cells.length <= gradeIdx) return

    const code       = (cells[codeIdx]      ?? '').trim()
    const name       = (cells[nameIdx]      ?? '').trim()
    const credStr    = (cells[creditsIdx]   ?? '').trim()
    const grade      = (cells[gradeIdx]     ?? '').trim()
    const examMonth  = (cells[examMonthIdx] ?? '').trim()
    const courseType = (typeIdx >= 0 ? cells[typeIdx] : '').trim().toUpperCase()

    if (!code || !/^[A-Z]{2,5}\d{3,5}[A-Z]?$/.test(code)) return
    if (isNonGradedType(courseType, code)) return

    const credits = parseFloat(credStr)
    if (isNaN(credits) || credits <= 0) return
    if (!grade || grade === '-') return
    const gradeChar = grade.charAt(0)
    if (!/^[SABCDEFN]/.test(gradeChar)) return

    const semLabel = examMonth ? examMonthToSemLabel(examMonth) : 'Unknown Semester'
    const semId    = semLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 40)

    if (!semGroups.has(semId)) semGroups.set(semId, { semId, semLabel, gpa: 0, credits: 0, courses: [] })
    const group = semGroups.get(semId)!
    group.courses.push({ code, name, credits: Math.round(credits), grade: gradeChar, courseType: courseType || undefined })
    group.credits += Math.round(credits)
  })

  const result = Array.from(semGroups.values())
  for (const sem of result) {
    const tw = sem.courses.reduce((s, c) => s + c.credits * (GP[c.grade] ?? 0), 0)
    if (sem.credits > 0) sem.gpa = Math.round((tw / sem.credits) * 100) / 100
  }

  // If VTOP publishes an official semester-wise SGPA table, use it as the source of truth.
  // This corrects wrong SGPAs and removes phantom semesters created by re-appear exams.
  const summary = parseSemesterSummaryTable($)
  if (summary.length > 0) {
    const officialSet = new Set(summary.map(e => e.semLabel.toLowerCase()))
    const sgpaMap     = new Map(summary.map(e => [e.semLabel.toLowerCase(), e.sgpa]))

    const official = result.filter(g =>  officialSet.has(g.semLabel.toLowerCase()))
    const extra    = result.filter(g => !officialSet.has(g.semLabel.toLowerCase()))

    // Move courses from extra (re-appear / supplementary) groups into the nearest official semester.
    // Don't double-add a course that already appears there.
    for (const ex of extra) {
      const target = findNearestSem(ex.semLabel, official) ?? official[official.length - 1]
      if (!target) continue
      for (const c of ex.courses) {
        if (!target.courses.find(tc => tc.code === c.code)) {
          target.courses.push(c)
          target.credits += c.credits
        }
      }
    }

    // Replace calculated SGPA with official value
    for (const g of official) {
      const off = sgpaMap.get(g.semLabel.toLowerCase())
      if (off !== undefined) g.gpa = off
    }

    return official.reverse()
  }

  return result.reverse()
}

function parseMarks($: ReturnType<typeof cheerio.load>): VtopCourseMarks[] {
  const byCode = new Map<string, VtopCourseMarks>()
  let curCode = ''

  $('table tr').each((_, row) => {
    const cells = $(row).find('td').map((_, td) => $(td).text().trim()).get()

    if ($(row).find('td[colspan]').length > 0 || cells.length === 1) {
      const txt = (cells[0] || $(row).text()).trim()
      const m = txt.match(/([A-Z]{2,5}\d{3,5}[A-Z]?)/i)
      if (m) {
        curCode = m[1].toUpperCase()
        if (!byCode.has(curCode)) byCode.set(curCode, {
          courseCode: curCode,
          courseName: txt.replace(m[1], '').replace(/[-–:]/g, '').trim(),
        })
      }
      return
    }

    if (!curCode || cells.length < 2) return
    const testName = cells[0].toUpperCase()
    // Skip average/total rows — they pollute lab internal accumulation
    if (testName.includes('AVERAGE') || testName === 'TOTAL' || testName === 'GRAND TOTAL' || testName === 'GRADE') return

    const numVals = cells.slice(1).map(parseFloat).filter(n => !isNaN(n) && n >= 0)
    if (!numVals.length) return

    const entry = byCode.get(curCode)!
    const score = numVals[0]

    if ((testName.includes('CAT') || testName.includes('CYCLE')) && (testName.includes('1') || testName.endsWith('I') || testName.endsWith('-I'))) {
      entry.cat1 = score
    } else if ((testName.includes('CAT') || testName.includes('CYCLE')) && (testName.includes('2') || testName.endsWith('II') || testName.endsWith('-II'))) {
      entry.cat2 = score
    } else if (testName.includes('INTERNAL') || testName.startsWith('IA') || testName === 'INT') {
      entry.internals = score
    } else if (testName.includes('FAT') || testName.includes('FINAL ASSESSMENT')) {
      entry.fat = score
    } else {
      // All other rows: accumulate as lab internal components
      entry.labInternal = (entry.labInternal ?? 0) + score
    }
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
  sessionState: string
  captchaBase64: string | null
  isRecaptcha: boolean
}> {
  let { text: loginHtml, cookies } = await vtopGet('/login', '')
  let $ = cheerio.load(loginHtml)

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
      const refreshed = await vtopGet('/login', cookies)
      cookies = refreshed.cookies
      loginHtml = refreshed.text
      $ = cheerio.load(loginHtml)
    } catch { /* continue if setup fails */ }
  }

  const csrf = (($('input[name="_csrf"]').val() ?? '') as string)

  const captchaImgSrc = (
    ($('#captchaBlock img').first().attr('src') ?? '') ||
    ($('img[src^="data:image"]').first().attr('src') ?? '') ||
    ($('img[height]').first().attr('src') ?? '')
  ).trim()

  const hasRecaptchaWidget = $('[class*="g-recaptcha"]').length > 0 || $('[data-sitekey]').length > 0
  const isRecaptcha = !captchaImgSrc && hasRecaptchaWidget

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

  // Encode pre-login session state as opaque base64 blob — sent to client,
  // returned on the login request so no server-side session store is needed.
  const sessionState = Buffer.from(JSON.stringify({ cookies, csrf })).toString('base64')
  return { sessionState, captchaBase64, isRecaptcha }
}

export async function loginAndFetch(params: {
  sessionState: string
  username: string
  password: string
  captchaAnswer: string
}): Promise<VtopData> {
  let cookies: string
  let csrf: string
  try {
    const decoded = JSON.parse(Buffer.from(params.sessionState, 'base64').toString()) as { cookies?: string; csrf?: string }
    cookies = decoded.cookies ?? ''
    csrf    = decoded.csrf ?? ''
  } catch {
    throw new Error('Session expired — refresh the captcha and try again.')
  }
  if (!cookies || !csrf) throw new Error('Session expired — refresh the captcha and try again.')

  // VTOP sets JSESSIONID on the 302 redirect, not on the final 200. Use manual redirect.
  const loginRes = await undiciFetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
      Referer: `${BASE}/login`,
      Origin: 'https://vtopcc.vit.ac.in',
      Accept: 'text/html,*/*',
    },
    body: new URLSearchParams({
      _csrf: csrf,
      username: params.username,
      password: params.password,
      captchaStr: params.captchaAnswer,
      gResponse:  params.captchaAnswer,
    }).toString(),
    dispatcher: tlsAgent,
    redirect: 'manual',
  } as UndiciInit)

  cookies = mergeCookies(cookies, loginRes.headers.get('set-cookie'))

  let loginText: string
  if (loginRes.status >= 300 && loginRes.status < 400) {
    const location = loginRes.headers.get('location') ?? ''
    const fullUrl  = location.startsWith('http') ? location : `https://vtopcc.vit.ac.in${location}`
    const followed = await vtopGet(fullUrl.replace('https://vtopcc.vit.ac.in/vtop', ''), cookies)
    cookies   = followed.cookies
    loginText = followed.text
  } else {
    loginText = await loginRes.text()
  }

  const $l = cheerio.load(loginText)
  const errMsg = $l('.error-message, .alert-danger, #errorMsg, .errormesg, [class*="error"]').first().text().trim()
  const stillOnLogin = $l('input[name="captchaStr"]').length > 0 && $l('input[name="authorizedIDX"]').length === 0
  if (stillOnLogin || /invalid|wrong|incorrect|captcha|locked|maximum/i.test(errMsg)) {
    throw new Error(errMsg || 'Login failed — check your credentials or captcha.')
  }

  const authorizedID = (
    ($l('input[name="authorizedIDX"]').val() as string) ||
    ($l('input[name="authorizedID"]').val() as string) ||
    params.username
  )
  const newCsrf = (($l('input[name="_csrf"]').val() as string) || csrf)

  const postBase = {
    _csrf: newCsrf,
    authorizedID,
    verifyMenu: 'true',
    nocache: Date.now().toString(),
  }

  // ── Student profile ────────────────────────────────────────────────────────
  let name = '', cgpa = 0, totalCredits = 0
  try {
    const r = await vtopPost('/studentsRecord/StudentProfileAllView', cookies, postBase)
    cookies = r.cookies
    const prof = parseProfile(cheerio.load(r.text))
    name = prof.name; cgpa = prof.cgpa; totalCredits = prof.credits
  } catch { /* partial ok */ }

  // ── Grade history + CGPA ──────────────────────────────────────────────────
  let gradeHistory: VtopGradeHistory[] = []
  try {
    const r = await vtopPost('/examinations/examGradeView/StudentGradeHistory', cookies, { ...postBase, nocache: Date.now().toString() })
    cookies = r.cookies
    const $gh = cheerio.load(r.text)
    gradeHistory = parseGradeHistory($gh)

    if (cgpa === 0) {
      const ghCGPA = parseCGPAFromPage($gh)
      if (ghCGPA.cgpa > 0) cgpa = ghCGPA.cgpa
      if (ghCGPA.totalCredits > 0) totalCredits = ghCGPA.totalCredits
    }

    if (cgpa === 0 && gradeHistory.length > 0) {
      const GP: Record<string, number> = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0, N: 0 }
      const totalW = gradeHistory.reduce((s, h) => s + h.courses.reduce((cs, c) => cs + c.credits * (GP[c.grade] ?? 0), 0), 0)
      const totalC = gradeHistory.reduce((s, h) => s + h.credits, 0)
      if (totalC > 0) { cgpa = Math.round((totalW / totalC) * 100) / 100; totalCredits = totalC }
    }
  } catch { /* partial ok */ }

  // ── Current timetable ─────────────────────────────────────────────────────
  let semesters: VtopSemester[] = []
  const coursesBySem: Record<string, VtopCourse[]> = {}

  try {
    const r = await vtopPost('/academics/common/StudentTimeTableChn', cookies, { ...postBase, nocache: Date.now().toString() })
    cookies = r.cookies
    const $tt = cheerio.load(r.text)
    semesters = parseSemesters($tt)

    if (semesters.length > 0) {
      const latest = semesters[0]
      const r2 = await vtopPost('/processViewTimeTable', cookies, { ...postBase, semesterSubId: latest.id, nocache: Date.now().toString() })
      cookies = r2.cookies
      const parsed = parseCourseTable(cheerio.load(r2.text))
      coursesBySem[latest.id] = parsed
    } else {
      const courses = parseCourseTable($tt)
      if (courses.length > 0) {
        const sid = 'current'
        semesters.push({ id: sid, label: 'Current Semester' })
        coursesBySem[sid] = courses
      }
    }
  } catch { /* partial ok */ }

  // Fill past semesters from grade history
  const normLabel = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/i year|ii year|iii year|iv year/gi, '').trim()
  for (const h of gradeHistory) {
    const match = semesters.find(s => normLabel(s.label) === normLabel(h.semLabel))
    const key   = match ? match.id : h.semId
    const label = match ? match.label : h.semLabel

    if (!semesters.find(s => s.id === key)) semesters.push({ id: key, label })
    if (!coursesBySem[key]) {
      coursesBySem[key] = h.courses.map(c => ({
        code: c.code,
        name: c.name,
        type: courseTypeToVtop(c.courseType ?? ''),
        credits: c.credits,
      }))
    }
    h.semId = key
  }

  // ── Current marks ─────────────────────────────────────────────────────────
  let currentSemMarks: VtopCourseMarks[] = []
  try {
    const r = await vtopPost('/examinations/doStudentMarkView', cookies, { ...postBase, nocache: Date.now().toString() })
    currentSemMarks = parseMarks(cheerio.load(r.text))
  } catch { /* partial ok */ }

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
