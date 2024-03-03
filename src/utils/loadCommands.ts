import { Collection, REST, Routes } from "discord.js";
import { Command } from "../interface";
import config from "../config";
import { getFiles } from "./getFiles";

const commands: Collection<string, Command> = new Collection();
const commandsData: JSON[] = [];

export async function loadCommands() {
  const files = await getFiles("commands");

  await Promise.all(
    files.map(async (file: string) => {
      try {
        const { default: command } = (await import(file)).default;
        if (!command.data.name) {
          console.log(`Invalid Event File: ${file}`);
          return;
        }
        commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON());
      } catch (err) {
        console.log(`Failed to Load Event: ${file.split("/").pop()}`);
      }
    }),
  );
  console.log(`Loaded ${commands.size} commands.`);
}

export async function registerSlashCommands() {
  const rest = new REST().setToken(config.BOT_TOKEN);

  const setCommands = (await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), {
    body: commandsData,
  })) as unknown[];
  console.log(`Successfully registered ${setCommands.length} application commands.`);
}

export function getCommands() {
  return commands;
}
