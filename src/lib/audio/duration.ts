import ffmpeg from "fluent-ffmpeg";

export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data?.format?.duration) {
        resolve(0);
        return;
      }
      resolve(Math.floor(data.format.duration));
    });
  });
}
