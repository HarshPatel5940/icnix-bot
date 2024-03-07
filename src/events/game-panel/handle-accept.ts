import {
  ActionRowBuilder,
  ChannelType,
  Colors,
  EmbedBuilder,
  Events,
  Interaction,
  StringSelectMenuBuilder,
} from "discord.js";
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
    let match;

    if (!userID || !OpponentID || !matchID) {
      await interaction.editReply({
        content: "Button ID's are not complete. Something went wrong!",
      });
      return;
    }

    if (interaction.user.id !== OpponentID && interaction.user.id !== userID) {
      await interaction.editReply({
        content: "You can't accept the match you initiate or you are not the opponent!",
      });

      return;
    }

    if (interaction.user.id === OpponentID) {
      match = await (await db()).collection<Match>("matches").findOneAndUpdate(
        { matchId: matchID },
        {
          $set: {
            isAcceptedByP2: true,
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
        { matchId: matchID },
        {
          $set: {
            isAcceptedByP1: true,
            updatedAt: new Date(),
          },
        },
        {
          upsert: false,
          returnDocument: "after",
        },
      );
    }

    if (match?.isAcceptedByP1 && match?.isAcceptedByP2) {
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
              value: `${match.player1_ID}-+-${match.player1_name}`,
            },
            {
              label: match.player2_name,
              value: `${match.player2_ID}-+-${match.player2_name}`,
            },
            {
              label: "Draw",
              value: "draw",
            },
          ]);

        const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
        const embed = tmsg.embeds[0];

        const newEmbed = new EmbedBuilder()
          .setTitle("Match Appected")
          .setDescription(`update: Match has been Accepted by <@${interaction.user.id}>\n` + embed?.description)
          .addFields(embed?.fields || [])
          .setColor(Colors.Green)
          .setTimestamp();

        await tmsg.edit({
          content: `Match Acceptted! - <@${match.player1_ID}> | <@${match.player2_ID}>\nCome Back and update the result after the match!`,
          embeds: tmsg.embeds[0] ? [newEmbed] : [],
          components: [actionRow],
        });
      }

      await interaction.editReply({
        content: "Match Accepted! Come Back and update the result after the match!",
      });

      await (await db()).collection<Match>("matches").findOneAndUpdate(
        { matchId: matchID },
        {
          $set: {
            playedAt: new Date(),
          },
        },
      );
    } else {
      await interaction.editReply({
        content: "You Accepted the Match! Waiting for the opponent to accept the match!",
      });
    }
  },
};
