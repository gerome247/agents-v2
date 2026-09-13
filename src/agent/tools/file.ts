import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs/promises";
import nodePath from "node:path";

export const readFile = tool({
  description: "Reads the full contents of a file at the given path, always use this to read a file",
  inputSchema: z.object({
    path: z.string().describe("The relative or absolute path to the file to read.")
  }),
  execute: async ({ path }) => {
    try {
      const content = await fs.readFile(path, "utf-8");
      return content;
    } catch (e) {
      return `There was an error reading the file, here is the native error from node.js: ${e}`;
    }
  }
});

export const writeFile = tool({
  description: 'Write content to a file at a specified given path. Creates the file if it does not exist and overwrites if it does.',
  inputSchema:z.object({
    path: z.string().describe("The path to the file to write to"),
    content: z.string().describe("the content to write to the file")
  }),
  execute: async ({ path, content }) => {
    try {
      const dir = nodePath.dirname(path);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path, content, "utf-8");
      return `Successfully wrote ${content.length} characters to ${path}.`
    } catch(e) {
      return `Was not able to write to that path, here is the node.js ${e}`
    }
  }
});

/**
 * List files in a directory
 */
export const listFiles = tool({
  description:
    "List all files and directories in the specified directory path.",
  inputSchema: z.object({
    directory: z
      .string()
      .describe("The directory path to list contents of")
      .default("."),
  }),
  execute: async ({ directory }: { directory: string }) => {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      const items = entries.map((entry) => {
        const type = entry.isDirectory() ? "[dir]" : "[file]";
        return `${type} ${entry.name}`;
      });
      return items.length > 0
        ? items.join("\n")
        : `Directory ${directory} is empty`;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return `Error: Directory not found: ${directory}`;
      }
      return `Error listing directory: ${err.message}`;
    }
  },
});

/**
 * Delete a file
 */
export const deleteFile = tool({
  description:
    "Delete a file at the specified path. Use with caution as this is irreversible.",
  inputSchema: z.object({
    path: z.string().describe("The path to the file to delete"),
  }),
  execute: async ({ path: filePath }: { path: string }) => {
    try {
      await fs.unlink(filePath);
      return `Successfully deleted ${filePath}`;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return `Error: File not found: ${filePath}`;
      }
      return `Error deleting file: ${err.message}`;
    }
  },
});