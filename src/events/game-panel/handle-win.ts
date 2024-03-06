import { ChannelType, Colors, EmbedBuilder, Events, Interaction } from "discord.js";
import db from "../../utils/database";
import { Match } from "../../types/match";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.guild) return;
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith("match-w-")) return;
    await interaction.deferReply({ ephemeral: false });
    const matchId = interaction.customId.split("-")[2];

    const matchWinner = interaction.values[0]?.split("-+-");

    if (!matchWinner) {
      await interaction.editReply({
        content: "Not Able to fetch the winner. Something went wrong!",
      });
      return;
    }

    const match = await (await db()).collection<Match>("matches").findOneAndUpdate(
      {
        matchId,
      },
      {
        $set: {
          winner_ID: matchWinner[0],
          winner_Name: matchWinner[1],
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!match?._id) {
      await interaction.reply({
        content: "Match Not Found in the Database!?",
        ephemeral: true,
      });
      return;
    }

    if (!match) {
      await interaction.editReply({
        content: "Match Not Found in the Database! Contact the Developer!",
      });
      return;
    }
    const tchannel = interaction.guild.channels.cache.get(match.matchMsgChannel);
    if (!tchannel || tchannel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        content: "Match Not Found in the Database! Did the channel get deleted? Contact the Developer!",
      });
      return;
    }
    const tmsg = await tchannel.messages.fetch(match.matchMsgId);

    const embed = tmsg.embeds[0];

    const newEmbed = new EmbedBuilder()
      .setTitle("Match Completed")
      .setDescription(`Match has been Accepted by <@${interaction.user.id}>\n` + embed?.description)
      .addFields(embed?.fields || [])
      .addFields({
        name: "Winner Details",
        value: `Winner: <@${match.winner_ID}>\nWinner Name: ${match.winner_Name}`,
      })
      .setColor("#00ffff")
      .setTimestamp();

    tmsg.edit({
      content: `Match Completed - <@${match.player1_ID}> | <@${match.player2_ID}>\n Winner: <@${match.winner_ID}>`,
      embeds: [newEmbed],
      components: [],
    });
    await interaction.editReply({
      content: "Match Winner Updated!",
    });
  },
};
