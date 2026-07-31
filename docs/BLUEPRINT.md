# Blueprint 1.0

Blueprint 是来源分析与 Figma 运行时之间的项目接口。Schema 是最终约束：
[`schema/blueprint.schema.json`](../schema/blueprint.schema.json)。

## 顶层字段

```json
{
  "schemaVersion": "1.0",
  "project": {},
  "tokens": {},
  "assets": {},
  "components": [],
  "sections": []
}
```

### `project`

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 稳定项目 ID，用于生成标签 |
| `name` | 是 | Figma Section 和样式显示名 |
| `outputPage` | 是 | 页面输出目标；无法新建时回退当前 Page |
| `componentPage` | 否 | 组件库目标 Page；默认与输出页一致 |
| `buildMode` | 否 | `replace-generated` 或 `preserve-existing` |
| `source` | 否 | 来源类型、文档名、URL 和说明 |

### `tokens`

- `colors`：名称到 Hex 颜色。
- `typography`：字体家族、字重、字号、行高和字间距。
- `spacing`：名称到数值。
- `radii`：名称到数值。

`fill`、`stroke`、`color` 可以引用颜色 Token；`gap`、`padding` 和 `radius`
可以引用对应数值 Token。

### `assets`

可选的图片 Data URI：

```json
{
  "assets": {
    "hero": "data:image/png;base64,iVBORw0..."
  }
}
```

在图层中使用：

```json
{
  "id": "hero",
  "type": "image",
  "assetId": "hero",
  "width": 326,
  "height": 220,
  "fit": "crop",
  "radius": "card"
}
```

## 组件

每个组件定义尺寸、容器样式和子图层：

```json
{
  "id": "primary-button",
  "name": "Controls/Primary Button",
  "width": 326,
  "height": 52,
  "fill": "accent",
  "radius": "pill",
  "layout": {
    "mode": "horizontal",
    "align": "center",
    "justify": "center"
  },
  "layers": [
    {
      "id": "label",
      "name": "Label",
      "type": "text",
      "text": "Continue",
      "textStyle": "label",
      "color": "on-accent"
    }
  ]
}
```

组件使用两遍构建：先建立全部主组件，再渲染子图层。因此一个组件可以引用定义
顺序靠后的其他组件；不要建立循环组件引用。

## 页面组与页面

`sections` 对应 Figma Section。每个 `screen` 默认输出为主组件：

```json
{
  "id": "checkout",
  "name": "Checkout",
  "layout": {
    "columns": 4,
    "gap": 72
  },
  "screens": [
    {
      "id": "checkout-empty",
      "name": "Checkout · Empty",
      "width": 390,
      "height": 844,
      "fill": "background",
      "layers": []
    }
  ]
}
```

设置 `"asComponent": false` 可输出普通 Frame。

## 图层通用字段

所有图层都有：

- `id`、`name`
- `x`、`y`、`width`、`height`
- `opacity`、`rotation`、`visible`、`locked`
- `grow`、`stretch`
- `fill`、`stroke`、`strokeWidth`
- `radius`、`shadow`

Auto Layout 父容器会忽略子图层的 `x` / `y`，改用顺序、Gap 和 Padding。

## 图层类型

### `frame`

可包含递归 `layers`，支持 Auto Layout、背景、边框、阴影和裁切。

### `text`

```json
{
  "id": "title",
  "name": "Title",
  "type": "text",
  "text": "Page title",
  "textStyle": "display",
  "color": "ink",
  "width": 326,
  "align": "left"
}
```

内联 `fontFamily`、`fontStyle`、`fontSize`、`lineHeight`、
`letterSpacing` 会覆盖 Typography Token。

### `rectangle` / `ellipse` / `line`

用于几何图形、容器背景和分隔。复杂图标不要用大量 Rectangle 拼接，优先 `svg`。

### `instance`

```json
{
  "id": "submit",
  "type": "instance",
  "componentId": "primary-button",
  "x": 32,
  "y": 748,
  "overrides": {
    "Label": "Submit"
  }
}
```

`overrides` 的键匹配主组件中的 Text Layer `name`，不是图层 `id`。

### `svg`

`svg` 字段直接包含 SVG 标记。Figma 会创建可编辑矢量节点。

### `image`

通过 `assetId` 引用顶层 `assets`。`fit` 支持 `fill`、`fit`、`crop`、`tile`。

## Paint

颜色 Token 或 Hex：

```json
"fill": "surface"
```

带透明度纯色：

```json
"fill": {
  "type": "solid",
  "color": "accent",
  "opacity": 0.16
}
```

线性渐变：

```json
"fill": {
  "type": "linear-gradient",
  "stops": [
    { "position": 0, "color": "accent" },
    { "position": 1, "color": "#B5B6FF" }
  ]
}
```

## 验证

```bash
npm run validate -- projects/example/blueprint.json
```

验证器检查：

- JSON Schema。
- 重复组件、Section 和页面 ID。
- 不存在的组件引用。
- 不存在的图片和 Typography 引用。

Figma 插件内还会做一次运行时验证，避免无效 Blueprint 写入画布。
