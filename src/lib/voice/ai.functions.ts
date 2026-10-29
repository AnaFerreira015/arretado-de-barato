import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { voiceTextSchema, voiceContextSchema } from "./ai.schema";

export const interpretVoice = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ text: voiceTextSchema, context: voiceContextSchema.optional() }).strict(),
  )
  .handler(async ({ data }) => {
    const { interpretVoiceText } = await import("./ai.server");
    return interpretVoiceText(data.text, data.context);
  });
