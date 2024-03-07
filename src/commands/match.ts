import { ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface";
import db from "../utils/database";
import { Match } from "../types/match";

export default {
  data: new SlashCommandBuilder()
    .setName("match")
    .setDescription("Mettre à jour les détails d'un match en cours")
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName("match-id")
        .setDescription("Entrez l'ID de correspondance avec lequel vous souhaitez effectuer la mise à jour")
        .setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const matchId = interaction.options.getString("match-id");
    if (!matchId) return;
    if (!matchId.startsWith("mid_")) return;

    await interaction.reply({
      content: `Fetching Deatils for Match ID: \`${matchId}\``,
    });

    const match = await (await db()).collection<Match>("matches").findOne({ matchId });

    if (!match) {
      await interaction.editReply({
        content: `No Match found with ID: \`${matchId}\``,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Match Details")
      .setDescription(`Match ID: \`${match.matchId}\``)
      .addFields(
        {
          name: "Player 1",
          value: `Name: ${match.player1_name}`,
          inline: true,
        },
        {
          name: "Player 2",
          value: `Name: ${match.player2_name}`,
          inline: true,
        },
        {
          name: "Match Status",
          value: `Accepted by P1: ${match.isAcceptedByP1}\nAccepted by P2: ${match.isAcceptedByP2}`,
          inline: true,
        },
        {
          name: "Winner",
          value: `ID: ${match.winner_ID}\nName: ${match.winner_Name}`,
          inline: true,
        },
        {
          name: "Match Status",
          value: `Draw: ${match.isDraw}\nCompleted: ${match.isCompleted}`,
          inline: true,
        },
        {
          name: "Misc Details",
          value: `Played At: ${match.playedAt}`,
          inline: true,
        },
      )
      .setColor(Colors.Green)
      .setTimestamp()
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      });

    await interaction.editReply({
      content: "Match Details Fetched Successfully!",
      embeds: [embed],
    });
  },
} as Command;
