import { Outlet } from 'react-router-dom'
import { Wallet } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary via-primary/90 to-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Wallet className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold">Wally</h1>
          </div>
          <p className="text-xl text-center text-white/90 max-w-md leading-relaxed">
            Your secure digital wallet for seamless money transfers
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-3xl font-bold">Fast</div>
              <div className="text-sm text-white/70">Instant transfers</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold">Secure</div>
              <div className="text-sm text-white/70">Bank-level security</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold">Simple</div>
              <div className="text-sm text-white/70">Easy to use</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="p-2 bg-primary rounded-lg">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Wally</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
