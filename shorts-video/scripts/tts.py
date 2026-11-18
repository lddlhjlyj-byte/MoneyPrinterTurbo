# 사용법(인터넷 되는 PC 또는 Colab):  pip install edge-tts  →  python scripts/tts.py
# src/cards.json 의 장면별 "voice" 문장을 읽어 public/voice/NN.mp3 를 만들고,
# 장면 길이(seconds)를 음성 길이 + 0.5초로 자동 맞춘다.
import asyncio, json, math, re, subprocess
from pathlib import Path
import edge_tts

VOICE = "ko-KR-SunHiNeural"
RATE = "+10%"  # 쇼츠는 살짝 빠르게
CARDS = Path("src/cards.json")
OUT = Path("public/voice")
OUT.mkdir(parents=True, exist_ok=True)

data = json.loads(CARDS.read_text(encoding="utf-8"))


def speech_window(mp3, dur):
    """ffmpeg 무음 감지로 실제 말하는 구간(초)을 잰다. 자막·화면 비트 타이밍(src/Beats.tsx)에 쓴다."""
    err = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(mp3), "-af", "silencedetect=noise=-38dB:d=0.1", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    iv = [(max(a, 0.0), ends[k] if k < len(ends) else dur) for k, a in enumerate(starts)]  # 무음 구간 목록
    begin = iv[0][1] if iv and iv[0][0] <= 0.05 else 0.0
    # 마지막 무음이 파일 끝까지 이어지면 그 시작이 말의 끝
    finish = iv[-1][0] if iv and iv[-1][1] >= dur - 0.08 and iv[-1][0] > begin else dur
    return round(max(begin, 0.0), 2), round(min(max(finish, begin + 0.5), dur), 2)


async def main():
    for i, sc in enumerate(data["scenes"]):
        mp3 = OUT / f"{i:02d}.mp3"
        await edge_tts.Communicate(sc["voice"], VOICE, rate=RATE).save(str(mp3))
        dur = float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(mp3)], text=True).strip())
        sc["seconds"] = max(2, math.ceil((dur + 0.5) * 2) / 2)
        sc["audio"] = f"voice/{i:02d}.mp3"
        sc["speechStart"], sc["speechEnd"] = speech_window(mp3, dur)
        print(i, sc["type"], f"{dur:.1f}s ->", sc["seconds"])
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


asyncio.run(main())
