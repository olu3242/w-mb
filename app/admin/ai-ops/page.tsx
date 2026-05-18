import { requireAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReactNode } from 'react'

export default async function AdminAiOpsPage() {
  await requireAdmin()
  const admin = createAdminClient()
  const [{ data: logs }, { data: memories }, { data: failures }, { data: whatsappMessages }, { data: automationQueue }, { data: automationLogs }, { data: automationRules }] = await Promise.all([
    admin.from('orchestration_logs').select('*, events(title, slug)').order('created_at', { ascending: false }).limit(40),
    admin.from('ai_memory_snapshots').select('*, events(title, slug)').order('created_at', { ascending: false }).limit(20),
    admin.from('automation_failures').select('*').order('created_at', { ascending: false }).limit(20),
    admin.from('whatsapp_messages').select('*, events(title, slug)').order('created_at', { ascending: false }).limit(20),
    admin.from('automation_queue').select('*').order('created_at', { ascending: false }).limit(40),
    admin.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(40),
    admin.from('automation_rules').select('*').order('created_at', { ascending: false }).limit(40),
  ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">Admin diagnostics</p>
        <h1 className="mt-2 font-display text-2xl font-bold">AI operations</h1>
        <p className="mt-2 text-sm text-foreground/50">Orchestration logs, memory snapshots, failed automations, and WhatsApp-ready message generations.</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Metric label="Logs" value={logs?.length ?? 0} />
        <Metric label="Snapshots" value={memories?.length ?? 0} />
        <Metric label="Failures" value={failures?.length ?? 0} />
        <Metric label="WhatsApp drafts" value={whatsappMessages?.length ?? 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Metric label="Automation queue" value={automationQueue?.length ?? 0} />
        <Metric label="Automation logs" value={automationLogs?.length ?? 0} />
        <Metric label="Rules" value={automationRules?.length ?? 0} />
        <Metric label="Failed jobs" value={automationQueue?.filter(item => item.status === 'failed').length ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DiagnosticsSection title="Automation queue">
          {(automationQueue ?? []).map(item => (
            <DiagnosticsItem key={item.id} title={`${item.action_type} · ${item.status}`} meta={`${item.attempts ?? 0}/${item.max_attempts ?? 3} attempts · ${item.error_message ?? 'no error'}`} />
          ))}
          {!automationQueue?.length && <Empty label="No automation queue items yet." />}
        </DiagnosticsSection>

        <DiagnosticsSection title="Automation rules">
          {(automationRules ?? []).map(rule => (
            <DiagnosticsItem key={rule.id} title={rule.title ?? rule.id} meta={`${rule.trigger_type} -> ${rule.action_type} · ${rule.is_active ? 'active' : 'disabled'}`} />
          ))}
          {!automationRules?.length && <Empty label="No automation rules yet." />}
        </DiagnosticsSection>

        <DiagnosticsSection title="Automation logs">
          {(automationLogs ?? []).map(log => (
            <DiagnosticsItem key={log.id} title={log.message ?? log.action_type} meta={`${log.status} · ${log.action_type}`} />
          ))}
          {!automationLogs?.length && <Empty label="No automation logs yet." />}
        </DiagnosticsSection>

        <DiagnosticsSection title="Orchestration logs">
          {(logs ?? []).map(log => (
            <DiagnosticsItem key={log.id} title={log.message} meta={`${log.level} · ${log.source}`} />
          ))}
          {!logs?.length && <Empty label="No orchestration logs yet." />}
        </DiagnosticsSection>

        <DiagnosticsSection title="AI memory snapshots">
          {(memories ?? []).map(memory => (
            <DiagnosticsItem key={memory.id} title={memory.summary} meta={memory.memory_type} />
          ))}
          {!memories?.length && <Empty label="No AI memory snapshots yet." />}
        </DiagnosticsSection>

        <DiagnosticsSection title="Automation failures">
          {(failures ?? []).map(failure => (
            <DiagnosticsItem key={failure.id} title={failure.error_message} meta={failure.automation_execution_id} />
          ))}
          {!failures?.length && <Empty label="No failed automations." />}
        </DiagnosticsSection>

        <DiagnosticsSection title="WhatsApp generations">
          {(whatsappMessages ?? []).map(message => (
            <DiagnosticsItem key={message.id} title={message.message} meta={`${message.status} · ${message.channel}`} />
          ))}
          {!whatsappMessages?.length && <Empty label="No WhatsApp-ready messages yet." />}
        </DiagnosticsSection>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-xs text-foreground/40">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function DiagnosticsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-white/5 p-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  )
}

function DiagnosticsItem({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
      <p className="line-clamp-2 text-sm text-foreground/75">{title}</p>
      <p className="mt-2 text-xs text-foreground/35">{meta}</p>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-foreground/40">{label}</p>
}
