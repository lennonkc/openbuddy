import fs from "fs";
import path from "path";
import { buildSvg, SIZE } from "./svg_builder.js";
import { STATES } from "./states.js";
import { svgToPngBuffer, rgbaToRgb565, toCArray } from "./render.js";

const OUT_DIR = path.resolve(
  import.meta.dirname,
  "../../stopwatch/main/assets/pet_frames",
);

async function generateState(stateName, stateConfig) {
  const frames = [];
  for (let i = 0; i < stateConfig.frames.length; i++) {
    const svg = buildSvg(stateName, stateConfig.frames[i]);
    const { data, width, height } = svgToPngBuffer(svg);
    const rgb565 = rgbaToRgb565(Buffer.from(data), width, height);
    const varName = `pet_${stateName}_${i}`;
    frames.push({ varName, cCode: toCArray(varName, rgb565, width, height) });
  }
  return frames;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const allStates = {};
  let totalFrames = 0;

  for (const [stateName, stateConfig] of Object.entries(STATES)) {
    const count = stateConfig.frames.length;
    process.stdout.write(
      `Generating ${stateName} (${count} frame${count > 1 ? "s" : ""})...`,
    );
    const frames = await generateState(stateName, stateConfig);

    const fileHeader = `#ifdef __has_include
#if __has_include("lvgl.h")
#ifndef LV_LVGL_H_INCLUDE_SIMPLE
#define LV_LVGL_H_INCLUDE_SIMPLE
#endif
#endif
#endif

#if defined(LV_LVGL_H_INCLUDE_SIMPLE)
#include "lvgl.h"
#else
#include "lvgl/lvgl.h"
#endif

#ifndef LV_ATTRIBUTE_MEM_ALIGN
#define LV_ATTRIBUTE_MEM_ALIGN
#endif
`;

    const cContent = fileHeader + frames.map((f) => f.cCode).join("\n");
    const filePath = path.join(OUT_DIR, `pet_${stateName}.c`);
    fs.writeFileSync(filePath, cContent);
    const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(0);
    console.log(` ${sizeKB} KB`);

    allStates[stateName] = frames.map((f) => f.varName);
    totalFrames += count;
  }

  const headerLines = [
    "#pragma once",
    "",
    '#ifdef __cplusplus',
    'extern "C" {',
    "#endif",
    "",
    '#if defined(LV_LVGL_H_INCLUDE_SIMPLE)',
    '#include "lvgl.h"',
    "#else",
    '#include "lvgl/lvgl.h"',
    "#endif",
    "",
  ];
  for (const varNames of Object.values(allStates)) {
    for (const vn of varNames) {
      headerLines.push(`extern const lv_image_dsc_t ${vn};`);
    }
  }
  headerLines.push("", "#ifdef __cplusplus", "}", "#endif", "");

  fs.writeFileSync(path.join(OUT_DIR, "pet_frames.h"), headerLines.join("\n"));

  let totalBytes = 0;
  for (const file of fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".c"))) {
    totalBytes += fs.statSync(path.join(OUT_DIR, file)).size;
  }

  console.log(`\nDone! ${totalFrames} frames, ${SIZE}×${SIZE} RGB565`);
  console.log(`Total C source: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch(console.error);
