const LOGIN_FALLBACK_MESSAGE = 'We could not sign you in right now. Check your email and password, then try again.';
const REGISTRATION_FALLBACK_MESSAGE = 'We could not create your account right now. Check your details, then try again.';

const extractRawAuthMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object') return '';

  const candidate = error as {
    message?: unknown;
    response?: {
      data?: {
        message?: unknown;
      };
    };
  };

  const responseMessage = candidate.response?.data?.message;
  if (typeof responseMessage === 'string') return responseMessage;

  return typeof candidate.message === 'string' ? candidate.message : '';
};

const normalizeAuthMessage = (message: string): string => (
  message.replace(/\s+/g, ' ').trim()
);

const toSafeAuthMessage = (error: unknown, fallbackMessage: string): string => {
  const rawMessage = normalizeAuthMessage(extractRawAuthMessage(error));
  const lowerMessage = rawMessage.toLowerCase();

  if (!rawMessage) return fallbackMessage;
  if (lowerMessage.includes('invalid login credentials')) return 'Invalid login credentials';
  if (lowerMessage.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (lowerMessage.includes('already registered') || lowerMessage.includes('already exists')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (lowerMessage.includes('password') && (
    lowerMessage.includes('at least 8') ||
    lowerMessage.includes('minimum of 8') ||
    lowerMessage.includes('weak')
  )) {
    return 'Use a password with at least 8 characters.';
  }
  if (lowerMessage.includes('valid email') || lowerMessage.includes('invalid email')) {
    return 'Enter a valid email address.';
  }
  if (lowerMessage.includes('too many') || lowerMessage.includes('rate limit')) {
    return 'Too many attempts. Wait a moment, then try again.';
  }

  return fallbackMessage;
};

export const getSafeLoginErrorMessage = (error: unknown): string => (
  toSafeAuthMessage(error, LOGIN_FALLBACK_MESSAGE)
);

export const getSafeRegistrationErrorMessage = (error: unknown): string => (
  toSafeAuthMessage(error, REGISTRATION_FALLBACK_MESSAGE)
);
