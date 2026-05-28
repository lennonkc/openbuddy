import { Resvg } from "@resvg/resvg-js";
import { SIZE } from "./svg_builder.js";

export function svgToPngBuffer(svgString) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: "width", value: SIZE },
    background: "rgba(0, 0, 0, 0)",
  });
  const rendered = resvg.render();
  return { data: rendered.pixels, width: rendered.width, height: rendered.height };
}

export function rgbaToRgb565(rgbaBuffer, width, height) {
  const rgb565 = Buffer.alloc(width * height * 2);
  for (let i = 0; i < width * height; i++) {
    const off = i * 4;
    const a = rgbaBuffer[off + 3] / 255;
    // Pre-multiply with black background (AMOLED)
    const r = Math.round(rgbaBuffer[off] * a);
    const g = Math.round(rgbaBuffer[off + 1] * a);
    const b = Math.round(rgbaBuffer[off + 2] * a);
    const val = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    // Little-endian for ESP32
    rgb565[i * 2] = val & 0xff;
    rgb565[i * 2 + 1] = (val >> 8) & 0xff;
  }
  return rgb565;
}

export function toCArray(name, rgb565Buffer, width, height) {
  const hexBytes = [];
  for (let i = 0; i < rgb565Buffer.length; i++) {
    hexBytes.push(`0x${rgb565Buffer[i].toString(16).padStart(2, "0")}`);
  }

  const lines = [];
  const COLS = 20;
  for (let i = 0; i < hexBytes.length; i += COLS) {
    lines.push("    " + hexBytes.slice(i, i + COLS).join(", "));
  }

  const pixelCount = width * height;
  return `
static const LV_ATTRIBUTE_MEM_ALIGN LV_ATTRIBUTE_LARGE_CONST uint8_t ${name}_map[] = {
${lines.join(",\n")},
};

const lv_image_dsc_t ${name} = {
    .header.cf    = LV_COLOR_FORMAT_RGB565,
    .header.magic = LV_IMAGE_HEADER_MAGIC,
    .header.w     = ${width},
    .header.h     = ${height},
    .data_size    = ${pixelCount} * 2,
    .data         = ${name}_map,
};
`;
}
