// Button component
export function Button({ children, variant = 'primary', className = '', loading = false, disabled, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };

  return (
    <button
      className={`${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="spinner mr-2" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Input component
export function Input({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label htmlFor={props.id} className="label">{label}</label>}
      <input
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

// Select component
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div>
      {label && <label htmlFor={props.id} className="label">{label}</label>}
      <select
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

// Textarea component
export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div>
      {label && <label htmlFor={props.id} className="label">{label}</label>}
      <textarea
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        rows={3}
        {...props}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

// Card component
export function Card({ children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

// Card Header component
export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Badge component
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

// Empty state component
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-12">
      {Icon && <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Loading skeleton
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Modal component
export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Alert component
export function Alert({ type = 'info', title, children }) {
  const types = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`p-4 border rounded-lg ${types[type]}`}>
      {title && <p className="font-medium">{title}</p>}
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

// Stat card component
export function StatCard({ label, value, icon: Icon, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 text-primary-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="card">
      <div className="flex items-center justify-center gap-4">
        {Icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <p className="text-xs text-gray-600">{label}</p>
          <p className="text-md font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
