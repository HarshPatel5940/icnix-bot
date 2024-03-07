import { ChannelType, EmbedBuilder, Events, Interaction } from "discord.js";
import db from "../utils/database";
import { Match } from "../types/match";
import { DiscordUser } from "../types";
import { seasonRanksArray, seasonStartRanksArray } from "../utils/ranks";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.guild) return;
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith("match-w-")) return;
    await interaction.deferReply({ ephemeral: false });
    let match, winnerDetails, looserDetails;
    const matchId = interaction.customId.split("-")[2];

    const innteractionValues = interaction.values[0]?.split("-+-");
    match = await (await db()).collection<Match>("matches").findOne({ matchId });
    const matchWinner = innteractionValues?.length === 2 ? innteractionValues : "draw";

    if (!matchWinner || !matchId || !match) {
      await interaction.editReply({
        content: "Impossible d'aller chercher le gagnant. Quelque chose s'est mal passé !",
      });
      return;
    }

    if (match.isCompleted) {
      await interaction.editReply({
        content: "Le match est déjà terminé!",
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
        content: "Vous n'êtes pas le joueur de ce match !",
      });
      return;
    }

    if (!match?.winnerChosenByP1 || !match?.winnerChosenByP2) {
      await interaction.editReply({
        content: `<@${interaction.user.id}> a choisi le gagnant ! Attendez maintenant que l'adversaire choisisse le gagnant pour confirmer !`,
      });
      return;
    }

    if (match?.winnerChosenByP1?.trim() && match?.winnerChosenByP2?.trim()) {
      if (match?.winnerChosenByP1 !== match?.winnerChosenByP2) {
        await interaction.editReply({
          content:
            "Les deux joueurs ont un gagnant différent! Le match ne peut pas être terminé! Si nécessaire, contactez le personnel pour résoudre ce problème!",
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
        content: "Correspondance introuvable dans la base de données!",
      });
      return;
    }
    const tchannel = interaction.guild.channels.cache.get(match.matchMsgChannel);
    if (!tchannel || tchannel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        content: "Correspondance introuvable dans la base de données! La chaîne a-t-elle été supprimée?",
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
      content: "Match terminé. Mise à jour des détails...",
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
      content:
        "Les détails du match ont été mis à jour dans la base de données !\nVérification des rangs des joueurs...",
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
        content: "Les détails du match ont été mis à jour dans la base de données !",
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
          content: "Ajout de points pour P1, en vérifiant le rang...",
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
          return;
        }

        await interaction.editReply({
          content: "Mise à jour des rangs pour le vainqueur, mise à jour des points pour la P2",
        });

        if (!looserDetails) {
          await interaction.editReply({
            content: "Failed while updating ranks for P2",
          });
          return;
        }

        let pointsRemoved = 0;
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
          content: "Mise à jour des points pour P2, mise à jour des rangs...",
        });

        let isDepromoted = false;

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
          content: "Mise à jour des détails du match et des joueurs",
        });
      }
    }
  },
};
