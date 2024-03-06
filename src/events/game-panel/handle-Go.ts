import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  Embed,
  EmbedBuilder,
  Events,
  Interaction,
  StringSelectMenuBuilder,
} from "discord.js";
import { DiscordUser } from "../../types";
import db from "../../utils/database";
import crypto from "crypto";
import { Match } from "../../types/match";

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
        content: "Log Channel ID Not Found! Please Setup Game Panel Again!",
      });
      return;
    }
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      await interaction.editReply({
        content: "Log Channel Not Found! Please Setup Game Panel Again!",
      });
      return;
    }

    if (channel.type !== ChannelType.GuildText) {
      await interaction.editReply({
        content: "This command can only be used in a text channel.",
      });
      return;
    }

    await interaction.editReply({
      content: "Searching for a match...",
    });

    const data = await (await db()).collection<DiscordUser>("discord-users").findOne({ userId: user.id });
    if (!data) {
      await interaction.editReply({
        content: "You need to setup your account first",
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
        content: "No match found in your rank!",
      });
      return;
    }

    const matchID = `mid_${crypto.randomUUID().replaceAll("-", "")}`;

    const embed = new EmbedBuilder()
      .setTitle("Match Found")
      .setDescription(`You have been matched with someone. Check the details below!\n\n Match ID: \`${matchID}\``)
      .setColor("Orange")
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
      content: `Match Found! Check the details below! - <@${user.id}> | <@${opponent.userId}>`,
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
      content: `Match Found! Check the details by [**clicking here** 🔗](${tmsg.url}) - <#${tmsg.channel.id}>`,
    });
  },
};
