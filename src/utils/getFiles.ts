import { glob } from "glob";
import * as path from "path";

export async function getFiles(dir: string): Promise<string[]> {
  const files: string[] = (await glob(`./build/${dir}/**/*.js`)).map(file => path.resolve(file));
  console.log(`Found ${files.length} files in ${dir}`);

  return files;
}
