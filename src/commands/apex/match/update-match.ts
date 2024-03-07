import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../../interface";
import db from "../../../utils/database";
import { Match } from "../../../types/match";

export default {
  data: new SlashCommandBuilder()
    .setName("update-match")
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
    const matchID = interaction.options.getString("match-id");
    if (!matchID || !matchID.startsWith("mid_")) {
      await interaction.reply({
        content: "L'ID de correspondance fourni n'est pas valide",
      });
      return;
    }
    await interaction.deferReply({ ephemeral: true });

    const data = await (await db()).collection<Match>("matches").findOne({ matchId: matchID });
    if (!data) {
      await interaction.editReply({
        content: "Aucune correspondance n'a été trouvée avec l'ID de correspondance fourni",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Match Details")
      .setDescription(`MatchID: \`${data.matchId}\`\nMatch Played at: \`${data.playedAt}\``)
      .addFields(
        {
          name: "Player 1",
          value: data.player1_name,
          inline: true,
        },
        {
          name: "Player 2",
          value: data.player2_name,
          inline: true,
        },
      )
      .addFields(
        {
          name: "Completed ?",
          value: data.isCompleted ? "Yes" : "No",
          inline: true,
        },
        {
          name: "Draw ?",
          value: data.isDraw ? "Yes" : "No",
          inline: true,
        },
        {
          name: "Accepted By Both ?",
          value: data.isAcceptedByP1 && data.isAcceptedByP2 ? "Match Accepted By Both" : "Not Yet Accepted By Both",
          inline: true,
        },
      )
      .setColor(Colors.Blurple);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mu-+-${data.player1_ID}-+-${data.player1_name}-+-${matchID}`)
        .setLabel("Declare P1 Winner")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`mu-+-${data.player2_ID}-+-${data.player2_name}-+-${matchID}`)
        .setLabel("Declare P2 Winner")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`mu-+-draw-+-draw-+-${matchID}`)
        .setLabel("Declare Draw")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setLabel("View Log Msg")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${interaction.guildId}/${data.matchMsgChannel}/${data.matchMsgId}`),
    );

    await interaction.editReply({
      embeds: [embed],
      components: [actionRow],
    });
  },
} as Command;
