import { getInvitationTemplate } from '@/lib/invitations/templates'

type InvitationPreviewProps = {
  title: string
  subtitle?: string | null
  body?: string | null
  hostNames?: string | null
  dateTime?: string | null
  venueName?: string | null
  venueAddress?: string | null
  dressCode?: string | null
  rsvpNote?: string | null
  supportNote?: string | null
  templateId?: string | null
  fileUrl?: string | null
  previewUrl?: string | null
}

export function InvitationPreview({
  title,
  subtitle,
  body,
  hostNames,
  dateTime,
  venueName,
  venueAddress,
  dressCode,
  rsvpNote,
  supportNote,
  templateId,
  fileUrl,
  previewUrl,
}: InvitationPreviewProps) {
  const template = getInvitationTemplate(templateId)
  const assetUrl = previewUrl || fileUrl
  const isPdf = assetUrl?.toLowerCase().includes('.pdf')

  if (assetUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        {isPdf ? (
          <div className="grid min-h-80 place-items-center p-8 text-center">
            <p className="text-sm font-semibold text-foreground">Uploaded PDF invitation</p>
            <a href={assetUrl} target="_blank" rel="noreferrer" className="mt-3 rounded-lg border border-white/10 px-4 py-2 text-sm text-foreground/70 hover:border-white/20">
              Open preview
            </a>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl} alt={title} className="max-h-[520px] w-full object-contain" />
        )}
      </div>
    )
  }

  return (
    <article
      className="min-h-[520px] rounded-xl border border-white/10 p-8 shadow-2xl"
      style={{ background: template.palette.background, color: template.palette.text }}
    >
      <div className="flex h-full min-h-[456px] flex-col justify-between rounded-lg border border-white/15 p-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: template.palette.accent }}>
            {subtitle || template.name}
          </p>
          <h2 className="mt-6 font-display text-4xl font-bold leading-tight">{title}</h2>
          {hostNames && <p className="mt-4 text-sm" style={{ color: template.palette.muted }}>Hosted by {hostNames}</p>}
        </div>

        <div className="my-8 grid gap-4">
          {body && <p className="text-base leading-7">{body}</p>}
          <div className="mx-auto h-px w-24" style={{ background: template.palette.accent }} />
          {dateTime && <p className="text-sm font-semibold">{dateTime}</p>}
          {(venueName || venueAddress) && (
            <div className="text-sm" style={{ color: template.palette.muted }}>
              {venueName && <p className="font-semibold">{venueName}</p>}
              {venueAddress && <p>{venueAddress}</p>}
            </div>
          )}
          {dressCode && <p className="text-sm">Dress code: {dressCode}</p>}
        </div>

        <div className="grid gap-2 text-sm" style={{ color: template.palette.muted }}>
          {rsvpNote && <p>{rsvpNote}</p>}
          {supportNote && <p>{supportNote}</p>}
        </div>
      </div>
    </article>
  )
}
