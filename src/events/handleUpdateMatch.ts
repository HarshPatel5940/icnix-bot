import { Colors, EmbedBuilder, Events, Interaction } from "discord.js";
import db from "../utils/database";
import { Match } from "../types";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;
    if (!interaction.customId.startsWith("mu-+-")) return;
    await interaction.deferReply({ ephemeral: false });

    const [declare, declareId, declareName, matchId] = interaction.customId.split("-+-");

    if (!declareId || !matchId) {
      console.log(declareId, declareName, matchId);
      await interaction.reply({
        content: "Incomplete button ID. Something went wrong!",
        ephemeral: true,
      });
      return;
    }

    let match;
    if (declare !== "draw") {
      match = await (await db()).collection<Match>("matches").findOneAndUpdate(
        { matchId: matchId },
        {
          $set: {
            winner_ID: declareId,
            winner_Name: declareName,
            isCompleted: true,
            updatedAt: new Date(),
          },
        },
        {
          upsert: false,
          returnDocument: "after",
        },
      );
    } else {
      match = await (await db()).collection<Match>("matches").findOneAndUpdate(
        { matchId },
        {
          $set: {
            winner_ID: declareId,
            winner_Name: declareName,
            isDraw: true,
            isCompleted: true,
            updatedAt: new Date(),
          },
        },
        {
          upsert: false,
          returnDocument: "after",
        },
      );
      console.log(match);
    }

    if (!match?._id) {
      await interaction.editReply({
        content: "Match not updated!",
      });
      return;
    }

    // isCompleted ? match.winner_Name ? "Draw" : "Not Yet Declared"
    let winner = "None";
    if (match.isDraw) {
      winner = "Draw";
    } else {
      winner = match.winner_Name ? match.winner_Name : "Not Yet Declared";
    }

    const embed = new EmbedBuilder()
      .setTitle("Match Details Updated")
      .setDescription(
        `MatchID: \`${match.matchId}\`\nMatch Played at: \`${match.playedAt}\`\nUpdated By: <@${interaction.user.id}>`,
      )
      .addFields(
        {
          name: "Player 1",
          value: match.player1_name,
          inline: true,
        },
        {
          name: "Player 2",
          value: match.player2_name,
          inline: true,
        },
        {
          name: "Winner",
          value: winner,
          inline: true,
        },
      )
      .setColor(Colors.Green)
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
