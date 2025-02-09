import {
  type Intent,
  type Submission,
  parse as baseParse,
  formatPaths,
} from "@conform-to/dom";
export const conformMessage = {
  VALIDATION_SKIPPED: "__skipped__",
  VALIDATION_UNDEFINED: "__undefined__",
};
import type { StandardSchemaV1 } from "@standard-schema/spec";

type ErrorType = Record<string, string[] | null> | null;

export function parseWithStandardSchema<Schema extends StandardSchemaV1>(
  payload: FormData | URLSearchParams,
  config: {
    schema: Schema | ((intent: Intent | null) => Schema);
    async?: boolean;
  },
):
  | Submission<StandardSchemaV1.InferOutput<Schema>>
  | Promise<Submission<StandardSchemaV1.InferOutput<Schema>>> {
  return baseParse<StandardSchemaV1.InferOutput<Schema>, string[]>(payload, {
    resolve(payload, intent) {
      const originalSchema =
        typeof config.schema === "function"
          ? config.schema(intent)
          : config.schema;
      const result = originalSchema["~standard"].validate(payload);
      const resolveResult = (
        result:
          | StandardSchemaV1.Result<Schema>
          | Promise<StandardSchemaV1.Result<Schema>>,
      ):
        | { value: StandardSchemaV1.InferOutput<Schema> }
        | { error: ErrorType } => {
        if (result instanceof Promise) {
          throw new Error("Async validation is not supported");
        }
        if (isError(result)) {
          const error = result.issues.reduce<ErrorType>((result, issue) => {
            if (
              result === null ||
              issue.message === conformMessage.VALIDATION_UNDEFINED
            ) {
              return null;
            }

            const name = formatPaths(
              issue.path?.map((d) =>
                isPropertyKey(d)
                  ? (d.key as string | number)
                  : (d as string | number),
              ) ?? [],
            );

            result[name] =
              result[name] === null ||
              issue.message === conformMessage.VALIDATION_SKIPPED
                ? null
                : [...(result[name] ?? []), issue.message];

            return result;
          }, {});
          return {
            error,
          };
        }
        return { value: result.value };
      };

      const resolveAsyncResult = async (
        result: Promise<StandardSchemaV1.Result<Schema>>,
      ): Promise<
        { value: StandardSchemaV1.InferOutput<Schema> } | { error: ErrorType }
      > => {
        return resolveResult(await result);
      };

      if (!config.async) {
        return resolveResult(result as StandardSchemaV1.Result<Schema>);
      }
      return resolveAsyncResult(
        result as Promise<StandardSchemaV1.Result<Schema>>,
      );
    },
  });
}

function isError<T>(
  result: StandardSchemaV1.Result<T>,
): result is StandardSchemaV1.FailureResult {
  return "issues" in result;
}

function isPropertyKey(value: unknown): value is StandardSchemaV1.PathSegment {
  return value instanceof Object && "key" in value;
}
