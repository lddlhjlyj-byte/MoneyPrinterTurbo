// 사용법: node scripts/transcribe.mjs [영상경로] [출력json]
// 기본값: public/input.mp4 -> public/captions.json (한국어, small 모델, 무료/로컬 실행)
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import {
  downloadWhisperModel,
  installWhisperCpp,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";

const input = process.argv[2] ?? "public/input.mp4";
const output = process.argv[3] ?? "public/captions.json";
const to = path.join(process.cwd(), "whisper.cpp");
const wav = path.join(process.cwd(), "whisper-tmp.wav");

await installWhisperCpp({ to, version: "1.5.5" });
await downloadWhisperModel({ model: "small", folder: to });

execFileSync("ffmpeg", ["-y", "-i", input, "-ar", "16000", "-ac", "1", wav], { stdio: "ignore" });

const whisperCppOutput = await transcribe({
  model: "small",
  whisperPath: to,
  whisperCppVersion: "1.5.5",
  inputPath: wav,
  tokenLevelTimestamps: true,
  language: "ko",
});

const { captions } = toCaptions({ whisperCppOutput });
fs.writeFileSync(output, JSON.stringify(captions, null, 2));
fs.rmSync(wav, { force: true });
console.log(`완료: ${output} (${captions.length}개)`);
