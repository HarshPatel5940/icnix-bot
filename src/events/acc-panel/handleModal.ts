import { Events, Interaction } from "discord.js";
import { DiscordUser } from "../../types";
import db from "../../utils/database";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.guild) return;
    if (!interaction.customId.startsWith("apex-nick")) return;
    await interaction.deferReply({ ephemeral: true });

    const name = interaction.fields.getTextInputValue("apex-name");

    try {
      await (await db()).collection<DiscordUser>("discord-users").findOneAndUpdate(
        { userId: Number(interaction.user.id) },
        {
          $set: {
            apexName: name,
            updatedAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" },
      );

      await interaction.editReply({
        content: `Votre pseudo a été enregistré avec succès! \nSurnom: ${name}`,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "Une erreur s'est produite lors de l'enregistrement de votre pseudo. Veuillez réessayer.",
      });
    }
    return;
  },
};
