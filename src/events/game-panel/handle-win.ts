import { ChannelType, Colors, EmbedBuilder, Events, Interaction } from "discord.js";
import db from "../../utils/database";
import { Match } from "../../types/match";
import { DiscordUser } from "../../types";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.guild) return;
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith("match-w-")) return;
    await interaction.deferReply({ ephemeral: false });
    let matchWinner, match;
    const matchId = interaction.customId.split("-")[2];

    const innteractionValues = interaction.values[0]?.split("-+-");
    match = await (await db()).collection<Match>("matches").findOne({ matchId });
    matchWinner = innteractionValues?.length === 2 ? innteractionValues : "draw";

    if (!matchWinner || !matchId || !match) {
      await interaction.editReply({
        content: "Not Able to fetch the winner. Something went wrong!",
      });
      return;
    }

    if (match.isCompleted) {
      await interaction.editReply({
        content: "Match has already been completed!",
      });
      return;
    }

    if (match.player1_ID === interaction.user.id) {
      match = await (await db()).collection<Match>("matches").findOneAndUpdate(
        {
          matchId,
        },
        {
          $set: {
            winnerChosenByP1: matchWinner[0],
            updatedAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );
    } else if (match.player2_ID === interaction.user.id) {
      match = await (await db()).collection<Match>("matches").findOneAndUpdate(
        {
          matchId,
        },
        {
          $set: {
            winnerChosenByP2: matchWinner[0],
            updatedAt: new Date(),
          },
        },
        {
          returnDocument: "after",
        },
      );
    } else {
      await interaction.editReply({
        content: "You are not the player of this match!",
      });
      return;
    }

    if (match?.winnerChosenByP1 && match?.winnerChosenByP2) {
      if (match?.winnerChosenByP1 !== match?.winnerChosenByP2) {
        await interaction.editReply({
          content:
            "Both players have different winner! Match can't be completed! If needed, Contact Staff for resolving this issue!",
        });
        return;
      }
    }

    match = await (await db()).collection<Match>("matches").findOneAndUpdate(
      {
        matchId,
      },
      {
        $set: {
          winner_ID: matchWinner[0],
          winner_Name: matchWinner[1],
          isCompleted: true,
        },
      },
      {
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
      content: "Match Winner Updating...",
    });

    if (match.winner_ID === "draw") {
      const drawDeails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
        { userId: { $in: [match.player1_ID, match.player2_ID] } },
        {
          $inc: { apexDraw: 1, apexPlayed: 1, apexTotalPlayed: 1 },
        },
        {
          returnDocument: "after",
        },
      );
      if (!drawDeails) {
        await interaction.editReply({
          content: "Not Able to update the Draw details! Contact the Developer!",
        });
        return;
      }
    } else {
      const winnerDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
        { userId: match.winner_ID },
        {
          $inc: { apexWin: 1, apexPlayed: 1, apexTotalPlayed: 1 },
        },
        {
          returnDocument: "after",
        },
      );
      if (!winnerDetails) {
        await interaction.editReply({
          content: "Not Able to update the Winner details!",
        });
        return;
      }

      // update looser details
      const looserDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
        { userId: match.winner_ID === match.player1_ID ? match.player2_ID : match.player1_ID },
        {
          $inc: { apexPlayed: 1, apexTotalPlayed: 1 },
        },
        {
          returnDocument: "after",
        },
      );
      if (!looserDetails) {
        await interaction.editReply({
          content: "Not Able to update the Looser details!",
        });
        return;
      }
    }

    await interaction.editReply({
      content: "Match Winner Updated in the Database!",
    });
  },
};
