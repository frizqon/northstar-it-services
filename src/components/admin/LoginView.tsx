import type { JSX } from 'preact';
import { useState } from 'preact/hooks';

interface LoginViewProps {
  onSuccess: (username: string) => void;
}

export function LoginView({ onSuccess }: LoginViewProps): JSX.Element {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      onSuccess(data.user?.username || username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="login-shell">
      <div class="login-card">
        <div class="login-header">
          <span class="brand-mark" aria-hidden="true">✳</span>
          <h1>Content Studio</h1>
          <p>Enter your administrator credentials to manage Northstar content.</p>
        </div>

        {error && (
          <div class="notice error" role="alert">
            {error}
          </div>
        )}

        <form class="login-form" onSubmit={handleSubmit}>
          <label class="field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
              required
              autoComplete="username"
            />
          </label>

          <label class="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
              placeholder="••••••••••••"
              autoComplete="current-password"
              autoFocus
            />
          </label>

          <button type="submit" class="button button-lime login-button" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating…' : 'Sign in to Studio'} <span aria-hidden="true">→</span>
          </button>
        </form>

        <div class="login-footer">
          <a href="/">← Return to public website</a>
        </div>
      </div>
    </div>
  );
}
