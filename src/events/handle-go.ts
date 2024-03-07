import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  EmbedBuilder,
  Events,
  Interaction,
} from "discord.js";
import { DiscordUser } from "../types";
import db from "../utils/database";
import crypto from "crypto";
import { Match } from "../types/match";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    const user = interaction.user;
    if (!user) return;

    if (!interaction.customId.startsWith("apex-go-")) return;
    await interaction.deferReply({ ephemeral: true });
    const channelId = interaction.customId.split("-")[2];

    if (!channelId) {
      await interaction.editReply({
        content: "ID de canal de journal introuvable! Veuillez configurer à nouveau le panneau de jeu!",
      });
      return;
    }
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      await interaction.editReply({
        content: "Canal de journal introuvable! Veuillez configurer à nouveau le panneau de jeu!",
      });
      return;
    }

    if (channel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        content: "Cette commande ne peut être utilisée que dans un canal texte.",
      });
      return;
    }

    await interaction.editReply({
      content: "À la recherche d'une correspondance...",
    });

    const data = await (await db()).collection<DiscordUser>("discord-users").findOne({ userId: user.id });
    if (!data) {
      await interaction.editReply({
        content: "Vous devez d'abord configurer votre compte",
      });
      return;
    }
    const myRank = data.apexRank;

    const matches = await (
      await db()
    )
      .collection<DiscordUser>("discord-users")
      .find({
        apexRank: myRank,
        userId: { $ne: user.id },
      })
      .toArray();

    const opponent: DiscordUser | undefined = matches[Math.floor(Math.random() * matches.length)];
    if (!opponent) {
      await interaction.editReply({
        content: "Aucune correspondance n'a été trouvée dans votre rang!",
      });
      return;
    }

    const matchID = `mid_${crypto.randomUUID().replaceAll("-", "")}`;

    const embed = new EmbedBuilder()
      .setTitle("Match Found")
      .setDescription(
        `Vous avez été jumelé avec quelqu'un. Vérifiez les détails ci-dessous !\n\n ID de match : \`${matchID}\``,
      )
      .setColor(Colors.Blurple)
      .addFields(
        {
          name: "Opponent 1",
          value: `name: ${data.apexName} - ${data.apexPlatform} \n rank: ${data.apexRank}`,
          inline: true,
        },
        {
          name: "Opponent 2",
          value: `name: ${opponent.apexName} - ${opponent.apexPlatform} \n rank: ${opponent.apexRank}`,
          inline: true,
        },
      )
      .setTimestamp();

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`match-a-${user.id}-${opponent.userId}-${matchID}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`match-d-${user.id}-${opponent.userId}-${matchID}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger),
    );

    const tmsg = await channel.send({
      content: `Match trouvé! Consultez les détails ci-dessous! - <@${user.id}> | <@${opponent.userId}>`,
      embeds: [embed],
      components: [actionRow],
    });

    await (await db()).collection<Match>("matches").findOneAndUpdate(
      { matchId: matchID },
      {
        $set: {
          matchMsgChannel: channel.id,
          matchMsgId: tmsg.id,
          player1_ID: user.id,
          player1_name: user.username,
          player2_ID: `${opponent.userId}`,
          player2_name: opponent.username,
          isDraw: false,
          isAccepted: false,
          isCompleted: false,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    await interaction.editReply({
      content: `Match trouvé! Vérifiez les détails par [**cliquez ici** 🔗 ](${tmsg.url}) - <#${tmsg.channel.id}>`,
    });
  },
};
