import ProjectsManager from '@/components/admin/ProjectsManager'

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Projectos</h1>
        <p className="text-zinc-500 mt-1">Gere os projectos da empresa.</p>
      </div>
      <ProjectsManager />
    </div>
  )
}