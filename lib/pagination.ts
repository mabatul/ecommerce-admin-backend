import { ValidationError } from "./errors";

// A cursor is just the last returned productId: enough to rebuild the
// DynamoDB ExclusiveStartKey for both the table scan and the category index.
export function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id })).toString("base64url");
}

export function decodeCursor(cursor: string): string {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed?.id === "string" && parsed.id.length > 0 && parsed.id.length <= 200) {
      return parsed.id;
    }
  } catch {
    // fall through
  }
  throw new ValidationError("Invalid cursor");
}
