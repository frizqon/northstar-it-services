export type TurnstileVerification = {
  success: boolean;
  errors: string[];
};

type TurnstileResponse = {
  success?: boolean;
  'error-codes'?: string[];
};

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * The caller must only invoke this when TURNSTILE_SECRET_KEY is configured.
 */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp?: string,
  fetcher: typeof fetch = fetch
): Promise<TurnstileVerification> {
  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body,
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return { success: false, errors: [`http_${response.status}`] };
    }

    const data = (await response.json()) as TurnstileResponse;
    return {
      success: data.success === true,
      errors: Array.isArray(data['error-codes']) ? data['error-codes'] : []
    };
  } catch {
    return { success: false, errors: ['verification_unavailable'] };
  }
}
