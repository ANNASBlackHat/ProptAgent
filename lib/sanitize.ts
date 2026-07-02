/**
 * Sanitize a single string by stripping HTML tags.
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  // Strip HTML tags using regex
  return val.replace(/<[^>]*>/g, '');
}

/**
 * Recursively sanitizes all string properties inside an object.
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  // Handle Mongoose documents or standard plain objects
  const rawObj = typeof (obj as any).toObject === 'function' ? (obj as any).toObject() : obj;
  
  const sanitized: any = {};
  for (const key in rawObj) {
    if (Object.prototype.hasOwnProperty.call(rawObj, key)) {
      const val = rawObj[key];
      if (typeof val === 'string') {
        sanitized[key] = sanitizeString(val);
      } else if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
}
