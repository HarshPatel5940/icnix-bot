import { ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "../interface";
import db from "../utils/database";
import { DiscordUser } from "../types";

export default {
  data: new SlashCommandBuilder()
    .setName("update-nick")
    .setDescription("Update your Apex Legends nickname")
    .setDMPermission(false)
    .addUserOption(option =>
      option.setName("user").setDescription("Le profil de l'utilisateur que vous souhaitez voir").setRequired(true),
    )
    .addStringOption(option =>
      option.setName("nouveau-nick").setDescription("Le pseudo que vous souhaitez mettre à jour").setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const user = interaction.options.getUser("user") || interaction.user;
    const newNick = interaction.options.getString("nouveau-nick");

    const userData = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
      {
        userId: user.id,
      },
      {
        $set: {
          apexNick: newNick,
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
      .setTitle("Mise à jour du surnom d'Apex")
      .setDescription(`Votre pseudo Apex Legends a été mis à jour en ${newNick}`)
      .setColor(Colors.Green)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
} as Command;
