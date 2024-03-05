import { Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface";
import { DiscordUser } from "../types";
import db from "../utils/database";

export default {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Gives your Profile Information")
    .addUserOption(option =>
      option.setName("user").setDescription("The user's profile you want to see").setRequired(false),
    ) as SlashCommandBuilder,

  async execute(interaction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user") || interaction.user;
    const userId = user.id;
    const data = await (await db()).collection<DiscordUser>("discord-users").findOne({ userId: Number(userId) });
    if (!data) {
      await interaction.reply({
        embeds: [
          // french
          new EmbedBuilder()
            .setTitle("Utilisateur non trouvé")
            .setDescription("L'utilisateur n'a pas été trouvé dans la base de données")
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setColor(Colors.Red)
            .setTimestamp()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() }),
        ],
        ephemeral: true,
      });
      return;
    }

    const userInfoEmbed = new EmbedBuilder()
      .setTitle("Statistiques de l'utilisateur")
      .setDescription("Voici les statistiques de l'utilisateur")

      .addFields(
        {
          name: "Nom d'utilisateur Apex",
          value: data.apexName,
          inline: true,
        },
        {
          name: "Plate-forme Apex",
          value: data.apexPlatform,
          inline: true,
        },
        {
          name: "Score Apex",
          value: data.apexScore.toString(),
          inline: true,
        },
        {
          name: "Rang Apex",
          value: data.apexRank,
          inline: true,
        },
        {
          name: "K/D Apex",
          value: data.apexKd.toString(),
          inline: true,
        },
        {
          name: "Joué Apex",
          value: data.apexPlayed.toString(),
          inline: true,
        },
        {
          name: "Total Joué Apex",
          value: data.apexTotalPlayed.toString(),
          inline: true,
        },
        {
          name: "Gagné Apex",
          value: data.apexWin.toString(),
          inline: true,
        },
        {
          name: "Perdu Apex",
          value: data.apexLose.toString(),
          inline: true,
        },
      )
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setTimestamp()
      .setColor("Green");

    await interaction.reply({ embeds: [userInfoEmbed] });
  },
} as Command;
