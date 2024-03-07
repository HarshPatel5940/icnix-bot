import { ChannelType, Colors, Embed, EmbedBuilder, Events, Interaction } from "discord.js";
import db from "../utils/database";
import { Match } from "../types/match";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const user = interaction.user;
    if (!user) return;

    if (!interaction.customId.startsWith("match-d-")) return;
    await interaction.deferReply({ ephemeral: true });

    const userID = interaction.customId.split("-")[2];
    const OpponentID = interaction.customId.split("-")[3];
    const matchID = interaction.customId.split("-")[4];
    if (!userID || !OpponentID || !matchID) {
      await interaction.editReply({
        content: "Button ID's are not complete. Something went wrong!",
      });
      return;
    }

    if (interaction.user.id !== OpponentID && interaction.user.id !== userID) {
      await interaction.editReply({
        content: "You can't decline the match you didn't initiate or you are not the opponent!",
      });
      return;
    }

    const match = await (await db()).collection<Match>("matches").findOneAndUpdate(
      { matchId: matchID },
      {
        $set: {
          isAccepted: false,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      },
    );

    if (!match?._id) {
      await interaction.editReply({
        content: "Correspondance introuvable dans la base de données!",
      });
      return;
    }
    const tChannelId = match.matchMsgChannel.toString();
    const tchannel = interaction.guild.channels.cache.get(tChannelId);
    if (!tchannel?.id) {
      await interaction.editReply({
        content: "Canal de journal introuvable !",
      });
      return;
    }
    if (tchannel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        content: "Type de canal non valide !",
      });
      return;
    }
    const tmsg = await tchannel.messages.fetch(`${match.matchMsgId}`);
    if (!tmsg.id) {
      await interaction.editReply({
        content: "Impossible de récupérer le message !",
      });
      return;
    }

    const embed: Embed | undefined = tmsg.embeds[0];

    const newEmbed = new EmbedBuilder()
      .setTitle("Match Declined")
      .setDescription(`Match has been declined by <@${interaction.user.id}>\n` + embed?.description)
      .addFields(embed?.fields || [])
      .setColor(Colors.Red)
      .setTimestamp();

    await tmsg.edit({
      content: "Match Declined! \nYou can search for a new match by clicking the 'go' button again!",
      embeds: tmsg.embeds[0] ? [newEmbed] : [],
      components: [],
    });

    await interaction.editReply({
      content: 'Match Declined! You can search for a new match by clicking the "go" button again!',
    });
  },
};
