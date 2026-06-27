import Link from 'next/link';

export default function Home() {
  const foundationModules = [
    {
      name: 'Next.js 14 App Router',
      description: 'App Router structure with TypeScript, Tailwind CSS v3, and React Context state configuration.',
      status: 'Active',
      files: ['/app/layout.tsx', '/app/page.tsx'],
    },
    {
      name: 'MongoDB & Mongoose 8',
      description: 'Mongoose connection pooling singleton pattern managing MongoDB connections.',
      status: 'Configured',
      files: ['/lib/db.ts'],
    },
    {
      name: 'Authentication JWT',
      description: 'JWT token signing/verification, password hashing via bcryptjs, and withAuth middleware wrapper.',
      status: 'Integrated',
      files: ['/lib/auth.ts'],
    },
    {
      name: 'Nodemailer Email Service',
      description: 'SMTP transporter helper configured to send transactional notifications.',
      status: 'Ready',
      files: ['/lib/email.ts'],
    },
    {
      name: 'OpenAI GPT-4o-mini Client',
      description: 'OpenAI client setup with callAI chat completions helper for AI screening interview.',
      status: 'Initialized',
      files: ['/lib/ai.ts'],
    },
  ];

  const scaffoldFolders = [
    { name: '/app', desc: 'Pages & API route handlers' },
    { name: '/components', desc: 'Shared UI components' },
    { name: '/lib', desc: 'Database, Auth, AI, Email helpers' },
    { name: '/models', desc: 'Mongoose data models' },
    { name: '/types', desc: 'TypeScript interfaces' },
    { name: '/hooks', desc: 'Custom React hooks' },
  ];

  return (
    <div className="relative min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center relative z-10 w-full">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-4 tracking-wide uppercase">
            ⚡ Foundation Scaffold Complete
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-blue-400 via-indigo-200 to-emerald-400 bg-clip-text text-transparent">
            PropAgent
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            AI Tenant Screening & Property Management SaaS. The environment and core engine files are successfully scaffolded and ready for feature implementation.
          </p>
        </div>

        {/* Health Check Badge */}
        <div className="mb-12 flex justify-center">
          <div className="p-6 bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col sm:flex-row items-center gap-6 shadow-xl backdrop-blur-md max-w-xl w-full">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 animate-pulse border border-emerald-500/20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-lg font-bold text-slate-200">System is operational</h2>
              <p className="text-sm text-slate-400">PropAgent is running. All core interfaces and configurations are active.</p>
            </div>
            <Link 
              href="/api/health" 
              className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 whitespace-nowrap self-stretch sm:self-auto justify-center"
            >
              Test API Health 
              <span className="text-xs opacity-75">→</span>
            </Link>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {foundationModules.map((mod, idx) => (
            <div 
              key={idx} 
              className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-700/60 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-200 group-hover:text-blue-400 transition-colors">
                  {mod.name}
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  {mod.status}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">{mod.description}</p>
              <div className="flex flex-wrap gap-2">
                {mod.files.map((file, fIdx) => (
                  <code key={fIdx} className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-300 border border-slate-800">
                    {file}
                  </code>
                ))}
              </div>
            </div>
          ))}

          {/* Directory Conventions Card */}
          <div className="p-6 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-700/60 transition-all duration-300 md:col-span-2">
            <h3 className="font-bold text-lg text-slate-200 mb-4">Folder Structure & Conventions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {scaffoldFolders.map((folder, idx) => (
                <div key={idx} className="p-3 bg-slate-900/50 border border-slate-800/50 rounded-lg">
                  <div className="text-sm font-semibold text-blue-400">{folder.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{folder.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800 text-center text-xs text-slate-500">
        PropAgent Scaffold Version 1.0.0 • Developed with Next.js 14, TypeScript & Tailwind CSS
      </footer>
    </div>
  );
}
