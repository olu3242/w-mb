import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createTransferRecipient,
  initiateTransfer,
} from '@/lib/paystack/client'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  const {
    allocation_id,
    provider = 'manual',
    bank_name,
    account_number,
    account_name,
    bank_code,
    notes,
  } = await req.json() as {
    allocation_id: string
    provider?: 'paystack' | 'stripe' | 'manual'
    bank_name?: string
    account_number?: string
    account_name?: string
    bank_code?: string
    notes?: string
  }

  if (!allocation_id) return NextResponse.json({ error: 'Missing allocation_id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: alloc } = await admin
    .from('vendor_allocations')
    .select('id, event_id, vendor_id, amount, status')
    .eq('id', allocation_id)
    .single()

  if (!alloc) return NextResponse.json({ error: 'Allocation not found' }, { status: 404 })
  if (alloc.status !== 'approved') {
    return NextResponse.json({ error: `Allocation must be approved (current: ${alloc.status})` }, { status: 422 })
  }

  // Ownership check
  const { data: ev } = await supabase
    .from('events').select('id').eq('id', alloc.event_id).eq('owner_id', user.id).single()
  if (!ev) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Prevent duplicate payout for same allocation
  const { data: existingPayout } = await admin
    .from('vendor_payouts')
    .select('id, status')
    .eq('allocation_id', allocation_id)
    .in('status', ['pending', 'processing', 'completed'])
    .single()

  if (existingPayout) {
    return NextResponse.json({ error: `Payout already exists (${existingPayout.status})` }, { status: 409 })
  }

  let recipientCode: string | null = null
  let providerRef: string | null = null
  let payoutStatus: 'pending' | 'processing' | 'completed' = 'pending'

  // Paystack transfer flow
  if (provider === 'paystack') {
    if (!account_number || !bank_code || !account_name) {
      return NextResponse.json({ error: 'Bank details required for Paystack transfer' }, { status: 400 })
    }

    // Reuse recipient code if stored on vendor
    const { data: vendor } = await admin
      .from('vendors').select('paystack_recipient_code').eq('id', alloc.vendor_id).single()

    if (vendor?.paystack_recipient_code) {
      recipientCode = vendor.paystack_recipient_code
    } else {
      const recipResult = await createTransferRecipient({
        name: account_name,
        accountNumber: account_number,
        bankCode: bank_code,
      })
      if (!recipResult.status) {
        return NextResponse.json({ error: 'Failed to create transfer recipient' }, { status: 502 })
      }
      recipientCode = recipResult.data.recipient_code
      await admin.from('vendors').update({ paystack_recipient_code: recipientCode }).eq('id', alloc.vendor_id)
    }

    const transferRef = `OWAMBE-PAYOUT-${alloc.id}-${Date.now()}`
    const transfer = await initiateTransfer({
      amountNgn: Number(alloc.amount),
      recipientCode: recipientCode!,
      reason: `Event vendor payment`,
      reference: transferRef,
    })

    if (!transfer.status) {
      return NextResponse.json({ error: transfer.message ?? 'Transfer failed' }, { status: 502 })
    }

    providerRef = transfer.data.transfer_code
    payoutStatus = 'processing'
  } else if (provider === 'manual') {
    payoutStatus = 'pending'
  }

  const { data: payout, error: payoutErr } = await admin
    .from('vendor_payouts')
    .insert({
      event_id: alloc.event_id,
      allocation_id,
      vendor_id: alloc.vendor_id,
      amount: alloc.amount,
      provider,
      provider_reference: providerRef,
      recipient_code: recipientCode,
      bank_name: bank_name ?? null,
      account_number: account_number ?? null,
      account_name: account_name ?? null,
      status: payoutStatus,
      notes: notes ?? null,
    })
    .select('id, status')
    .single()

  if (payoutErr || !payout) {
    return NextResponse.json({ error: 'Failed to create payout record' }, { status: 500 })
  }

  // Manual payouts are auto-completed immediately
  if (provider === 'manual') {
    await admin.rpc('complete_payout', {
      p_payout_id: payout.id,
      p_provider_reference: `MANUAL-${randomUUID()}`,
    })
    return NextResponse.json({ status: 'completed', payout_id: payout.id })
  }

  return NextResponse.json({ status: payoutStatus, payout_id: payout.id, provider_reference: providerRef })
}

// Verify and complete a Paystack processing payout
export async function PATCH(req: NextRequest) {
  const { payout_id } = await req.json() as { payout_id: string }
  if (!payout_id) return NextResponse.json({ error: 'Missing payout_id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: payout } = await admin
    .from('vendor_payouts')
    .select('id, event_id, status, provider, provider_reference')
    .eq('id', payout_id)
    .single()

  if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })

  const { data: ev } = await supabase
    .from('events').select('id').eq('id', payout.event_id).eq('owner_id', user.id).single()
  if (!ev) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (payout.status === 'completed') {
    return NextResponse.json({ status: 'completed', cached: true })
  }

  if (payout.provider === 'paystack' && payout.provider_reference) {
    const { verifyTransfer } = await import('@/lib/paystack/client')
    const result = await verifyTransfer(payout.provider_reference)

    if (result.data?.status === 'success') {
      const { data } = await admin.rpc('complete_payout', {
        p_payout_id: payout_id,
        p_provider_reference: payout.provider_reference,
      })
      return NextResponse.json(data)
    }

    if (result.data?.status === 'failed') {
      await admin.from('vendor_payouts').update({
        status: 'failed',
        failure_reason: 'Transfer failed at provider',
      }).eq('id', payout_id)
      return NextResponse.json({ status: 'failed' })
    }

    return NextResponse.json({ status: payout.status, message: 'Transfer still processing' })
  }

  return NextResponse.json({ error: 'Cannot verify this payout type' }, { status: 400 })
}
