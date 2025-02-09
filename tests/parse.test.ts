import { check, object, pipe, string } from "valibot";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { conformMessage, parseWithStandardSchema } from "../parse";
import { createFormData } from "./helpers/FormData";

describe("parseWithStandardSchema", () => {
  test("should return null for an error field when its error message is skipped", () => {
    const schema = object({
      key: pipe(
        string(),
        check((input) => input === "valid", conformMessage.VALIDATION_SKIPPED),
      ),
    });
    const output = parseWithStandardSchema(createFormData("key", "invalid"), {
      schema,
    });
    expect(output).toMatchObject({ error: { key: null } });
  });

  test("should return null for an error field when its error message is skipped", () => {
    const schema = z.object({
      kv: z.object({
        key: z.string().regex(/^valid$/, conformMessage.VALIDATION_SKIPPED),
      }),
    });
    const output = parseWithStandardSchema(
      createFormData("kv.key", "invalid"),
      {
        schema,
      },
    );
    expect(output).toMatchObject({ error: { "kv.key": null } });
  });

  test("should return null for the error when any error message is undefined", () => {
    const schema = object({
      key: pipe(
        string(),
        check(
          (input) => input === "valid",
          conformMessage.VALIDATION_UNDEFINED,
        ),
      ),
    });
    const output = parseWithStandardSchema(createFormData("key", "invalid"), {
      schema,
    });
    expect(output).toMatchObject({ error: null });
  });

  test("should return null for the error when any error message is undefined", () => {
    const schema = z.object({
      kv: z.object({
        key: z.string().regex(/^valid r/, conformMessage.VALIDATION_UNDEFINED),
      }),
    });
    const output = parseWithStandardSchema(
      createFormData("kv.key", "invalid"),
      {
        schema,
      },
    );
    expect(output).toMatchObject({ error: null });
  });
});
