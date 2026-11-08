# 사용법(인터넷 되는 PC 또는 Colab):  pip install edge-tts  →  python scripts/tts.py
# src/cards.json 의 장면별 "voice" 문장을 읽어 public/voice/NN.mp3 를 만들고,
# 장면 길이(seconds)를 음성 길이 + 0.5초로 자동 맞춘다.
import asyncio, json, math, subprocess
from pathlib import Path
import edge_tts

VOICE = "ko-KR-SunHiNeural"
RATE = "+10%"  # 쇼츠는 살짝 빠르게
CARDS = Path("src/cards.json")
OUT = Path("public/voice")
OUT.mkdir(parents=True, exist_ok=True)

data = json.loads(CARDS.read_text(encoding="utf-8"))


async def main():
    for i, sc in enumerate(data["scenes"]):
        mp3 = OUT / f"{i:02d}.mp3"
        await edge_tts.Communicate(sc["voice"], VOICE, rate=RATE).save(str(mp3))
        dur = float(subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(mp3)], text=True).strip())
        sc["seconds"] = max(2, math.ceil((dur + 0.5) * 2) / 2)
        sc["audio"] = f"voice/{i:02d}.mp3"
        print(i, sc["type"], f"{dur:.1f}s ->", sc["seconds"])
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


asyncio.run(main())
