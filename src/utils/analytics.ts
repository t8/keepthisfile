// Google Analytics event tracking utilities

type UploadType = 'free' | 'paid';

interface UploadEventParams {
  type: UploadType;
  fileSize?: number;
  fileType?: string;
  transactionId?: string;
}

interface PaymentEventParams {
  amount: number;
  currency?: string;
  sessionId?: string;
}

interface AuthEventParams {
  method: 'magic-link';
}

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
};

// Upload events
export const trackUploadComplete = ({ type, fileSize, fileType, transactionId }: UploadEventParams) => {
  trackEvent('upload_complete', {
    upload_type: type,
    file_size: fileSize,
    file_type: fileType,
    transaction_id: transactionId,
  });
};

export const trackUploadStarted = (type: UploadType) => {
  trackEvent('upload_started', {
    upload_type: type,
  });
};

// Payment events
export const trackCheckoutStarted = ({ amount, currency = 'usd', sessionId }: PaymentEventParams) => {
  trackEvent('begin_checkout', {
    value: amount,
    currency,
    items: [{ item_name: 'file_storage', price: amount }],
    session_id: sessionId,
  });
};

export const trackPaymentComplete = ({ amount, currency = 'usd', sessionId }: PaymentEventParams) => {
  trackEvent('purchase', {
    value: amount,
    currency,
    transaction_id: sessionId,
    items: [{ item_name: 'file_storage', price: amount }],
  });
};

// Auth events
export const trackSignUp = ({ method }: AuthEventParams) => {
  trackEvent('sign_up', {
    method,
  });
};

export const trackLogin = ({ method }: AuthEventParams) => {
  trackEvent('login', {
    method,
  });
};

// Magic link specific events
export const trackMagicLinkRequested = () => {
  trackEvent('magic_link_requested');
};

export const trackMagicLinkVerified = (isNewUser: boolean) => {
  if (isNewUser) {
    trackSignUp({ method: 'magic-link' });
  } else {
    trackLogin({ method: 'magic-link' });
  }
};
