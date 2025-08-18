// Enhanced privacy-focused analytics for Farm-Guru with robust error handling
interface AnalyticsEvent {
  event_name: string;
  payload: Record<string, any>;
}

class Analytics {
  private baseUrl: string;
  private isEnabled: boolean;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    this.isEnabled = true;
  }

  async track(eventName: string, payload: Record<string, any> = {}): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Comprehensive PII removal and payload sanitization
      const sanitizedPayload = this.sanitizePayload(payload);
      
      // Validate event name
      if (!eventName || typeof eventName !== 'string') {
        console.warn('Analytics: Invalid event name provided');
        return;
      }

      const eventData: AnalyticsEvent = {
        event_name: eventName,
        payload: sanitizedPayload,
      };

      // Use fetch with timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      await fetch(`${this.baseUrl}/api/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (error) {
      // Fail silently but log for debugging
      if (error instanceof Error && error.name !== 'AbortError') {
        console.debug('Analytics tracking failed:', error.message);
      }
      // Never throw errors to avoid disrupting user experience
    }
  }

  private sanitizePayload(payload: Record<string, any>): Record<string, any> {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const sanitized: Record<string, any> = {};
    
    // List of PII fields to remove
    const piiFields = [
      'email', 'name', 'phone', 'address', 'aadhaar', 'pan', 'mobile',
      'firstName', 'lastName', 'fullName', 'phoneNumber', 'emailAddress',
      'personalInfo', 'contact', 'identity', 'location', 'coordinates',
      'lat', 'lng', 'latitude', 'longitude', 'gps', 'ip', 'ipAddress'
    ];
    
    for (const [key, value] of Object.entries(payload)) {
      // Skip PII fields
      if (piiFields.some(pii => key.toLowerCase().includes(pii.toLowerCase()))) {
        continue;
      }
      
      // Sanitize nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizePayload(value);
      } 
      // Truncate long strings to prevent data leakage
      else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      }
      // Keep safe primitive values
      else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Keep safe arrays (but limit size)
      else if (Array.isArray(value) && value.length <= 10) {
        sanitized[key] = value.map(item => 
          typeof item === 'object' ? this.sanitizePayload(item) : item
        );
      }
    }
    
    return sanitized;
  }

  // Enhanced common event methods with validation
  pageView(page: string) {
    if (typeof page === 'string' && page.length > 0) {
      this.track('page_view', { page: page.substring(0, 50) });
    }
  }

  querySubmitted(queryType: string, confidence?: number) {
    const payload: Record<string, any> = { type: queryType };
    if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
      payload.confidence = Math.round(confidence * 100) / 100; // Round to 2 decimals
    }
    this.track('query_submitted', payload);
  }

  featureUsed(feature: string) {
    if (typeof feature === 'string' && feature.length > 0) {
      this.track('feature_used', { feature: feature.substring(0, 50) });
    }
  }

  errorOccurred(error: string, component?: string) {
    const payload: Record<string, any> = { 
      error: typeof error === 'string' ? error.substring(0, 100) : 'Unknown error'
    };
    if (component && typeof component === 'string') {
      payload.component = component.substring(0, 50);
    }
    this.track('error_occurred', payload);
  }

  // Disable analytics (for privacy compliance)
  disable() {
    this.isEnabled = false;
  }

  // Re-enable analytics
  enable() {
    this.isEnabled = true;
  }
}

export const analytics = new Analytics();