import { useState } from 'react'
import { LogOut, Menu, User, ChevronDown, Key, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { ROLE_LABELS } from '../../lib/roles.js'
import ThemeToggle from './ThemeToggle.jsx'

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  
  // Password change form states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalSuccess, setModalSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    setModalSuccess('')
    setIsSubmitting(true)

    if (!currentPassword || !newPassword) {
      setModalError('Both fields are required.')
      setIsSubmitting(false)
      return
    }

    try {
      const token = localStorage.getItem('transitops_token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })

      const res = await response.json()
      if (!response.ok || !res.success) {
        throw new Error(res.message || 'Incorrect current password or server error.')
      }

      setModalSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      // Refresh page or trigger callback if needed to reload logs
      setTimeout(() => {
        setIsPasswordModalOpen(false)
        setModalSuccess('')
      }, 1500)
    } catch (err) {
      setModalError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 relative z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-stamp border border-border text-ink-muted transition-colors hover:text-ink md:hidden focus:outline-none"
        >
          <Menu size={18} />
        </button>
        <h1 className="font-display text-lg font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        
        {/* User profile dropdown selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-stamp border border-border bg-surface px-3 py-1.5 text-xs text-ink transition-colors hover:bg-paper focus:outline-none"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold">
              {user.name.charAt(0)}
            </span>
            <div className="hidden text-left sm:block">
              <p className="font-semibold text-xs leading-none text-ink">{user.name}</p>
            </div>
            <ChevronDown size={14} className="text-ink-muted" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-52 rounded-stamp border border-border bg-surface py-1 shadow-lg z-50 animate-in fade-in-50 duration-100">
                
                {/* Profile info header */}
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Profile Info</p>
                  <p className="text-xs font-semibold text-ink mt-0.5">{user.name}</p>
                  <p className="text-[10px] font-medium text-ink-muted">{ROLE_LABELS[user.role]}</p>
                </div>

                {/* Dropdown Items */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    setIsPasswordModalOpen(true)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink hover:bg-paper transition-colors"
                >
                  <Key size={13} className="text-ink-muted" />
                  <span>Change Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    // Scroll to bottom activity logs
                    const logsEl = document.getElementById('recentActivityLogs')
                    if (logsEl) {
                      logsEl.scrollIntoView({ behavior: 'smooth' })
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-ink hover:bg-paper transition-colors"
                >
                  <FileText size={13} className="text-ink-muted" />
                  <span>Activity Logs</span>
                </button>

                <hr className="border-border/60 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut size={13} />
                  <span>Log out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-stamp border border-border bg-surface p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-display text-base font-semibold text-ink">Change Password</h2>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false)
                  setModalError('')
                  setModalSuccess('')
                }}
                className="text-ink-muted hover:text-ink"
              >
                <XCircle size={18} className="text-ink-muted" />
              </button>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="mt-4 space-y-4">
              {modalError && (
                <p className="stamp border-danger px-2.5 py-1.5 text-xs text-danger bg-danger/5">{modalError}</p>
              )}
              {modalSuccess && (
                <p className="stamp border-accent px-2.5 py-1.5 text-xs text-accent bg-accent/5 font-semibold">{modalSuccess}</p>
              )}

              <div>
                <label htmlFor="currPass" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  Current Password
                </label>
                <input
                  id="currPass"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="newPass" className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  New Password
                </label>
                <input
                  id="newPass"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-stamp border border-border bg-paper px-3 py-1.5 text-xs text-ink outline-none focus:border-accent font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false)
                    setModalError('')
                    setModalSuccess('')
                  }}
                  className="rounded-stamp border border-border bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-stamp bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 font-semibold"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}

function XCircle({ size, className }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}
