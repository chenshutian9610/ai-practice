import { MCPServerConfig } from './types.js';

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^224\./,
  /^240\./,
  /^localhost$/i,
  /\.local$/i,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMCPServerURL(url: string): ValidationResult {
  // Check protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'URL must use http or https protocol' };
  }

  try {
    const urlObj = new URL(url);

    // Check hostname against private IP patterns
    const hostname = urlObj.hostname;
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'URL cannot point to internal/private network addresses' };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export function validateMCPServerConfig(config: Partial<MCPServerConfig>): ValidationResult {
  if (!config.name || config.name.trim() === '') {
    return { valid: false, error: 'Server name is required' };
  }

  // Must have either URL or command/args
  const hasHttp = config.url && config.url.trim() !== '';
  const hasStdio = config.command && config.command.trim() !== '';

  if (!hasHttp && !hasStdio) {
    return { valid: false, error: 'Server must have either URL (HTTP) or command/args (Stdio) configured' };
  }

  if (hasHttp) {
    return validateMCPServerURL(config.url);
  }

  return { valid: true };
}
