/**
 * Convert a value to BigInt or return null if invalid
 */
export function toBigIntOrNull(value: unknown): bigint | null {
   if (value === null || value === undefined) return null;

   try {
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(value);
      if (typeof value === "string") return BigInt(value);
      return null;
   } catch {
      return null;
   }
}

/**
 * Recursively serialize BigInt values to strings in an object
 */
export function serializeBigInt(obj: any): any {
   if (obj === null || obj === undefined) return obj;

   if (typeof obj === "bigint") {
      return obj.toString();
   }

   if (obj instanceof Date) {
      return obj.toISOString();
   }

   if (Array.isArray(obj)) {
      return obj.map(item => serializeBigInt(item));
   }

   if (typeof obj === "object") {
      const result: any = {};
      for (const key in obj) {
         if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = serializeBigInt(obj[key]);
         }
      }
      return result;
   }

   return obj;
}
