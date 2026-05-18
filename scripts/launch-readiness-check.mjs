import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()

const requiredFiles = [
  'app/api/auth/callback/route.ts',
  'app/api/payments/checkout/route.ts',
  'app/api/payments/webhook/stripe/route.ts',
  'app/admin/reviews/page.tsx',
  'app/admin/payouts/page.tsx',
  'app/admin/ai-ops/page.tsx',
  'supabase/migrations/016_payments_trust_foundation.sql',
  'supabase/migrations/020_platform_scale_ai_ops.sql',
  'supabase/migrations/021_platform_scale_org_vendor_ecosystem.sql',
]

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
]

const optionalEnv = ['RESEND_API_KEY', 'OPENAI_API_KEY', 'CLAUDE_API_KEY']

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (['.git', '.next', 'node_modules'].includes(entry)) continue
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) walk(fullPath, files)
    if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry)) files.push(fullPath)
  }
  return files
}

function checkFiles() {
  return requiredFiles.map(file => ({
    name: file,
    ok: existsSync(join(root, file)),
    detail: existsSync(join(root, file)) ? 'present' : 'missing',
  }))
}

function checkEnv() {
  return [
    ...requiredEnv.map(name => ({
      name,
      ok: Boolean(process.env[name]),
      detail: process.env[name] ? 'configured' : 'missing',
    })),
    ...optionalEnv.map(name => ({
      name,
      ok: true,
      detail: process.env[name] ? 'configured optional' : 'optional not configured',
    })),
  ]
}

function checkClientSecretImports() {
  const offenders = walk(root)
    .filter(file => {
      const text = readFileSync(file, 'utf8')
      return text.includes("'use client'") || text.includes('"use client"')
    })
    .filter(file => {
      const text = readFileSync(file, 'utf8')
      return /createAdminClient|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RESEND_API_KEY/.test(text)
    })
    .map(file => relative(root, file))

  return {
    name: 'client_secret_import_scan',
    ok: offenders.length === 0,
    detail: offenders.length ? offenders.join(', ') : 'no client secret imports found',
  }
}

function checkPublicEnvNames() {
  const offenders = walk(root)
    .map(file => ({ file, text: readFileSync(file, 'utf8') }))
    .filter(({ text }) => /NEXT_PUBLIC_.*SECRET|NEXT_PUBLIC_.*SERVICE_ROLE|NEXT_PUBLIC_.*WEBHOOK/i.test(text))
    .map(({ file }) => relative(root, file))

  return {
    name: 'public_secret_name_scan',
    ok: offenders.length === 0,
    detail: offenders.length ? offenders.join(', ') : 'no public secret env names found',
  }
}

const checks = [
  ...checkFiles(),
  ...checkEnv(),
  checkClientSecretImports(),
  checkPublicEnvNames(),
]

let failed = 0
for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL'
  if (!check.ok) failed += 1
  console.log(`${status} ${check.name}: ${check.detail}`)
}

if (failed > 0) {
  console.error(`\n${failed} launch readiness check(s) failed.`)
  process.exitCode = 1
} else {
  console.log('\nLaunch readiness static checks passed.')
}
