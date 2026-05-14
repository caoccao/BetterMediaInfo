/*
 *   Copyright (c) 2024-2026. caoccao.com Sam Cao
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import * as Protocol from "./protocol";
import type { ExportData } from "./export";

const STREAM_KIND_COLORS: Record<Protocol.StreamKind, string> = {
  [Protocol.StreamKind.General]: "#84cc16",
  [Protocol.StreamKind.Video]: "#f97316",
  [Protocol.StreamKind.Audio]: "#f59e0b",
  [Protocol.StreamKind.Text]: "#10b981",
  [Protocol.StreamKind.Other]: "#a3a3a3",
  [Protocol.StreamKind.Image]: "#0ea5e9",
  [Protocol.StreamKind.Menu]: "#6366f1",
  [Protocol.StreamKind.Max]: "#84cc16",
};

const PADDING = 24;
const TITLE_FONT = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const APP_FONT = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const HEADING_FONT = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const TABLE_FONT = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const TABLE_HEAD_FONT = "bold 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const TITLE_LINE_HEIGHT = 28;
const APP_LINE_HEIGHT = 20;
const HEADING_LINE_HEIGHT = 28;
const ROW_LINE_HEIGHT = 20;
const CELL_PAD_X = 8;
const CELL_PAD_Y = 4;
const SECTION_GAP = 16;

const BG_COLOR = "#ffffff";
const FG_COLOR = "#1f2937";
const APP_COLOR = "#6b7280";
const BORDER_COLOR = "#d1d5db";

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function measure(ctx: CanvasRenderingContext2D, text: string, font: string): number {
  ctx.font = font;
  return ctx.measureText(text).width;
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function maxLineWidth(ctx: CanvasRenderingContext2D, lines: string[], font: string): number {
  let w = 0;
  for (const line of lines) {
    const lw = measure(ctx, line, font);
    if (lw > w) w = lw;
  }
  return w;
}

interface PlannedRow {
  keyLines: string[];
  valueLines: string[];
  height: number;
}

interface PlannedTable {
  propertyWidth: number;
  valueWidth: number;
  height: number;
  rows: PlannedRow[];
  headerHeight: number;
}

function planTable(
  ctx: CanvasRenderingContext2D,
  entries: Array<[string, string]>,
): PlannedTable {
  let propertyWidth = measure(ctx, "Property", TABLE_HEAD_FONT);
  let valueWidth = measure(ctx, "Value", TABLE_HEAD_FONT);
  const rows: PlannedRow[] = [];
  for (const [key, value] of entries) {
    const keyLines = splitLines(key);
    const valueLines = splitLines(value);
    propertyWidth = Math.max(propertyWidth, maxLineWidth(ctx, keyLines, TABLE_FONT));
    valueWidth = Math.max(valueWidth, maxLineWidth(ctx, valueLines, TABLE_FONT));
    const lineCount = Math.max(keyLines.length, valueLines.length);
    rows.push({
      keyLines,
      valueLines,
      height: lineCount * ROW_LINE_HEIGHT + CELL_PAD_Y * 2,
    });
  }
  propertyWidth += CELL_PAD_X * 2;
  valueWidth += CELL_PAD_X * 2;
  const headerHeight = ROW_LINE_HEIGHT + CELL_PAD_Y * 2;
  let height = headerHeight;
  for (const row of rows) height += row.height;
  return { propertyWidth, valueWidth, height, rows, headerHeight };
}

function drawCellLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
): void {
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x, y + i * ROW_LINE_HEIGHT);
  }
}

export function renderPng(data: ExportData): HTMLCanvasElement {
  const { file, appName, appVersion, streams } = data;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  const tablePlans = streams.map((s) => planTable(ctx, s.entries));

  let propertyWidth = 0;
  let valueWidth = 0;
  for (const plan of tablePlans) {
    if (plan.propertyWidth > propertyWidth) propertyWidth = plan.propertyWidth;
    if (plan.valueWidth > valueWidth) valueWidth = plan.valueWidth;
  }
  for (const plan of tablePlans) {
    plan.propertyWidth = propertyWidth;
    plan.valueWidth = valueWidth;
  }

  let contentWidth = measure(ctx, file, TITLE_FONT);
  contentWidth = Math.max(
    contentWidth,
    measure(ctx, `Application: ${appName} v${appVersion}`, APP_FONT),
  );
  for (let i = 0; i < streams.length; i += 1) {
    const stream = streams[i];
    contentWidth = Math.max(
      contentWidth,
      measure(ctx, `${stream.stream} (${stream.num + 1})`, HEADING_FONT),
    );
  }
  contentWidth = Math.max(contentWidth, propertyWidth + valueWidth);

  let totalHeight = PADDING + TITLE_LINE_HEIGHT + APP_LINE_HEIGHT + SECTION_GAP;
  for (const plan of tablePlans) {
    totalHeight += HEADING_LINE_HEIGHT + plan.height + SECTION_GAP;
  }
  totalHeight += PADDING - SECTION_GAP;

  const dpr = window.devicePixelRatio || 1;
  const width = contentWidth + PADDING * 2;
  const height = totalHeight;

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  let y = PADDING;
  ctx.textBaseline = "top";

  ctx.fillStyle = FG_COLOR;
  ctx.font = TITLE_FONT;
  ctx.fillText(file, PADDING, y);
  y += TITLE_LINE_HEIGHT;

  ctx.fillStyle = APP_COLOR;
  ctx.font = APP_FONT;
  ctx.fillText(`Application: ${appName} v${appVersion}`, PADDING, y);
  y += APP_LINE_HEIGHT + SECTION_GAP;

  for (let i = 0; i < streams.length; i += 1) {
    const stream = streams[i];
    const plan = tablePlans[i];
    const color = STREAM_KIND_COLORS[stream.stream] ?? APP_COLOR;
    const headerBg = withAlpha(color, "20");
    const tableWidth = plan.propertyWidth + plan.valueWidth;

    ctx.fillStyle = headerBg;
    ctx.fillRect(PADDING, y, tableWidth, HEADING_LINE_HEIGHT);
    ctx.fillStyle = color;
    ctx.fillRect(PADDING, y, 4, HEADING_LINE_HEIGHT);
    ctx.fillStyle = color;
    ctx.font = HEADING_FONT;
    ctx.fillText(`${stream.stream} (${stream.num + 1})`, PADDING + 12, y + 4);
    y += HEADING_LINE_HEIGHT;

    const tableTop = y;

    ctx.fillStyle = headerBg;
    ctx.fillRect(PADDING, y, tableWidth, plan.headerHeight);
    ctx.fillStyle = FG_COLOR;
    ctx.font = TABLE_HEAD_FONT;
    ctx.fillText("Property", PADDING + CELL_PAD_X, y + CELL_PAD_Y);
    ctx.fillText("Value", PADDING + plan.propertyWidth + CELL_PAD_X, y + CELL_PAD_Y);
    y += plan.headerHeight;

    ctx.font = TABLE_FONT;
    ctx.fillStyle = FG_COLOR;
    const rowYs: number[] = [];
    for (const row of plan.rows) {
      rowYs.push(y);
      drawCellLines(ctx, row.keyLines, PADDING + CELL_PAD_X, y + CELL_PAD_Y);
      drawCellLines(
        ctx,
        row.valueLines,
        PADDING + plan.propertyWidth + CELL_PAD_X,
        y + CELL_PAD_Y,
      );
      y += row.height;
    }

    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    const tableLeft = PADDING;
    const tableRight = PADDING + tableWidth;
    ctx.strokeRect(tableLeft + 0.5, tableTop + 0.5, tableWidth - 1, plan.height - 1);
    ctx.beginPath();
    ctx.moveTo(tableLeft + plan.propertyWidth + 0.5, tableTop);
    ctx.lineTo(tableLeft + plan.propertyWidth + 0.5, y);
    ctx.stroke();
    const dividers = [tableTop + plan.headerHeight, ...rowYs.slice(1)];
    for (const dy of dividers) {
      ctx.beginPath();
      ctx.moveTo(tableLeft, dy + 0.5);
      ctx.lineTo(tableRight, dy + 0.5);
      ctx.stroke();
    }

    y += SECTION_GAP;
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert canvas to PNG."));
    }, "image/png");
  });
}
