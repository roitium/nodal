import { GeneralCode } from "@/utils/code";

export function fail({
  message,
  code,
  traceId,
}: {
  message: string;
  code: number;
  traceId: string;
}) {
  return {
    data: null,
    error: message,
    traceId,
    code,
    timestamp: Date.now(),
  };
}

export function success<T>({ data, traceId }: { data: T; traceId: string }) {
  return {
    data,
    error: null,
    traceId,
    code: GeneralCode.Success,
    timestamp: Date.now(),
  };
}
