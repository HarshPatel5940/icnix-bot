import {
  Events,
  Interaction,
  EmbedBuilder,
  ColorResolvable,
  ChannelType,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalBuilder,
} from "discord.js";
import db from "../utils/database";
import { ObjectId } from "mongodb";
import { COLOR, FOOTER_VALUE } from "../config/constant";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction: Interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.guild) return;
    const [button, channelId, messageId, action] = interaction.customId.split("-");
    if (button === "delete") {
      if (!messageId || !channelId) {
        await interaction.reply({ content: "Invalid data received", ephemeral: true });
        return;
      }
      const channel = await interaction.client.channels.fetch(channelId);
      if (!channel) return;
      // @ts-expect-error: type issue with discord.js
      const message = await channel.messages.fetch(messageId);
      await message.delete();
      await interaction.reply({ content: "Deleted Successfully", ephemeral: true });
    }
  },
};
