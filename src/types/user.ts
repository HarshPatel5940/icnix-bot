import { ObjectId } from "mongodb";
import { z } from "zod";

export const DiscordUserSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.number(),
  username: z.string(),

  apexName: z.string().max(50),
  apexPlatform: z.string().refine(x => {
    ["pc", "ps5", "ps4", "switch"].includes(x);
  }, "Invalid platform"),

  updatedAt: z
    .date()
    .optional()
    .default(() => new Date()),
});

export type DiscordUser = z.infer<typeof DiscordUserSchema>;
