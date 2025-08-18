// Privacy-focused analytics for Farm-Guru
interface AnalyticsEvent {
  event_name: string;
  payload: Record<string, any>;
}

class Analytics {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  }

  async track(eventName: string, payload: Record<string, any> = {}): Promise<void> {
    try {
      // Remove any PII before sending
      const sanitizedPayload = this.sanitizePayload(payload);
      
      await fetch(`${this.baseUrl}/api/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_name: eventName,
          payload: sanitizedPayload,
        }),
      });
    } catch (error) {
      console.error('Analytics error:', error);
      // Fail silently to not disrupt user experience
    }
  }

  private sanitizePayload(payload: Record<string, any>): Record<string, any> {
    const sanitized = { ...payload };
    
    // Remove common PII fields
    delete sanitized.email;
    delete sanitized.name;
    delete sanitized.phone;
    delete sanitized.address;
    
    return sanitized;
  }

  // Common events
  pageView(page: string) {
    this.track('page_view', { page });
  }

  querySubmitted(queryType: string, confidence?: number) {
    this.track('query_submitted', { type: queryType, confidence });
  }

  featureUsed(feature: string) {
    this.track('feature_used', { feature });
  }

  errorOccurred(error: string, component?: string) {
    this.track('error_occurred', { error, component });
  }
}

export const analytics = new Analytics();