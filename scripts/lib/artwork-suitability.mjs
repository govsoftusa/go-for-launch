import sharp from "sharp";

export async function inspectArtworkSuitability(file, options = {}) {
  const minimumAverageChannelDeviation = Number(options.minimumAverageChannelDeviation ?? 12);
  const stats = await sharp(file)
    .resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true })
    .flatten({ background: options.background || "#ffffff" })
    .stats();
  const colorChannels = stats.channels.slice(0, 3);
  const averageChannelDeviation = colorChannels.reduce((total, channel) => total + channel.stdev, 0) / colorChannels.length;

  return {
    suitable: averageChannelDeviation >= minimumAverageChannelDeviation,
    averageChannelDeviation,
    minimumAverageChannelDeviation,
    reason: averageChannelDeviation >= minimumAverageChannelDeviation ? "informative-artwork" : "low-detail-artwork"
  };
}

export async function assertArtworkSuitability(file, options = {}) {
  const result = await inspectArtworkSuitability(file, options);
  if (!result.suitable) {
    throw new Error(`${file}: source artwork is visually flat or low detail, use an approved designed fallback`);
  }
  return result;
}
