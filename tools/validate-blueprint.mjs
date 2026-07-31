// Copyright 2026 广州派拉披披科技有限公司 (pilapp)
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(toolDirectory, "..");
const schemaPath = path.join(
  repositoryRoot,
  "schema",
  "blueprint.schema.json",
);
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

function collectLayers(layers, visit, pathPrefix) {
  layers.forEach((layer, index) => {
    const layerPath = `${pathPrefix}.layers[${index}]`;
    visit(layer, layerPath);
    if (Array.isArray(layer.layers)) {
      collectLayers(layer.layers, visit, layerPath);
    }
  });
}

function semanticErrors(blueprint) {
  const errors = [];
  const componentIds = new Set();
  const sectionIds = new Set();
  const screenIds = new Set();
  const assetIds = new Set(Object.keys(blueprint.assets ?? {}));
  const typographyIds = new Set(
    Object.keys(blueprint.tokens?.typography ?? {}),
  );

  blueprint.components.forEach((component, index) => {
    if (componentIds.has(component.id)) {
      errors.push(`components[${index}]: duplicate id "${component.id}"`);
    }
    componentIds.add(component.id);
  });

  const inspectLayer = (layer, layerPath) => {
    if (
      layer.type === "instance"
      && !componentIds.has(layer.componentId)
    ) {
      errors.push(
        `${layerPath}: unknown componentId "${layer.componentId}"`,
      );
    }
    if (layer.type === "image" && !assetIds.has(layer.assetId)) {
      errors.push(`${layerPath}: unknown assetId "${layer.assetId}"`);
    }
    if (layer.textStyle && !typographyIds.has(layer.textStyle)) {
      errors.push(
        `${layerPath}: unknown textStyle "${layer.textStyle}"`,
      );
    }
  };

  blueprint.components.forEach((component, index) => {
    collectLayers(
      component.layers,
      inspectLayer,
      `components[${index}]`,
    );
  });

  blueprint.sections.forEach((section, sectionIndex) => {
    if (sectionIds.has(section.id)) {
      errors.push(
        `sections[${sectionIndex}]: duplicate id "${section.id}"`,
      );
    }
    sectionIds.add(section.id);
    section.screens.forEach((screen, screenIndex) => {
      if (screenIds.has(screen.id)) {
        errors.push(
          `sections[${sectionIndex}].screens[${screenIndex}]: `
            + `duplicate id "${screen.id}"`,
        );
      }
      screenIds.add(screen.id);
      collectLayers(
        screen.layers,
        inspectLayer,
        `sections[${sectionIndex}].screens[${screenIndex}]`,
      );
    });
  });
  return errors;
}

function validateFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    process.stderr.write(
      `✗ ${filePath}\n  ${error instanceof Error ? error.message : error}\n`,
    );
    return false;
  }

  const schemaValid = validateSchema(blueprint);
  const errors = [
    ...(schemaValid
      ? []
      : (validateSchema.errors ?? []).map(
          (error) =>
            `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
        )),
    ...(schemaValid ? semanticErrors(blueprint) : []),
  ];
  if (errors.length > 0) {
    process.stderr.write(
      `✗ ${filePath}\n${errors.map((error) => `  - ${error}`).join("\n")}\n`,
    );
    return false;
  }

  const screenCount = blueprint.sections.reduce(
    (total, section) => total + section.screens.length,
    0,
  );
  process.stdout.write(
    `✓ ${filePath}: ${blueprint.components.length} components, `
      + `${blueprint.sections.length} sections, ${screenCount} screens\n`,
  );
  return true;
}

const files =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ["examples/memory-music/blueprint.json"];
const valid = files.map(validateFile).every(Boolean);
if (!valid) process.exitCode = 1;
