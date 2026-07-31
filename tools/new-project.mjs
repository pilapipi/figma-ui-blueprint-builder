// Copyright 2026 广州派拉披披科技有限公司 (pilapp)
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectId = process.argv[2];
const projectName = process.argv[3] ?? projectId;

if (!projectId || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(projectId)) {
  process.stderr.write(
    "Usage: npm run new:project -- <project-id> [\"Project Name\"]\n",
  );
  process.exit(1);
}

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, "..");
const templateDirectory = path.join(
  repositoryRoot,
  "templates",
  "project",
);
const targetDirectory = path.join(
  repositoryRoot,
  "projects",
  projectId,
);

if (fs.existsSync(targetDirectory)) {
  process.stderr.write(
    `Project already exists: ${path.relative(repositoryRoot, targetDirectory)}\n`,
  );
  process.exit(1);
}

fs.mkdirSync(path.join(targetDirectory, "assets"), { recursive: true });
const files = [
  "PROJECT_BRIEF.md",
  "SOURCE_INVENTORY.md",
  "COMPONENT_MAP.md",
  "blueprint.json",
];

for (const fileName of files) {
  const source = fs.readFileSync(
    path.join(templateDirectory, fileName),
    "utf8",
  );
  const jsonTemplate = fileName.endsWith(".json");
  const safeProjectId = jsonTemplate
    ? JSON.stringify(projectId).slice(1, -1)
    : projectId;
  const safeProjectName = jsonTemplate
    ? JSON.stringify(projectName).slice(1, -1)
    : projectName;
  const output = source
    .replaceAll("{{PROJECT_ID}}", safeProjectId)
    .replaceAll("{{PROJECT_NAME}}", safeProjectName);
  fs.writeFileSync(
    path.join(targetDirectory, fileName),
    output,
    "utf8",
  );
}
fs.writeFileSync(
  path.join(targetDirectory, "assets", ".gitkeep"),
  "",
  "utf8",
);

process.stdout.write(
  `Created projects/${projectId}\n`
    + "Next: complete the brief and inventories, then edit blueprint.json.\n",
);
