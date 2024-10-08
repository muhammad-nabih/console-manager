import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { removeConsoleLogs } from "./removeConsoleLogs";
import { commentConsoleLogs } from "./commentConsoleLogs";

interface ExtensionSettings {
  includedExtensions: string[];
  excludedFolders: string[];
  excludedFiles: string[];
}

export function activate(context: vscode.ExtensionContext) {
  // Remove Console Logs Commands
  registerCommand(
    context,
    "extension.removeConsoleLogsCurrent",
    removeConsoleLogsFromCurrentFile,
  );
  registerCommand(
    context,
    "extension.removeConsoleLogsAll",
    removeConsoleLogsFromAllFiles,
  );

  // Comment Console Logs Commands
  registerCommand(
    context,
    "extension.commentConsoleLogsCurrent",
    commentConsoleLogsInCurrentFile,
  );
  registerCommand(
    context,
    "extension.commentConsoleLogsAll",
    commentConsoleLogsInAllFiles,
  );
}

function registerCommand(
  context: vscode.ExtensionContext,
  commandId: string,
  callback: (...args: any[]) => any,
) {
  let disposable = vscode.commands.registerCommand(commandId, callback);
  context.subscriptions.push(disposable);
}

// Remove Console Logs Functions
async function removeConsoleLogsFromCurrentFile() {
  await processCurrentFile(removeConsoleLogs);
}

async function removeConsoleLogsFromAllFiles() {
  await processAllFiles(removeConsoleLogs);
}

// Comment Console Logs Functions
async function commentConsoleLogsInCurrentFile() {
  await processCurrentFile(commentConsoleLogs);
}

async function commentConsoleLogsInAllFiles() {
  await processAllFiles(commentConsoleLogs);
}

// Utility Functions
async function processCurrentFile(processor: (text: string) => string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return;
  }

  const document = editor.document;
  const text = document.getText();
  const updatedText = processor(text);

  if (text !== updatedText) {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(text.length),
    );
    edit.replace(document.uri, fullRange, updatedText);
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage(
      "Operation Completed Successfully✨✅",
    );
  } else {
    vscode.window.showInformationMessage("No Changes Were Necessary.");
  }
}

async function processAllFiles(processor: (text: string) => string) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage("No workspace folder found.");
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const settings = getSettings();
  const filesProcessed = await processFiles(rootPath, settings, processor);

  vscode.window.showInformationMessage(
    `Processed [ ${filesProcessed} ] Files Successfully✨✅`,
  );
}

async function processFiles(
  dir: string,
  settings: ExtensionSettings,
  processor: (text: string) => string,
): Promise<number> {
  let filesProcessed = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !settings.excludedFolders.includes(file)) {
      filesProcessed += await processFiles(filePath, settings, processor);
    } else if (
      stat.isFile() &&
      settings.includedExtensions.some((ext) => file.endsWith(ext)) &&
      !settings.excludedFiles.includes(file)
    ) {
      const content = fs.readFileSync(filePath, "utf8");
      const updatedContent = processor(content);

      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, "utf8");
        filesProcessed++;
      }
    }
  }

  return filesProcessed;
}

function getSettings(): ExtensionSettings {
  const config = vscode.workspace.getConfiguration("consoleLogRemover");
  return {
    includedExtensions: config.get("includedExtensions", [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
    ]),
    excludedFolders: config.get("excludedFolders", [
      "node_modules",
      "dist",
      "build",
      ".git",
    ]),
    excludedFiles: config.get("excludedFiles", [
      "config.js",
      "config.json",
      "package.json",
      "package-lock.json",
    ]),
  };
}

export function deactivate() {}
