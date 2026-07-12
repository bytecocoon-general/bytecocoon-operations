import { SignUp } from '@clerk/nextjs'
import { db } from '@/lib/db'

export default async function SignUpPage({ searchParams }: { searchParams: { invite?: string } }) {
  const invite = searchParams.invite
    ? await db.registrationInvite.findUnique({ where: { id: searchParams.invite } })
    : null
  const valid = invite?.status === 'PENDING' && invite.expiresAt > new Date()

  if (!valid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Convite necessário</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Este registo não tem um convite válido. Peça a um administrador um novo convite; cada convite é válido durante uma hora.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <SignUp afterSignUpUrl="/registration-status" />
    </div>
  )
}
