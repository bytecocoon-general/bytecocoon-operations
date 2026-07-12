import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
  }

  // Verificar a assinatura do Clerk
  const headerPayload = await headers()
  const svix_id        = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Headers svix em falta' }, { status: 400 })
  }

  const payload = await req.json()
  const body    = JSON.stringify(payload)
  const wh      = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      'svix-id':        svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  // Reagir ao evento de criação de utilizador
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data

    const email     = email_addresses[0]?.email_address
    const fullName  = [first_name, last_name].filter(Boolean).join(' ') || email

    if (!email) {
      return NextResponse.json({ error: 'Email em falta' }, { status: 400 })
    }

    const inviteId = typeof public_metadata?.registrationInviteId === 'string'
      ? public_metadata.registrationInviteId
      : null
    const invite = inviteId ? await db.registrationInvite.findUnique({ where: { id: inviteId } }) : null
    const normalizedEmail = email.toLowerCase()

    if (!invite || invite.email !== normalizedEmail || invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      if (invite?.status === 'PENDING' && invite.expiresAt <= new Date()) {
        await db.registrationInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } })
      }
      return NextResponse.json({ error: 'Convite inválido, expirado ou não corresponde ao email.' }, { status: 403 })
    }

    // Garantir que existe pelo menos um departamento por defeito
    const defaultDept = await db.department.upsert({
      where:  { name: 'Por Definir' },
      update: {},
      create: { name: 'Por Definir' },
    })

    // Criar o Employee (se ainda não existir)
    const employee = await db.employee.upsert({
      where:  { clerkId: id },
      update: {},
      create: {
        clerkId:      id,
        name:         fullName,
        email:        email,
        hourlyRate:   0,           // Admin define depois
        role:         'EMPLOYEE',  // Role por defeito
        accessStatus: 'PENDING',
        isActive:     false,
        departmentId: defaultDept.id,
      },
    })

    await db.registrationInvite.update({
      where: { id: invite.id },
      data: { status: 'REGISTERED', registeredAt: new Date(), employeeId: employee.id },
    })

    console.log(`✅ Employee criado para: ${email}`)
  }

  return NextResponse.json({ received: true })
}
