// Copyright 2026 广州派拉披披科技有限公司 (pilapp)
// SPDX-License-Identifier: Apache-2.0

const NS = "ui_blueprint_builder";
const RUNTIME_VERSION = "2.0.0";

type BuildMode = "replace-generated" | "preserve-existing";
type LayerType =
  | "frame"
  | "text"
  | "rectangle"
  | "ellipse"
  | "line"
  | "instance"
  | "svg"
  | "image";
type TokenNumber = number | string;

interface SourceInfo {
  kind?: "figma" | "screenshots" | "mixed";
  documentName?: string;
  documentUrl?: string;
  notes?: string;
}

interface ProjectSpec {
  id: string;
  name: string;
  outputPage: string;
  componentPage?: string;
  buildMode?: BuildMode;
  source?: SourceInfo;
}

interface TypographyToken {
  family?: string;
  style?: string;
  size: number;
  lineHeight?: number;
  letterSpacing?: number;
}

interface TokenSpec {
  colors: Record<string, string>;
  spacing?: Record<string, number>;
  radii?: Record<string, number>;
  typography: Record<string, TypographyToken>;
}

interface GradientStopSpec {
  position: number;
  color: string;
  opacity?: number;
}

type PaintSpec =
  | string
  | {
      type: "solid";
      color: string;
      opacity?: number;
    }
  | {
      type: "linear-gradient";
      stops: GradientStopSpec[];
    };

interface InsetsSpec {
  top?: TokenNumber;
  right?: TokenNumber;
  bottom?: TokenNumber;
  left?: TokenNumber;
}

interface LayoutSpec {
  mode: "none" | "vertical" | "horizontal";
  gap?: TokenNumber;
  padding?: TokenNumber | InsetsSpec;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between";
}

interface ShadowSpec {
  x?: number;
  y?: number;
  blur: number;
  spread?: number;
  color?: string;
  opacity?: number;
}

interface LayerSpec {
  id: string;
  name?: string;
  type: LayerType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  grow?: boolean;
  stretch?: boolean;
  fill?: PaintSpec;
  stroke?: PaintSpec;
  strokeWidth?: number;
  radius?: TokenNumber;
  shadow?: ShadowSpec;
  layout?: LayoutSpec;
  clip?: boolean;
  layers?: LayerSpec[];
  text?: string;
  textStyle?: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
  componentId?: string;
  overrides?: Record<string, string>;
  svg?: string;
  assetId?: string;
  fit?: "fill" | "fit" | "crop" | "tile";
}

interface ComponentSpec {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  fill?: PaintSpec;
  stroke?: PaintSpec;
  strokeWidth?: number;
  radius?: TokenNumber;
  shadow?: ShadowSpec;
  layout?: LayoutSpec;
  clip?: boolean;
  layers: LayerSpec[];
}

interface ScreenSpec {
  id: string;
  name: string;
  description?: string;
  width: number;
  height: number;
  asComponent?: boolean;
  fill?: PaintSpec;
  radius?: TokenNumber;
  layout?: LayoutSpec;
  clip?: boolean;
  layers: LayerSpec[];
}

interface SectionLayoutSpec {
  columns?: number;
  gap?: number;
}

interface SectionSpec {
  id: string;
  name: string;
  description?: string;
  layout?: SectionLayoutSpec;
  screens: ScreenSpec[];
}

interface Blueprint {
  schemaVersion: "1.0";
  project: ProjectSpec;
  tokens: TokenSpec;
  assets?: Record<string, string>;
  components: ComponentSpec[];
  sections: SectionSpec[];
}

interface ReferenceMessage {
  type: "place-reference";
  projectId: string;
  projectName: string;
  pageName?: string;
  fileName: string;
  bytes: ArrayBuffer;
  index: number;
  total: number;
}

type PluginMessage =
  | { type: "validate"; json: string }
  | { type: "build"; json: string }
  | { type: "inspect-selection" }
  | ReferenceMessage
  | { type: "close" };

type StatusKind = "info" | "success" | "error";
type ContainerNode = FrameNode | ComponentNode;
type StyledNode = FrameNode | ComponentNode | RectangleNode | EllipseNode;
type ResizableNode =
  | FrameNode
  | ComponentNode
  | TextNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | InstanceNode;

interface RenderContext {
  blueprint: Blueprint;
  fonts: Map<string, FontName>;
  fallbackFont: FontName;
  colorVariables: Map<string, Variable>;
  components: Map<string, ComponentNode>;
}

interface BuildResult {
  components: number;
  sections: number;
  screens: number;
  nodes: SceneNode[];
}

figma.showUI(__html__, {
  width: 500,
  height: 760,
  themeColors: true,
});

function postStatus(
  message: string,
  progress: number,
  kind: StatusKind = "info",
) {
  figma.ui.postMessage({
    type: "status",
    message,
    progress,
    kind,
  });
}

function tag(
  node: BaseNode,
  projectId: string,
  key: string,
  kind: string,
) {
  node.setSharedPluginData(NS, "project_id", projectId);
  node.setSharedPluginData(NS, "key", key);
  node.setSharedPluginData(NS, "kind", kind);
  node.setSharedPluginData(NS, "runtime", RUNTIME_VERSION);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateLayer(
  value: unknown,
  path: string,
  errors: string[],
) {
  if (!isRecord(value)) {
    errors.push(`${path} 必须是对象。`);
    return;
  }
  if (!isNonEmptyString(value.id)) {
    errors.push(`${path}.id 必须是非空字符串。`);
  }
  const validTypes: LayerType[] = [
    "frame",
    "text",
    "rectangle",
    "ellipse",
    "line",
    "instance",
    "svg",
    "image",
  ];
  if (
    !isNonEmptyString(value.type)
    || !validTypes.includes(value.type as LayerType)
  ) {
    errors.push(`${path}.type 不是受支持的图层类型。`);
    return;
  }
  if (value.type === "text" && typeof value.text !== "string") {
    errors.push(`${path}.text 必须是字符串。`);
  }
  if (value.type === "instance" && !isNonEmptyString(value.componentId)) {
    errors.push(`${path}.componentId 必须引用一个组件。`);
  }
  if (value.type === "svg" && !isNonEmptyString(value.svg)) {
    errors.push(`${path}.svg 必须包含 SVG 标记。`);
  }
  if (value.type === "image" && !isNonEmptyString(value.assetId)) {
    errors.push(`${path}.assetId 必须引用 assets 中的图片。`);
  }
  if (value.type === "frame" && value.layers !== undefined) {
    if (!Array.isArray(value.layers)) {
      errors.push(`${path}.layers 必须是数组。`);
    } else {
      value.layers.forEach((layer, index) => {
        validateLayer(layer, `${path}.layers[${index}]`, errors);
      });
    }
  }
}

function validateBlueprintValue(value: unknown): {
  errors: string[];
  blueprint?: Blueprint;
} {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { errors: ["Blueprint 根节点必须是对象。"] };
  }
  if (value.schemaVersion !== "1.0") {
    errors.push('schemaVersion 必须是 "1.0"。');
  }
  if (!isRecord(value.project)) {
    errors.push("project 必须是对象。");
  } else {
    if (!isNonEmptyString(value.project.id)) {
      errors.push("project.id 必须是非空字符串。");
    }
    if (!isNonEmptyString(value.project.name)) {
      errors.push("project.name 必须是非空字符串。");
    }
    if (!isNonEmptyString(value.project.outputPage)) {
      errors.push("project.outputPage 必须是非空字符串。");
    }
    if (
      value.project.buildMode !== undefined
      && value.project.buildMode !== "replace-generated"
      && value.project.buildMode !== "preserve-existing"
    ) {
      errors.push("project.buildMode 不是受支持的更新模式。");
    }
  }
  if (!isRecord(value.tokens)) {
    errors.push("tokens 必须是对象。");
  } else {
    if (!isRecord(value.tokens.colors)) {
      errors.push("tokens.colors 必须是对象。");
    } else {
      for (const [name, color] of Object.entries(value.tokens.colors)) {
        if (
          typeof color !== "string"
          || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
            color,
          )
        ) {
          errors.push(`tokens.colors.${name} 不是有效 Hex 颜色。`);
        }
      }
    }
    if (
      !isRecord(value.tokens.typography)
      || Object.keys(value.tokens.typography).length === 0
    ) {
      errors.push("tokens.typography 至少需要一个文本样式。");
    } else {
      for (const [name, token] of Object.entries(
        value.tokens.typography,
      )) {
        if (!isRecord(token) || !isPositiveNumber(token.size)) {
          errors.push(`tokens.typography.${name}.size 必须大于 0。`);
        }
      }
    }
  }
  if (!Array.isArray(value.components)) {
    errors.push("components 必须是数组。");
  } else {
    value.components.forEach((component, index) => {
      const path = `components[${index}]`;
      if (!isRecord(component)) {
        errors.push(`${path} 必须是对象。`);
        return;
      }
      if (!isNonEmptyString(component.id)) {
        errors.push(`${path}.id 必须是非空字符串。`);
      }
      if (!isNonEmptyString(component.name)) {
        errors.push(`${path}.name 必须是非空字符串。`);
      }
      if (!isPositiveNumber(component.width)) {
        errors.push(`${path}.width 必须大于 0。`);
      }
      if (!isPositiveNumber(component.height)) {
        errors.push(`${path}.height 必须大于 0。`);
      }
      if (!Array.isArray(component.layers)) {
        errors.push(`${path}.layers 必须是数组。`);
      } else {
        component.layers.forEach((layer, layerIndex) => {
          validateLayer(layer, `${path}.layers[${layerIndex}]`, errors);
        });
      }
    });
  }
  if (!Array.isArray(value.sections) || value.sections.length === 0) {
    errors.push("sections 至少需要一个页面分组。");
  } else {
    value.sections.forEach((section, sectionIndex) => {
      const sectionPath = `sections[${sectionIndex}]`;
      if (!isRecord(section)) {
        errors.push(`${sectionPath} 必须是对象。`);
        return;
      }
      if (!isNonEmptyString(section.id)) {
        errors.push(`${sectionPath}.id 必须是非空字符串。`);
      }
      if (!isNonEmptyString(section.name)) {
        errors.push(`${sectionPath}.name 必须是非空字符串。`);
      }
      if (!Array.isArray(section.screens) || section.screens.length === 0) {
        errors.push(`${sectionPath}.screens 至少需要一个页面。`);
        return;
      }
      section.screens.forEach((screen, screenIndex) => {
        const screenPath = `${sectionPath}.screens[${screenIndex}]`;
        if (!isRecord(screen)) {
          errors.push(`${screenPath} 必须是对象。`);
          return;
        }
        if (!isNonEmptyString(screen.id)) {
          errors.push(`${screenPath}.id 必须是非空字符串。`);
        }
        if (!isNonEmptyString(screen.name)) {
          errors.push(`${screenPath}.name 必须是非空字符串。`);
        }
        if (!isPositiveNumber(screen.width)) {
          errors.push(`${screenPath}.width 必须大于 0。`);
        }
        if (!isPositiveNumber(screen.height)) {
          errors.push(`${screenPath}.height 必须大于 0。`);
        }
        if (!Array.isArray(screen.layers)) {
          errors.push(`${screenPath}.layers 必须是数组。`);
        } else {
          screen.layers.forEach((layer, layerIndex) => {
            validateLayer(
              layer,
              `${screenPath}.layers[${layerIndex}]`,
              errors,
            );
          });
        }
      });
    });
  }

  if (errors.length > 0) return { errors };
  const blueprint = value as unknown as Blueprint;
  const componentIds = new Set<string>();
  for (const component of blueprint.components) {
    if (componentIds.has(component.id)) {
      errors.push(`组件 id 重复：${component.id}`);
    }
    componentIds.add(component.id);
  }
  const sectionIds = new Set<string>();
  const screenIds = new Set<string>();
  const assetIds = new Set(Object.keys(blueprint.assets ?? {}));
  const typographyIds = new Set(Object.keys(blueprint.tokens.typography));

  const inspectLayer = (layer: LayerSpec, path: string) => {
    if (layer.type === "instance" && !componentIds.has(layer.componentId ?? "")) {
      errors.push(`${path} 引用了不存在的组件：${layer.componentId ?? ""}`);
    }
    if (layer.type === "image" && !assetIds.has(layer.assetId ?? "")) {
      errors.push(`${path} 引用了不存在的图片资源：${layer.assetId ?? ""}`);
    }
    if (layer.textStyle && !typographyIds.has(layer.textStyle)) {
      errors.push(`${path} 引用了不存在的文本样式：${layer.textStyle}`);
    }
    for (const child of layer.layers ?? []) {
      inspectLayer(child, `${path}.${child.id}`);
    }
  };

  for (const component of blueprint.components) {
    component.layers.forEach((layer) => {
      inspectLayer(layer, `components.${component.id}.${layer.id}`);
    });
  }
  for (const section of blueprint.sections) {
    if (sectionIds.has(section.id)) {
      errors.push(`Section id 重复：${section.id}`);
    }
    sectionIds.add(section.id);
    for (const screen of section.screens) {
      if (screenIds.has(screen.id)) {
        errors.push(`页面 id 重复：${screen.id}`);
      }
      screenIds.add(screen.id);
      screen.layers.forEach((layer) => {
        inspectLayer(
          layer,
          `sections.${section.id}.${screen.id}.${layer.id}`,
        );
      });
    }
  }
  return errors.length > 0 ? { errors } : { errors, blueprint };
}

function parseBlueprint(json: string): Blueprint {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Blueprint JSON 无法解析：${message}`, {
      cause: error,
    });
  }
  const result = validateBlueprintValue(value);
  if (!result.blueprint) {
    throw new Error(result.errors.join("\n"));
  }
  return result.blueprint;
}

function normalizeHex(value: string): string {
  const raw = value.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return raw
      .split("")
      .map((part) => `${part}${part}`)
      .join("")
      .toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{8}$/.test(raw)) return raw.slice(0, 6).toUpperCase();
  throw new Error(`无效颜色：${value}`);
}

function rgb(value: string): RGB {
  const hex = normalizeHex(value);
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function rgba(value: string, opacity = 1): RGBA {
  return { ...rgb(value), a: opacity };
}

function colorValue(reference: string, blueprint: Blueprint): string {
  if (reference.trim().startsWith("#")) return reference;
  const value = blueprint.tokens.colors[reference];
  if (!value) throw new Error(`找不到颜色 Token：${reference}`);
  return value;
}

function numberValue(
  reference: TokenNumber | undefined,
  tokens: Record<string, number> | undefined,
  fallback = 0,
): number {
  if (typeof reference === "number") return reference;
  if (typeof reference === "string") {
    const value = tokens?.[reference];
    if (value === undefined) {
      throw new Error(`找不到数值 Token：${reference}`);
    }
    return value;
  }
  return fallback;
}

function createPaint(
  spec: PaintSpec,
  context: RenderContext,
): Paint {
  if (typeof spec === "string") {
    const base: SolidPaint = {
      type: "SOLID",
      color: rgb(colorValue(spec, context.blueprint)),
    };
    const variable = context.colorVariables.get(spec);
    return variable
      ? figma.variables.setBoundVariableForPaint(base, "color", variable)
      : base;
  }
  if (spec.type === "solid") {
    const base: SolidPaint = {
      type: "SOLID",
      color: rgb(colorValue(spec.color, context.blueprint)),
      opacity: spec.opacity ?? 1,
    };
    const variable = context.colorVariables.get(spec.color);
    return variable
      ? figma.variables.setBoundVariableForPaint(base, "color", variable)
      : base;
  }
  return {
    type: "GRADIENT_LINEAR",
    gradientStops: spec.stops.map((stop) => ({
      position: Math.max(0, Math.min(1, stop.position)),
      color: rgba(
        colorValue(stop.color, context.blueprint),
        stop.opacity ?? 1,
      ),
    })),
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
  };
}

function requestedFontKey(family: string, style: string): string {
  return `${family}::${style}`;
}

function collectFontRequests(blueprint: Blueprint): Array<{
  family: string;
  style: string;
}> {
  const requests = new Map<string, { family: string; style: string }>();
  const add = (family = "Inter", style = "Regular") => {
    requests.set(requestedFontKey(family, style), { family, style });
  };
  Object.values(blueprint.tokens.typography).forEach((token) => {
    add(token.family, token.style);
  });
  const visit = (layer: LayerSpec) => {
    if (layer.type === "text" && (layer.fontFamily || layer.fontStyle)) {
      add(layer.fontFamily, layer.fontStyle);
    }
    layer.layers?.forEach(visit);
  };
  blueprint.components.forEach((component) => component.layers.forEach(visit));
  blueprint.sections.forEach((section) => {
    section.screens.forEach((screen) => screen.layers.forEach(visit));
  });
  if (requests.size === 0) add();
  return [...requests.values()];
}

async function prepareFonts(blueprint: Blueprint): Promise<{
  fonts: Map<string, FontName>;
  fallback: FontName;
}> {
  const available = await figma.listAvailableFontsAsync();
  if (available.length === 0) {
    throw new Error("当前环境没有可用字体。");
  }
  const pick = (family: string, style: string): FontName => {
    const exact = available.find(
      (font) =>
        font.fontName.family === family
        && font.fontName.style === style,
    );
    if (exact) return exact.fontName;
    const sameFamily = available.find(
      (font) => font.fontName.family === family,
    );
    if (sameFamily) return sameFamily.fontName;
    const inter = available.find(
      (font) =>
        font.fontName.family === "Inter"
        && font.fontName.style === "Regular",
    );
    return inter?.fontName ?? available[0].fontName;
  };

  const requests = collectFontRequests(blueprint);
  const fonts = new Map<string, FontName>();
  const unique = new Map<string, FontName>();
  for (const request of requests) {
    const resolved = pick(request.family, request.style);
    fonts.set(requestedFontKey(request.family, request.style), resolved);
    unique.set(requestedFontKey(resolved.family, resolved.style), resolved);
  }
  await Promise.all(
    [...unique.values()].map((font) => figma.loadFontAsync(font)),
  );
  return {
    fonts,
    fallback: [...unique.values()][0] ?? available[0].fontName,
  };
}

function fontForLayer(layer: LayerSpec, context: RenderContext): {
  font: FontName;
  token?: TypographyToken;
} {
  const token = layer.textStyle
    ? context.blueprint.tokens.typography[layer.textStyle]
    : undefined;
  const family = layer.fontFamily ?? token?.family ?? "Inter";
  const style = layer.fontStyle ?? token?.style ?? "Regular";
  return {
    font:
      context.fonts.get(requestedFontKey(family, style))
      ?? context.fallbackFont,
    token,
  };
}

async function ensurePage(name: string): Promise<PageNode> {
  const existing = figma.root.children.find((page) => page.name === name);
  if (existing) return existing;
  try {
    const page = figma.createPage();
    page.name = name;
    return page;
  } catch {
    postStatus(
      `无法新建页面“${name}”，已回退到当前页面。`,
      8,
      "info",
    );
    return figma.currentPage;
  }
}

function pageRightEdge(page: PageNode): number {
  return page.children.reduce((right, node) => {
    return Math.max(right, node.x + node.width);
  }, 0);
}

function findTaggedTopLevel(
  page: PageNode,
  projectId: string,
  key: string,
): SceneNode | null {
  return (
    page.children.find(
      (node) =>
        node.getSharedPluginData(NS, "project_id") === projectId
        && node.getSharedPluginData(NS, "key") === key,
    ) ?? null
  );
}

function findTaggedDeep(
  container: ChildrenMixin,
  projectId: string,
  key: string,
): SceneNode | null {
  return container.findOne(
    (node) =>
      node.getSharedPluginData(NS, "project_id") === projectId
      && node.getSharedPluginData(NS, "key") === key,
  ) as SceneNode | null;
}

async function ensureColorVariables(
  blueprint: Blueprint,
): Promise<Map<string, Variable>> {
  const result = new Map<string, Variable>();
  try {
    const collectionName = `[UIBB:${blueprint.project.id}] Colors`;
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    let collection = collections.find(
      (candidate) => candidate.name === collectionName,
    );
    if (!collection) {
      collection = figma.variables.createVariableCollection(collectionName);
      collection.renameMode(collection.modes[0].modeId, "Default");
    }
    const existing = await figma.variables.getLocalVariablesAsync("COLOR");
    for (const [token, value] of Object.entries(blueprint.tokens.colors)) {
      const name = `color/${token}`;
      let variable = existing.find(
        (candidate) =>
          candidate.variableCollectionId === collection.id
          && candidate.name === name,
      );
      if (!variable) {
        variable = figma.variables.createVariable(name, collection, "COLOR");
      }
      variable.setValueForMode(collection.modes[0].modeId, rgb(value));
      result.set(token, variable);
    }
  } catch {
    postStatus(
      "当前文件无法创建 Variables，将使用普通颜色继续生成。",
      12,
      "info",
    );
  }
  return result;
}

async function ensureTextStyles(
  blueprint: Blueprint,
  context: RenderContext,
) {
  const existing = await figma.getLocalTextStylesAsync();
  for (const [tokenName, token] of Object.entries(
    blueprint.tokens.typography,
  )) {
    const name = `[UIBB:${blueprint.project.id}]/Typography/${tokenName}`;
    let style = existing.find((candidate) => candidate.name === name);
    if (!style) {
      style = figma.createTextStyle();
      existing.push(style);
    }
    const family = token.family ?? "Inter";
    const weight = token.style ?? "Regular";
    style.name = name;
    style.fontName =
      context.fonts.get(requestedFontKey(family, weight))
      ?? context.fallbackFont;
    style.fontSize = token.size;
    style.lineHeight = {
      unit: "PIXELS",
      value: token.lineHeight ?? Math.round(token.size * 1.4),
    };
    style.letterSpacing = {
      unit: "PIXELS",
      value: token.letterSpacing ?? 0,
    };
  }
}

function configureLayout(
  node: ContainerNode,
  layout: LayoutSpec | undefined,
  blueprint: Blueprint,
) {
  if (!layout || layout.mode === "none") {
    node.layoutMode = "NONE";
    return;
  }
  node.layoutMode = layout.mode === "vertical" ? "VERTICAL" : "HORIZONTAL";
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.itemSpacing = numberValue(
    layout.gap,
    blueprint.tokens.spacing,
    0,
  );
  const padding = layout.padding;
  if (typeof padding === "number" || typeof padding === "string") {
    const value = numberValue(padding, blueprint.tokens.spacing, 0);
    node.paddingTop = value;
    node.paddingRight = value;
    node.paddingBottom = value;
    node.paddingLeft = value;
  } else if (padding) {
    node.paddingTop = numberValue(
      padding.top,
      blueprint.tokens.spacing,
      0,
    );
    node.paddingRight = numberValue(
      padding.right,
      blueprint.tokens.spacing,
      0,
    );
    node.paddingBottom = numberValue(
      padding.bottom,
      blueprint.tokens.spacing,
      0,
    );
    node.paddingLeft = numberValue(
      padding.left,
      blueprint.tokens.spacing,
      0,
    );
  }
  const alignMap = {
    start: "MIN",
    center: "CENTER",
    end: "MAX",
    stretch: "MIN",
  } as const;
  const justifyMap = {
    start: "MIN",
    center: "CENTER",
    end: "MAX",
    "space-between": "SPACE_BETWEEN",
  } as const;
  node.counterAxisAlignItems = alignMap[layout.align ?? "start"];
  node.primaryAxisAlignItems = justifyMap[layout.justify ?? "start"];
}

function applyStyledNode(
  node: StyledNode,
  spec: {
    fill?: PaintSpec;
    stroke?: PaintSpec;
    strokeWidth?: number;
    radius?: TokenNumber;
    shadow?: ShadowSpec;
  },
  context: RenderContext,
) {
  node.fills = spec.fill ? [createPaint(spec.fill, context)] : [];
  node.strokes = spec.stroke ? [createPaint(spec.stroke, context)] : [];
  node.strokeWeight = spec.strokeWidth ?? 0;
  if ("cornerRadius" in node && spec.radius !== undefined) {
    node.cornerRadius = numberValue(
      spec.radius,
      context.blueprint.tokens.radii,
      0,
    );
  }
  if (spec.shadow) {
    node.effects = [
      {
        type: "DROP_SHADOW",
        color: rgba(
          colorValue(
            spec.shadow.color ?? "#000000",
            context.blueprint,
          ),
          spec.shadow.opacity ?? 0.16,
        ),
        offset: {
          x: spec.shadow.x ?? 0,
          y: spec.shadow.y ?? 8,
        },
        radius: spec.shadow.blur,
        spread: spec.shadow.spread ?? 0,
        visible: true,
        blendMode: "NORMAL",
      },
    ];
  } else {
    node.effects = [];
  }
}

function applyCommonNode(
  node: ResizableNode,
  spec: LayerSpec,
  parent: ChildrenMixin,
) {
  node.name = spec.name ?? spec.id;
  if (spec.width !== undefined || spec.height !== undefined) {
    node.resize(
      Math.max(0.01, spec.width ?? node.width),
      Math.max(0.01, spec.height ?? node.height),
    );
  }
  const parentIsAutoLayout =
    "layoutMode" in parent && parent.layoutMode !== "NONE";
  if (!parentIsAutoLayout) {
    node.x = spec.x ?? 0;
    node.y = spec.y ?? 0;
  }
  node.opacity = spec.opacity ?? 1;
  node.rotation = spec.rotation ?? 0;
  node.visible = spec.visible ?? true;
  node.locked = spec.locked ?? false;
  if ("layoutGrow" in node && spec.grow) {
    node.layoutGrow = 1;
  }
  if ("layoutAlign" in node && spec.stretch) {
    node.layoutAlign = "STRETCH";
  }
}

function base64ToBytes(dataUri: string): Uint8Array {
  const marker = ";base64,";
  const markerIndex = dataUri.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("图片资源必须是 base64 Data URI。");
  }
  const base64 = dataUri.slice(markerIndex + marker.length);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const outputLength =
    Math.floor((clean.length * 3) / 4)
    - (clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0);
  const output = new Uint8Array(outputLength);
  let buffer = 0;
  let bits = 0;
  let index = 0;
  for (const character of clean) {
    if (character === "=") break;
    const value = alphabet.indexOf(character);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }
  return output;
}

function setInstanceOverrides(
  instance: InstanceNode,
  overrides: Record<string, string> | undefined,
) {
  for (const [name, value] of Object.entries(overrides ?? {})) {
    const target = instance.findOne(
      (node) => node.type === "TEXT" && node.name === name,
    );
    if (target?.type === "TEXT") {
      target.characters = value;
    }
  }
}

function renderLayer(
  parent: ChildrenMixin,
  spec: LayerSpec,
  context: RenderContext,
): SceneNode {
  let node: ResizableNode;
  if (spec.type === "frame") {
    const frame = figma.createFrame();
    frame.resize(
      Math.max(0.01, spec.width ?? 100),
      Math.max(0.01, spec.height ?? 100),
    );
    configureLayout(frame, spec.layout, context.blueprint);
    applyStyledNode(frame, spec, context);
    frame.clipsContent = spec.clip ?? false;
    parent.appendChild(frame);
    node = frame;
    for (const child of spec.layers ?? []) {
      renderLayer(frame, child, context);
    }
  } else if (spec.type === "text") {
    const text = figma.createText();
    const resolved = fontForLayer(spec, context);
    text.fontName = resolved.font;
    text.fontSize = spec.fontSize ?? resolved.token?.size ?? 16;
    text.lineHeight = {
      unit: "PIXELS",
      value:
        spec.lineHeight
        ?? resolved.token?.lineHeight
        ?? Math.round(Number(text.fontSize) * 1.4),
    };
    text.letterSpacing = {
      unit: "PIXELS",
      value: spec.letterSpacing ?? resolved.token?.letterSpacing ?? 0,
    };
    text.fills = [
      createPaint(spec.color ?? "#111111", context),
    ];
    const horizontalAlign = {
      left: "LEFT",
      center: "CENTER",
      right: "RIGHT",
    } as const;
    text.textAlignHorizontal = horizontalAlign[spec.align ?? "left"];
    const verticalAlign = {
      top: "TOP",
      center: "CENTER",
      bottom: "BOTTOM",
    } as const;
    text.textAlignVertical = verticalAlign[spec.verticalAlign ?? "top"];
    text.characters = spec.text ?? "";
    if (spec.width !== undefined) {
      text.textAutoResize =
        spec.height !== undefined ? "NONE" : "HEIGHT";
      text.resize(
        Math.max(0.01, spec.width),
        Math.max(0.01, spec.height ?? text.height),
      );
    } else {
      text.textAutoResize = "WIDTH_AND_HEIGHT";
    }
    parent.appendChild(text);
    node = text;
  } else if (spec.type === "rectangle") {
    const rectangle = figma.createRectangle();
    rectangle.resize(
      Math.max(0.01, spec.width ?? 100),
      Math.max(0.01, spec.height ?? 100),
    );
    applyStyledNode(rectangle, spec, context);
    parent.appendChild(rectangle);
    node = rectangle;
  } else if (spec.type === "ellipse") {
    const ellipse = figma.createEllipse();
    ellipse.resize(
      Math.max(0.01, spec.width ?? 100),
      Math.max(0.01, spec.height ?? 100),
    );
    applyStyledNode(ellipse, spec, context);
    parent.appendChild(ellipse);
    node = ellipse;
  } else if (spec.type === "line") {
    const line = figma.createLine();
    line.resize(Math.max(0.01, spec.width ?? 100), 0);
    line.strokes = spec.stroke
      ? [createPaint(spec.stroke, context)]
      : [createPaint("#111111", context)];
    line.strokeWeight = spec.strokeWidth ?? 1;
    parent.appendChild(line);
    node = line;
  } else if (spec.type === "instance") {
    const component = context.components.get(spec.componentId ?? "");
    if (!component) {
      throw new Error(`找不到组件：${spec.componentId ?? ""}`);
    }
    const instance = component.createInstance();
    parent.appendChild(instance);
    if (spec.width !== undefined || spec.height !== undefined) {
      instance.resize(
        Math.max(0.01, spec.width ?? instance.width),
        Math.max(0.01, spec.height ?? instance.height),
      );
    }
    setInstanceOverrides(instance, spec.overrides);
    node = instance;
  } else if (spec.type === "svg") {
    const svg = figma.createNodeFromSvg(spec.svg ?? "");
    parent.appendChild(svg);
    node = svg;
  } else {
    const asset = context.blueprint.assets?.[spec.assetId ?? ""];
    if (!asset) {
      throw new Error(`找不到图片资源：${spec.assetId ?? ""}`);
    }
    const image = figma.createImage(base64ToBytes(asset));
    const rectangle = figma.createRectangle();
    rectangle.resize(
      Math.max(0.01, spec.width ?? 200),
      Math.max(0.01, spec.height ?? 200),
    );
    rectangle.fills = [
      {
        type: "IMAGE",
        imageHash: image.hash,
        scaleMode: ({
          fill: "FILL",
          fit: "FIT",
          crop: "CROP",
          tile: "TILE",
        } as const)[spec.fit ?? "fill"],
      },
    ];
    if (spec.stroke) {
      rectangle.strokes = [createPaint(spec.stroke, context)];
      rectangle.strokeWeight = spec.strokeWidth ?? 1;
    }
    if (spec.radius !== undefined) {
      rectangle.cornerRadius = numberValue(
        spec.radius,
        context.blueprint.tokens.radii,
        0,
      );
    }
    parent.appendChild(rectangle);
    node = rectangle;
  }
  applyCommonNode(node, spec, parent);
  return node;
}

function configureRootContainer(
  node: ContainerNode,
  spec: ComponentSpec | ScreenSpec,
  context: RenderContext,
) {
  node.resize(spec.width, spec.height);
  configureLayout(node, spec.layout, context.blueprint);
  applyStyledNode(node, spec, context);
  node.clipsContent = spec.clip ?? true;
}

function createSectionHeader(
  section: SectionNode,
  title: string,
  description: string | undefined,
  context: RenderContext,
  width: number,
) {
  const header = figma.createFrame();
  header.name = "Overview";
  header.resize(width, 92);
  header.x = 48;
  header.y = 32;
  header.cornerRadius = 20;
  const colorNames = Object.keys(context.blueprint.tokens.colors);
  const headerBackground =
    context.blueprint.tokens.colors.ink !== undefined
      ? "ink"
      : colorNames[0] ?? "#111111";
  const headerForeground =
    context.blueprint.tokens.colors.white !== undefined
      ? "white"
      : colorNames.find((name) => name !== headerBackground)
        ?? "#FFFFFF";
  header.fills = [createPaint(headerBackground, context)];
  section.appendChild(header);

  const titleLayer: LayerSpec = {
    id: "Section title",
    name: "Section title",
    type: "text",
    text: title,
    x: 24,
    y: 18,
    width: width - 48,
    textStyle: Object.keys(
      context.blueprint.tokens.typography,
    )[0],
    color: headerForeground,
  };
  renderLayer(header, titleLayer, context);
  if (description) {
    renderLayer(
      header,
      {
        id: "Section description",
        name: "Section description",
        type: "text",
        text: description,
        x: 24,
        y: 54,
        width: width - 48,
        fontSize: 12,
        color: headerForeground,
      },
      context,
    );
  }
}

async function buildComponentLibrary(
  page: PageNode,
  context: RenderContext,
): Promise<Map<string, ComponentNode>> {
  const blueprint = context.blueprint;
  const projectId = blueprint.project.id;
  const libraryKey = "component-library";
  const existing = findTaggedTopLevel(page, projectId, libraryKey);
  if (existing && blueprint.project.buildMode === "preserve-existing") {
    const components = new Map<string, ComponentNode>();
    for (const spec of blueprint.components) {
      const found = findTaggedDeep(
        existing as ChildrenMixin,
        projectId,
        `component/${spec.id}`,
      );
      if (found?.type !== "COMPONENT") {
        throw new Error(
          `保留模式下找不到已生成组件：${spec.id}。请改用 replace-generated。`,
        );
      }
      components.set(spec.id, found);
    }
    return components;
  }
  existing?.remove();

  const specs = blueprint.components;
  if (specs.length === 0) return new Map();
  const columns = Math.min(3, Math.max(1, specs.length));
  const gap = 72;
  const cellWidth =
    Math.max(...specs.map((component) => component.width)) + gap;
  const cellHeight =
    Math.max(...specs.map((component) => component.height)) + 110;
  const rows = Math.ceil(specs.length / columns);
  const sectionWidth = 96 + columns * cellWidth;
  const sectionHeight = 170 + rows * cellHeight;

  const section = figma.createSection();
  section.name = `${blueprint.project.name} · Components`;
  section.x = pageRightEdge(page) + 400;
  section.y = 0;
  section.resizeWithoutConstraints(sectionWidth, sectionHeight);
  section.fills = [
    {
      type: "SOLID",
      color: rgb("#ECEFF3"),
    },
  ];
  tag(section, projectId, libraryKey, "component-library");
  page.appendChild(section);
  createSectionHeader(
    section,
    `${blueprint.project.name} · Component Library`,
    `${specs.length} reusable components · generated by UI Blueprint Builder`,
    context,
    sectionWidth - 96,
  );

  const components = new Map<string, ComponentNode>();
  specs.forEach((spec, index) => {
    const component = figma.createComponent();
    component.name = spec.name;
    configureRootContainer(component, spec, context);
    component.x = 48 + (index % columns) * cellWidth;
    component.y = 154 + Math.floor(index / columns) * cellHeight;
    tag(
      component,
      projectId,
      `component/${spec.id}`,
      "component",
    );
    section.appendChild(component);
    components.set(spec.id, component);
  });
  for (const spec of specs) {
    const component = components.get(spec.id);
    if (!component) continue;
    for (const layer of spec.layers) {
      renderLayer(component, layer, {
        ...context,
        components,
      });
    }
  }
  return components;
}

function existingSectionScreens(
  section: SectionNode,
  projectId: string,
  specs: ScreenSpec[],
): SceneNode[] {
  return specs.flatMap((screen) => {
    const found = findTaggedDeep(
      section,
      projectId,
      `screen/${screen.id}`,
    );
    return found ? [found] : [];
  });
}

function buildScreenSection(
  page: PageNode,
  sectionSpec: SectionSpec,
  context: RenderContext,
): SceneNode[] {
  const blueprint = context.blueprint;
  const projectId = blueprint.project.id;
  const sectionKey = `section/${sectionSpec.id}`;
  const existing = findTaggedTopLevel(page, projectId, sectionKey);
  if (
    existing?.type === "SECTION"
    && blueprint.project.buildMode === "preserve-existing"
  ) {
    return existingSectionScreens(
      existing,
      projectId,
      sectionSpec.screens,
    );
  }
  existing?.remove();

  const screens = sectionSpec.screens;
  const columns = Math.max(
    1,
    Math.min(sectionSpec.layout?.columns ?? 4, screens.length),
  );
  const gap = sectionSpec.layout?.gap ?? 72;
  const cellWidth = Math.max(...screens.map((screen) => screen.width)) + gap;
  const cellHeight =
    Math.max(...screens.map((screen) => screen.height)) + gap + 40;
  const rows = Math.ceil(screens.length / columns);
  const sectionWidth = 96 + columns * cellWidth;
  const sectionHeight = 170 + rows * cellHeight;

  const section = figma.createSection();
  section.name = `${blueprint.project.name} · ${sectionSpec.name}`;
  section.x = pageRightEdge(page) + 400;
  section.y = 0;
  section.resizeWithoutConstraints(sectionWidth, sectionHeight);
  section.fills = [
    {
      type: "SOLID",
      color: rgb("#ECEFF3"),
    },
  ];
  tag(section, projectId, sectionKey, "screen-section");
  page.appendChild(section);
  createSectionHeader(
    section,
    `${sectionSpec.name} · ${screens.length} Screens`,
    sectionSpec.description,
    context,
    sectionWidth - 96,
  );

  const output: SceneNode[] = [];
  screens.forEach((screenSpec, index) => {
    const screen =
      screenSpec.asComponent === false
        ? figma.createFrame()
        : figma.createComponent();
    screen.name = `Screen/${sectionSpec.name}/${screenSpec.name}`;
    configureRootContainer(screen, screenSpec, context);
    screen.x = 48 + (index % columns) * cellWidth;
    screen.y = 154 + Math.floor(index / columns) * cellHeight;
    tag(
      screen,
      projectId,
      `screen/${screenSpec.id}`,
      "screen",
    );
    section.appendChild(screen);
    for (const layer of screenSpec.layers) {
      renderLayer(screen, layer, context);
    }
    output.push(screen);
  });
  return output;
}

async function buildBlueprint(blueprint: Blueprint): Promise<BuildResult> {
  postStatus("读取 Blueprint 与字体…", 5);
  const preparedFonts = await prepareFonts(blueprint);
  const componentPage = await ensurePage(
    blueprint.project.componentPage ?? blueprint.project.outputPage,
  );
  const outputPage = await ensurePage(blueprint.project.outputPage);
  const colorVariables = await ensureColorVariables(blueprint);
  const baseContext: RenderContext = {
    blueprint,
    fonts: preparedFonts.fonts,
    fallbackFont: preparedFonts.fallback,
    colorVariables,
    components: new Map(),
  };
  await ensureTextStyles(blueprint, baseContext);

  postStatus("创建 Tokens 与组件库…", 24);
  await figma.setCurrentPageAsync(componentPage);
  const components = await buildComponentLibrary(
    componentPage,
    baseContext,
  );
  const context: RenderContext = {
    ...baseContext,
    components,
  };

  postStatus("组装页面与状态…", 48);
  await figma.setCurrentPageAsync(outputPage);
  const nodes: SceneNode[] = [];
  blueprint.sections.forEach((section, index) => {
    postStatus(
      `生成 ${section.name}（${index + 1}/${blueprint.sections.length}）…`,
      48
        + Math.round(
          ((index + 1) / blueprint.sections.length) * 46,
        ),
    );
    nodes.push(...buildScreenSection(outputPage, section, context));
  });
  if (nodes.length > 0) {
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
  return {
    components: components.size,
    sections: blueprint.sections.length,
    screens: nodes.length,
    nodes,
  };
}

function sanitizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function placeReference(message: ReferenceMessage) {
  const page = message.pageName
    ? await ensurePage(message.pageName)
    : figma.currentPage;
  await figma.setCurrentPageAsync(page);
  const sectionKey = `references/${message.projectId}`;
  let section = findTaggedTopLevel(
    page,
    message.projectId,
    sectionKey,
  ) as SectionNode | null;
  if (!section) {
    section = figma.createSection();
    section.name = `${message.projectName} · Source References`;
    section.x = pageRightEdge(page) + 400;
    section.y = 0;
    section.resizeWithoutConstraints(1100, 900);
    section.fills = [
      {
        type: "SOLID",
        color: rgb("#E8EBF0"),
      },
    ];
    tag(
      section,
      message.projectId,
      sectionKey,
      "source-references",
    );
    page.appendChild(section);
  }

  const image = figma.createImage(new Uint8Array(message.bytes));
  const sourceSize = await image.getSizeAsync();
  const targetWidth = Math.min(430, sourceSize.width);
  const targetHeight = Math.max(
    1,
    Math.round((sourceSize.height / sourceSize.width) * targetWidth),
  );
  const key = `${sectionKey}/${sanitizeKey(message.fileName)}`;
  const duplicate = findTaggedDeep(section, message.projectId, key);
  duplicate?.remove();

  const frame = figma.createFrame();
  frame.name = message.fileName;
  frame.resize(targetWidth, targetHeight + 36);
  frame.fills = [{ type: "SOLID", color: rgb("#FFFFFF") }];
  frame.cornerRadius = 12;
  frame.clipsContent = true;
  frame.x = 48 + ((message.index - 1) % 2) * 500;
  const referenceRowHeight = 1050;
  frame.y =
    48 + Math.floor((message.index - 1) / 2) * referenceRowHeight;
  tag(frame, message.projectId, key, "source-reference");
  section.appendChild(frame);

  const imageNode = figma.createRectangle();
  imageNode.name = "Reference image · locked";
  imageNode.resize(targetWidth, targetHeight);
  imageNode.y = 36;
  imageNode.fills = [
    {
      type: "IMAGE",
      imageHash: image.hash,
      scaleMode: "FIT",
    },
  ];
  imageNode.locked = true;
  frame.appendChild(imageNode);

  const label = figma.createText();
  const available = await figma.listAvailableFontsAsync();
  const font =
    available.find(
      (candidate) =>
        candidate.fontName.family === "Inter"
        && candidate.fontName.style === "Regular",
    )?.fontName ?? available[0]?.fontName;
  if (font) {
    await figma.loadFontAsync(font);
    label.fontName = font;
  }
  label.fontSize = 11;
  label.characters = message.fileName;
  label.x = 12;
  label.y = 10;
  label.fills = [{ type: "SOLID", color: rgb("#4B5563") }];
  frame.appendChild(label);

  const rows = Math.ceil(message.total / 2);
  section.resizeWithoutConstraints(
    1100,
    Math.max(900, 96 + rows * referenceRowHeight),
  );
  postStatus(
    `已放置参考图 ${message.index}/${message.total}：${message.fileName}`,
    Math.round((message.index / message.total) * 100),
    message.index === message.total ? "success" : "info",
  );
  if (message.index === message.total) {
    figma.currentPage.selection = [section];
    figma.viewport.scrollAndZoomIntoView([section]);
  }
}

function inspectNode(node: SceneNode, depth = 0): Record<string, unknown> {
  const report: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: Math.round(node.width),
    height: Math.round(node.height),
  };
  if ("layoutMode" in node) {
    report.layoutMode = node.layoutMode;
  }
  if (
    "fills" in node
    && node.fills !== figma.mixed
    && Array.isArray(node.fills)
  ) {
    report.fillTypes = node.fills.map((fill) => fill.type);
  }
  if ("children" in node && depth < 3) {
    report.children = node.children.map((child) =>
      inspectNode(child, depth + 1)
    );
  } else if ("children" in node) {
    report.childCount = node.children.length;
  }
  return report;
}

function inspectSelection() {
  const selection = figma.currentPage.selection;
  const report = {
    document: figma.root.name,
    page: figma.currentPage.name,
    selectedAt: new Date().toISOString(),
    selectionCount: selection.length,
    nodes: selection.map((node) => inspectNode(node)),
  };
  figma.ui.postMessage({
    type: "inspection",
    report: JSON.stringify(report, null, 2),
  });
  postStatus(
    `已扫描 ${selection.length} 个选中节点，可复制结构报告。`,
    100,
    "success",
  );
}

async function handleMessage(message: PluginMessage) {
  if (message.type === "close") {
    figma.closePlugin();
    return;
  }
  if (message.type === "validate") {
    const blueprint = parseBlueprint(message.json);
    const screenCount = blueprint.sections.reduce(
      (total, section) => total + section.screens.length,
      0,
    );
    postStatus(
      `Blueprint 有效：${blueprint.components.length} 个组件，${screenCount} 个页面。`,
      100,
      "success",
    );
    return;
  }
  if (message.type === "build") {
    const blueprint = parseBlueprint(message.json);
    const result = await buildBlueprint(blueprint);
    postStatus(
      `生成完成：${result.components} 个组件，${result.sections} 个页面组，${result.screens} 个页面。`,
      100,
      "success",
    );
    return;
  }
  if (message.type === "place-reference") {
    await placeReference(message);
    return;
  }
  if (message.type === "inspect-selection") {
    inspectSelection();
  }
}

let messageQueue: Promise<void> = Promise.resolve();
figma.ui.onmessage = (message: PluginMessage) => {
  messageQueue = messageQueue
    .then(() => handleMessage(message))
    .catch((error: unknown) => {
      const detail = error instanceof Error ? error.message : String(error);
      postStatus(`失败：${detail}`, 0, "error");
    });
};
