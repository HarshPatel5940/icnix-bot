import {
  ActionRowBuilder,
  ChannelType,
  Colors,
  EmbedBuilder,
  Events,
  Interaction,
  StringSelectMenuBuilder,
} from "discord.js";
import db from "../utils/database";
import { Match } from "../types";

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
        content: "Les ID de bouton ne sont pas complets. Quelque chose s'est mal passé!",
      });
      return;
    }

    if (interaction.user.id !== OpponentID && interaction.user.id !== userID) {
      await interaction.editReply({
        content: "Tu ne peux pas accepter le match que tu inities ou tu n'es pas l'adversaire!",
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
      if (!tmsg) {
        await interaction.editReply({
          content: "Correspondance introuvable dans la base de données! Le message a-t-il été supprimé?",
        });
        return;
      } else {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`match-w-${matchID}`)
          .setPlaceholder("Choisissez le gagnant par son nom!")
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
          .setDescription(
            `update: La correspondance a été acceptée par <@${interaction.user.id}>\n` + embed?.description,
          )
          .addFields(embed?.fields || [])
          .setColor(Colors.Green)
          .setTimestamp();

        await tmsg.edit({
          content: `Match Acceptted! - <@${match.player1_ID}> | <@${match.player2_ID}>\nRevenez et mettez à jour le résultat après le match!`,
          embeds: tmsg.embeds[0] ? [newEmbed] : [],
          components: [actionRow],
        });
      }

      await interaction.editReply({
        content: "Match accepté! Revenez et mettez à jour le résultat après le match!",
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
        content: "Vous avez accepté le match! En attendant que l'adversaire accepte le match!",
      });
    }
  },
};
