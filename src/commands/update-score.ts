import { ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface";
import db from "../utils/database";
import { DiscordUser } from "../types";

export default {
  data: new SlashCommandBuilder()
    .setName("update-score")
    .setDescription("Update your Apex Legends nickname")
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName("user").setDescription("Le profil de l'utilisateur que vous souhaitez voir").setRequired(true),
    )
    .addStringOption(option =>
      option.setName("score-fixe").setDescription("Met à jour le score du rang actuel").setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user") || interaction.user;
    const newScore = Number(interaction.options.getString("score-fixe"));
    if (!newScore || newScore < 0 || newScore > 50) {
      await interaction.reply({
        content: "Score invalide. Le score doit être compris entre 0 et 50.",
      });
      return;
    }

    const userData = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
      {
        userId: user.id,
      },
      {
        $set: {
          apexScore: newScore,
        },
      },
      {
        upsert: false,
        returnDocument: "after",
      },
    );

    if (!userData || !userData._id) {
      await interaction.reply({
        content: "Utilisateur non enregistré",
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Mise à jour du score Apex")
      .setDescription(`Votre score Apex Legends a été mis à jour en ${newScore}`)
      .setColor(Colors.Green)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
} as Command;
