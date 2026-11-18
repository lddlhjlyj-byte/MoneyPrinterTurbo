# 효과음 3종을 코드로 합성한다(저작권 없음, 무료). 사용: python scripts/make_sfx.py
# 만들어지는 파일: public/sfx/whoosh.wav(장면 전환), tick.wav(비트마다), ding.wav(숫자 강조)
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path("public/sfx")
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def save(name, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())


def t_(sec):
    return np.arange(int(SR * sec)) / SR


# whoosh: 잡음을 주파수가 올라가는 필터로 통과시킨 0.3초 바람 소리
t = t_(0.3)
noise = rng.standard_normal(len(t))
# 시간에 따라 변하는 필터 대신, 구간별로 대역 통과 후 이어 붙인다
seg = 6
parts = []
for k in range(seg):
    a, b = int(len(t) * k / seg), int(len(t) * (k + 1) / seg)
    n = noise[a:b]
    s = np.fft.rfft(n)
    f = np.fft.rfftfreq(len(n), 1 / SR)
    c = 500 + 2600 * k / (seg - 1)
    s *= np.exp(-(((f - c) / 700) ** 2))
    parts.append(np.fft.irfft(s, len(n)))
w = np.concatenate(parts)
env = np.sin(np.pi * np.linspace(0, 1, len(w))) ** 2
save("whoosh.wav", w * env)

# tick: 짧고 부드러운 '톡' (900→500Hz 하강 사인 + 빠른 감쇠)
t = t_(0.07)
f = 900 - 400 * (t / t[-1])
x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55)
save("tick.wav", x)

# ding: 숫자 강조용 맑은 종소리 (1318Hz + 1975Hz, 0.45초)
t = t_(0.45)
x = (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1975 * t)) * np.exp(-t * 9)
x[: int(SR * 0.004)] *= np.linspace(0, 1, int(SR * 0.004))
save("ding.wav", x)
print("만듦:", sorted(p.name for p in OUT.glob("*.wav")))
