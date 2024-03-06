import { ActionRowBuilder, ChannelType, Events, Interaction, StringSelectMenuBuilder } from "discord.js";
import db from "../../utils/database";
import { Match } from "../../types/match";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const user = interaction.user;
    if (!user) return;

    if (!interaction.customId.startsWith("match-a-")) return;
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

    if (interaction.user.id !== OpponentID) {
      if (interaction.user.id !== userID) {
        await interaction.editReply({
          content: "You initiated the match, You automatically accept the match!",
        });
        return;
      } else {
        await interaction.editReply({
          content: "You can't accept the match you initiate or you are not the opponent!",
        });
        return;
      }
    }

    const match = await (await db()).collection<Match>("matches").findOneAndUpdate(
      { matchId: matchID },
      {
        $set: {
          isAccepted: true,
          updatedAt: new Date(),
        },
      },
      {
        upsert: false,
        returnDocument: "after",
      },
    );

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
    if (!tmsg) {
      await interaction.editReply({
        content: "Match Not Found in the Database! Did the message get deleted? Contact the Developer!",
      });
      return;
    } else {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`match-w-${matchID}`)
        .setPlaceholder("Choose the Winner by his name!")
        .addOptions([
          {
            label: match.player1_name,
            value: `${match.player1_ID}`,
          },
          {
            label: match.player2_name,
            value: `${match.player2_ID}`,
          },
        ]);

      const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      await tmsg.edit({
        content: "Match Acceptted! \nCome Back and update the result after the match!",
        embeds: tmsg.embeds[0] ? [tmsg.embeds[0]] : [],
        components: [actionRow],
      });
    }

    await interaction.editReply({
      content: "Match Accepted! Come Back and update the result after the match!",
    });
  },
};