import { ConflictError } from "../errors";

export function isConditionalFailure(error: unknown): boolean {
  return error instanceof Error && error.name === "ConditionalCheckFailedException";
}

// Re-run a read-modify-write when another request changed the item in between.
export async function retryOnConflict<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isConditionalFailure(error)) throw error;
    }
  }
  throw new ConflictError("Your data changed at the same time as this request; please try again");
}
