/**
 * Central place that resolves AWS runtime configuration from environment
 * variables. Nothing in this file (or anywhere downstream) should ever
 * hardcode a LocalStack URL, a table name, or a bucket name — this is the
 * one seam between "local development" and "real AWS" (spec section 26).
 *
 *   AWS_ENDPOINT_URL set   -> LocalStack (or any AWS-compatible endpoint)
 *   AWS_ENDPOINT_URL empty -> real AWS, default SDK credential/endpoint chain
 */

export const region = process.env.AWS_REGION || "us-east-1";

export const endpoint = process.env.AWS_ENDPOINT_URL?.trim() || undefined;

export const isLocalStack = Boolean(endpoint);

export const projectName = process.env.PROJECT_NAME || "ecommerce-admin";

export const environment = process.env.ENVIRONMENT || "local";

/**
 * LocalStack does not validate credentials, but the SDK still requires
 * *something* to be present. Real AWS should rely on the default provider
 * chain (instance role, ECS task role, CI-injected env vars, etc.) rather
 * than static keys, so we only inject explicit credentials when talking to
 * a local/custom endpoint.
 */
export function resolveCredentials() {
  if (!isLocalStack) return undefined;

  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  };
}

/**
 * Resolves a DynamoDB table's physical name, matching the naming convention
 * defined in infrastructure/cloudformation/main.yaml
 * (`${ProjectName}-${Environment}-<Entity>`), so application code never
 * needs its own copy of table names.
 */
export function tableName(entity: "Users" | "Categories" | "Products" | "Carts" | "Wishlists") {
  return `${projectName}-${environment}-${entity}`;
}

export function frontendBucketName() {
  return `${projectName}-${environment}-frontend`;
}
