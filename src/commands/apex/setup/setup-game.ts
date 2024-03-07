import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  Colors,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandChannelOption,
} from "discord.js";
import { Command } from "../../../interface";

export default {
  data: new SlashCommandBuilder()
    .setName("setup-game-panel")
    .setDescription("This will setup the 1v1 game panel")
    .addChannelOption((option: SlashCommandChannelOption) => {
      return option
        .setName("channel")
        .setDescription("Sélectionnez un canal dans lequel configurer le panneau de jeu 1v1.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    })
    .addChannelOption((option: SlashCommandChannelOption) => {
      return option
        .setName("log-channel")
        .setDescription("Sélectionnez un canal dans lequel les gens acceptent les défis")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    const channelId = (interaction.options.getChannel("channel")?.id || interaction.channelId) as string;
    const logChannelId = (interaction.options.getChannel("log-channel")?.id || interaction.channelId) as string;
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Cette commande ne peut être utilisée que dans un canal texte.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Panneau de jeu 1v1")
      .setDescription("Bienvenue \n dans le monde impitoyable du 1v1. \n Appuyer sur Go pour rechercher un match")
      .setColor(Colors.Blurple)
      .setFooter({
        text: "1v1 Game Panel",
      });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`apex-go-${logChannelId}`).setLabel("Go").setStyle(ButtonStyle.Primary),
    );

    await channel.send({ embeds: [embed], components: [actionRow] });
    await interaction.reply({ content: "La configuration du panneau de jeu 1v1 est terminée" });
  },
} as Command;
