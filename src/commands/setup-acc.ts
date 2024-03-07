import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandChannelOption,
} from "discord.js";
import { Command } from "../interface";

export default {
  data: new SlashCommandBuilder()
    .setName("setup-account-panel")
    .setDescription("This will setup the embeds")
    .addChannelOption((option: SlashCommandChannelOption) => {
      return option
        .setName("channel")
        .setDescription("Sélectionnez un canal dans lequel configurer le panneau du compte.")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    })
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;
    await interaction.deferReply({ ephemeral: false });
    const channelId = (interaction.options.getChannel("channel")?.id || interaction.channelId) as string;
    const channel = interaction.guild.channels.cache.get(channelId);
    if (channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Cette commande ne peut être utilisée que dans un canal texte.",
        ephemeral: true,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Configuration du compte")
      .setDescription("Commençons par enregistrer ton pseudo Apex et ta plateforme.")
      .setColor("Green")
      .setTimestamp();

    const Buttons = [
      new ButtonBuilder().setCustomId("apex-nick").setStyle(ButtonStyle.Secondary).setLabel("Add Psd"),
      new ButtonBuilder().setCustomId("apex-platform").setStyle(ButtonStyle.Secondary).setLabel("Add Platforme"),
    ];

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(Buttons);
    await channel.send({ embeds: [embed], components: [actionRow] });

    await interaction.editReply({ content: "La configuration du panneau de compte est terminée" });
  },
} as Command;
