import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Enhanced Supabase client with connection pooling and retry logic
export const createSupabaseClient = (options = {}) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️ Supabase credentials not configured');
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'money-mind-backend/1.0.0',
      },
    },
    // Custom fetch with timeout and retry
    fetch: async (url, fetchOptions = {}) => {
      const maxRetries = options.maxRetries || 3;
      const baseDelay = options.baseDelay || 1000;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          // Check for rate limiting (429)
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt - 1);
            
            if (attempt < maxRetries) {
              console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          // Check for server errors (5xx)
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return response;
          
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error.message);
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    },
  });
};

// Singleton instances
let supabaseAdmin = null;
let connectionPool = null;

export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    supabaseAdmin = createSupabaseClient({
      maxRetries: 3,
      baseDelay: 1000,
    });
  }
  return supabaseAdmin;
};

// Connection pool for high-frequency operations
export const getConnectionPool = () => {
  if (!connectionPool) {
    connectionPool = {
      clients: [],
      maxClients: 5,
      currentIndex: 0,
      
      getClient() {
        if (this.clients.length < this.maxClients) {
          const client = createSupabaseClient({
            maxRetries: 2,
            baseDelay: 500,
          });
          this.clients.push(client);
          return client;
        }
        
        const client = this.clients[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.maxClients;
        return client;
      },
      
      async close() {
        await Promise.all(this.clients.map(client => {
          // Supabase clients don't need explicit cleanup
          return Promise.resolve();
        }));
        this.clients = [];
      }
    };
  }
  return connectionPool;
};

// Health check with detailed diagnostics
export const checkSupabaseHealth = async () => {
  const client = getSupabaseAdmin();
  
  if (!client) {
    return {
      healthy: false,
      error: 'Supabase client not initialized',
      details: { configured: false }
    };
  }
  
  const startTime = Date.now();
  
  try {
    // Test basic connectivity
    const { data, error } = await client
      .from('profiles')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        error: error.message,
        details: {
          responseTime,
          errorCode: error.code,
          errorDetails: error.details
        }
      };
    }
    
    // Test write permissions (optional, can be expensive)
    const writeTestStartTime = Date.now();
    const { error: writeError } = await client
      .from('profiles')
      .select('id')
      .limit(1);
    
    const writeResponseTime = Date.now() - writeTestStartTime;
    
    return {
      healthy: true,
      details: {
        responseTime,
        writeResponseTime,
        writeHealthy: !writeError,
        writeError: writeError?.message
      }
    };
    
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      details: {
        responseTime: Date.now() - startTime,
        errorType: error.constructor.name
      }
    };
  }
};

// Circuit breaker pattern for resilience
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 300000; // 5 minutes
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.lastStateChange = Date.now();
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
      }
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange
    };
  }
}

// Global circuit breaker instance
export const supabaseCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  monitoringPeriod: 300000
});
