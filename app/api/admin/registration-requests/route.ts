import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

const inviteSchema = z.object({
  email: z.string().email().transform(v => v.trim().toLowerCase()),
  renew: z.boolean().optional().default(false),
})

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await db.registrationInvite.updateMany({
    where: { status: 'PENDING', expiresAt: { lte: new Date() } },
    data: { status: 'EXPIRED' },
  })

  const invites = await db.registrationInvite.findMany({ orderBy: { createdAt: 'desc' } })
  const employeeIds = invites.flatMap(invite => invite.employeeId ? [invite.employeeId] : [])
  const requests = employeeIds.length === 0 ? [] : await db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, name: true, email: true, role: true, accessStatus: true, accessReviewedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

  return NextResponse.json({ invites, requests })
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const parsed = inviteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  const email = parsed.data.email

  const [existingEmployee, activeInvite] = await Promise.all([
    db.employee.findUnique({ where: { email } }),
    db.registrationInvite.findFirst({ where: { email, status: 'PENDING', expiresAt: { gt: new Date() } } }),
  ])
  if (existingEmployee) return NextResponse.json({ error: 'Já existe um utilizador com este email.' }, { status: 409 })
  if (activeInvite && !parsed.data.renew) {
    return NextResponse.json({ error: 'Já existe um convite válido para este email.' }, { status: 409 })
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, '')
  if (!appUrl) {
    return NextResponse.json({ error: 'APP_URL não está configurado no servidor.' }, { status: 500 })
  }

  if (activeInvite) {
    await db.registrationInvite.update({ where: { id: activeInvite.id }, data: { status: 'RENEWED' } })
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  const invite = await db.registrationInvite.create({
    data: { email, invitedById: admin.id, expiresAt },
  })

  try {
    // The installed Clerk SDK predates expiresInDays in its TypeScript types,
    // although the Backend API already accepts it.
    const invitationParams = {
      emailAddress: email,
      redirectUrl: `${appUrl}/sign-up?invite=${invite.id}`,
      publicMetadata: { registrationInviteId: invite.id },
      notify: true,
      ignoreExisting: true,
      expiresInDays: 1,
    }
    const clerkInvite = await clerkClient.invitations.createInvitation(invitationParams)
    const saved = await db.registrationInvite.update({
      where: { id: invite.id }, data: { clerkInvitationId: clerkInvite.id },
    })
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    await db.registrationInvite.update({ where: { id: invite.id }, data: { status: 'FAILED' } })
    return NextResponse.json({ error: 'Não foi possível enviar o convite pelo Clerk.' }, { status: 502 })
  }
}
