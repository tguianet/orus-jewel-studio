export type OperationState = "idle" | "loading" | "success" | "error";

export type OperationSnapshot<T> = {
  state: OperationState;
  data: T | null;
  error: unknown;
  correlationId: string | null;
};
