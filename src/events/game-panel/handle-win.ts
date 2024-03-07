import { ChannelType, EmbedBuilder, Events, Interaction } from "discord.js";
import db from "../../utils/database";
import { Match } from "../../types/match";
import { DiscordUser } from "../../types";
import { seasonRanksArray, seasonStartRanksArray } from "../../utils/ranks";
import { BlobOptions } from "buffer";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.guild) return;
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith("match-w-")) return;
    await interaction.deferReply({ ephemeral: false });
    let matchWinner, match, winnerDetails, looserDetails;
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

    if (!match?.winnerChosenByP1 || !match?.winnerChosenByP2) {
      await interaction.editReply({
        content: `<@${interaction.user.id}> has chosen the winner! Now wait for the opponent to choose the winner for confirmation!`,
      });
      return;
    }

    if (match?.winnerChosenByP1?.trim() && match?.winnerChosenByP2?.trim()) {
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
      content: "Match Completed. Updating details...",
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
      winnerDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
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

      looserDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
        { userId: match.winner_ID === match.player1_ID ? match.player2_ID : match.player1_ID },
        {
          $inc: { apexPlayed: 1, apexTotalPlayed: 1, apexLose: 1 },
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
      content: "Match Details Updated in the Database!\nChecking Ranks of the players...",
    });

    if (winnerDetails?.apexRank === "unranked") {
      if (winnerDetails?.apexPlayed === 8) {
        winnerDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          { userId: winnerDetails?.userId },
          {
            $set: { apexRank: seasonStartRanksArray[winnerDetails?.apexWin || "0"], apexScore: 0 },
          },
          {
            upsert: false,
            returnDocument: "after",
          },
        );
        await interaction.followUp({
          content: `Congratulations <@${winnerDetails?.userId}>! Your rank has been set to ${winnerDetails?.apexRank}! Use \`/profile\` to check your profile!`,
        });
      }

      if (looserDetails?.apexPlayed === 8) {
        looserDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          { userId: looserDetails?.userId },
          {
            $set: { apexRank: seasonStartRanksArray[looserDetails?.apexWin || "0"] },
          },
          {
            returnDocument: "after",
          },
        );
        await interaction.followUp({
          content: `Congratulations <@${looserDetails?.userId}>! Your rank has been set to ${looserDetails?.apexRank}! Use \`/profile\` to check your profile!`,
        });
      }

      await interaction.editReply({
        content: "Match Details Updated in the Database!",
      });
    } else {
      if (match.winner_ID === "draw") {
        const drawDeails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          { userId: { $in: [match.player1_ID, match.player2_ID] } },
          {
            $inc: { apexScore: 2 },
          },
          {
            returnDocument: "after",
          },
        );
        if (!drawDeails) {
          await interaction.editReply({
            content: "Not Able to update the Draw details!",
          });
          return;
        }
        await interaction.editReply({
          content: "Added points for both P1 and P2",
        });
      } else {
        winnerDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          { userId: match.winner_ID },
          {
            $inc: {
              apexScore: 2,
            },
          },
          {
            returnDocument: "after",
          },
        );
        if (!winnerDetails) {
          await interaction.editReply({
            content: "Failed while updating Points for P1",
          });
          return;
        }

        await interaction.editReply({
          content: "Added Points for P1, checking the rank.",
        });

        winnerDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          {
            userId: winnerDetails.userId,
          },
          {
            $set: {
              apexRank: seasonRanksArray[seasonRanksArray.indexOf(winnerDetails.apexRank) + 1],
              apexScore: winnerDetails.apexScore - 50,
            },
          },
          {
            returnDocument: "after",
          },
        );

        if (!winnerDetails) {
          await interaction.editReply({
            content: "Failed while updating Points",
          });
        }

        await interaction.editReply({
          content: "Updated Ranks for Winner, updating points for P2",
        });

        if (!looserDetails) {
          await interaction.editReply({
            content: "Failed while updating ranks for P2",
          });
          return;
        }

        let pointsRemoved: number = 0;
        if (seasonRanksArray.indexOf(looserDetails.apexRank) < seasonRanksArray.indexOf("Diamant 3")) {
          pointsRemoved = 1;
        } else {
          pointsRemoved = 2;
        }

        looserDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          {
            userId: looserDetails.userId,
          },
          {
            $inc: {
              apexScore: -pointsRemoved,
            },
          },
        );

        if (!looserDetails) {
          await interaction.editReply({
            content: "Failed while updating Points for P2",
          });
          return;
        }

        await interaction.editReply({
          content: "Updated Points for P2, Updating Ranks...",
        });

        let isDepromoted: boolean = false;

        if (looserDetails.apexScore - pointsRemoved <= 0) {
          isDepromoted = true;
        }

        if (isDepromoted) {
          looserDetails = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
            {
              userId: looserDetails.userId,
            },
            {
              $set: {
                // todo: check if the points are getting subtracted
                apexRank: seasonRanksArray[seasonRanksArray.indexOf(looserDetails.apexRank) - 1],
              },
            },
          );
        }

        await interaction.editReply({
          content: "Updated Match Details and Player Details",
        });
      }
    }
  },
};
