import { match } from "assert";
import { ObjectId } from "mongodb";
import { z } from "zod";

export const MatchSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  matchId: z.string(),
  player1_ID: z.string(),
  player1_name: z.string(),
  player2_ID: z.string(),
  player2_name: z.string(),

  matchMsgChannel: z.string(),
  matchMsgId: z.string(),

  winner: z.number().optional(),

  isDraw: z.boolean().optional().default(false),
  isCompleted: z.boolean().optional().default(false),
  isAccepted: z.boolean().optional().default(false),

  playedAt: z.date().optional(),
  updatedAt: z
    .date()
    .optional()
    .default(() => new Date()),
});

export type Match = z.infer<typeof MatchSchema>;
