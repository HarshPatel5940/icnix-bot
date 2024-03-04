import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { DiscordUser } from "../../types";
import db from "../../utils/database";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;

    if (interaction.customId === "apex-nick") {
      const Name = new TextInputBuilder()
        .setCustomId("apex-name")
        .setLabel("Votre nom d'utilisateur Apex")
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setMaxLength(50);

      const FirstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(Name);
      const modal = new ModalBuilder().setCustomId(`apex-nick-${interaction.user.id}`).setTitle("Entrez Votre Pseudo");
      modal.addComponents(FirstActionRow);

      await interaction.showModal(modal);
    } else if (interaction.customId === "apex-platform") {
      const pcButton = new ButtonBuilder().setCustomId("apex-p-pc").setLabel("PC").setStyle(ButtonStyle.Secondary);
      const ps5Button = new ButtonBuilder().setCustomId("apex-p-ps5").setLabel("PS5").setStyle(ButtonStyle.Secondary);
      const ps4Button = new ButtonBuilder().setCustomId("apex-p-ps4").setLabel("PS4").setStyle(ButtonStyle.Secondary);
      const switchButton = new ButtonBuilder()
        .setCustomId("apex-p-switch")
        .setLabel("Switch")
        .setStyle(ButtonStyle.Secondary);

      const FirstActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        pcButton,
        ps5Button,
        ps4Button,
        switchButton,
      );

      const platformEmbed = new EmbedBuilder()
        .setTitle("Menu de la plate-forme")
        .setDescription("Sélectionnez votre plate-forme dans laquelle vous jouez à apex");

      await interaction.reply({ embeds: [platformEmbed], components: [FirstActionRow], ephemeral: true });
    } else if (interaction.customId.startsWith("apex-p-")) {
      await interaction.deferReply({ ephemeral: true });
      const platform = interaction.customId.split("-")[2];
      try {
        const data = await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
          { userId: Number(interaction.user.id) },
          {
            $set: {
              username: interaction.user.username,
              apexPlatform: platform,
              updatedAt: new Date(),
            },
          },
          { upsert: true, returnDocument: "after" },
        );
        await interaction.editReply({
          content: `Votre plate-forme apex a été définie sur ${platform}`,
        });
        if (!data?.apexName) {
          await interaction.followUp({
            content: "Enregistrez également votre nom d'utilisateur Apex",
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: "Votre pseudo et votre plate-forme ont été enregistrés avec succès!",
            ephemeral: true,
          });
        }
      } catch (e) {
        await interaction.editReply({
          content: "Une erreur s'est produite lors de l'enregistrement de votre plate-forme apex",
        });
      }
    }
  },
};
