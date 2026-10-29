/**
 * Shared UI components for authentication pages.
 * SAM Guinée visual identity: marine, gold, red, green, light background.
 */

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

/** Full-page centered card layout for auth forms */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-[#F3F5F9] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* SAM tricolor bar */}
        <div className="w-16 h-1 bg-gradient-to-r from-[#D52B1E] via-[#F2B705] to-[#00A651] mx-auto mb-6 rounded-full" />

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold font-['Poppins'] text-[#0B1B33] text-center mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 text-center mb-6">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-6" />}
          {children}
        </div>

        <p className="text-xs text-slate-400 text-center mt-4 italic">
          SAM Guinée 2027 · « La Guinée roule vers l'avenir. »
        </p>
      </div>
    </main>
  )
}

interface FormFieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  autoComplete?: string
  minLength?: number
  disabled?: boolean
}

export function FormField({
  id, label, type = 'text', value, onChange,
  required = false, placeholder, autoComplete, minLength, disabled = false,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        disabled={disabled}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-[#F2B705]/50 focus:border-[#F2B705]
          disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

interface AlertProps {
  type: 'error' | 'success' | 'info'
  children: React.ReactNode
}

export function Alert({ type, children }: AlertProps) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className={`px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      {children}
    </div>
  )
}

interface SubmitButtonProps {
  loading?: boolean
  children: React.ReactNode
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}

export function SubmitButton({
  loading = false,
  children,
  disabled = false,
  type = 'submit',
  onClick,
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full py-2.5 px-4 bg-[#0B1B33] text-white font-semibold rounded-lg text-sm
        hover:bg-[#0B1B33]/90 focus:outline-none focus:ring-2 focus:ring-[#F2B705]/50
        disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Chargement…
        </span>
      ) : (
        children
      )}
    </button>
  )
}

