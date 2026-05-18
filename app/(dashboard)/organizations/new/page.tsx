import { OrganizationCreateForm } from '@/components/organizations/organization-create-form'

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Create organization</h1>
      <p className="mt-2 text-sm text-foreground/50">Set up a multi-event community workspace.</p>
      <div className="mt-6">
        <OrganizationCreateForm />
      </div>
    </div>
  )
}
