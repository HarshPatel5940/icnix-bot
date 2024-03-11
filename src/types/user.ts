import { ObjectId } from "mongodb";
import { z } from "zod";

export const DiscordUserSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  userId: z.string(),
  username: z.string(),

  isActive: z.boolean().optional().default(false),

  apexName: z.string().max(50),
  apexPlatform: z.string().refine(x => {
    ["pc", "ps5", "ps4", "switch", "xbox"].includes(x);
  }, "Invalid platform"),

  apexScore: z.number().min(0).max(50),
  // todo: check if this is a valid rank
  apexRank: z.string().optional().default("unranked"),
  apexKd: z.number().optional().default(0),
  apexPlayed: z.number().optional().default(0),
  apexTotalPlayed: z.number().optional().default(0),

  apexWin: z.number().optional().default(0),
  apexDraw: z.number().optional().default(0),
  apexLose: z.number().optional().default(0),

  isRegisterationComplete: z.boolean().optional().default(false),

  updatedAt: z
    .date()
    .optional()
    .default(() => new Date()),
});

export type DiscordUser = z.infer<typeof DiscordUserSchema>;
