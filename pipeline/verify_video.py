#!/usr/bin/env python3
"""렌더링된 영상의 '완료 판정' 검사. 정지 프레임이 아니라 영상 파일의 소리·길이·장면 타이밍을 측정한다.
사용: python3 pipeline/verify_video.py <영상.mp4> [cards.json] [--report 경로]
cards.json은 tts.py 실행 후의 것(장면별 seconds가 음성 길이에 맞춰진 상태)이어야 장면별 검사가 된다. 없으면 기본 검사만 한다.
종료 코드: 0=통과(경고 있을 수 있음), 1=실패(소리 없음·싱크 어긋남 등). 길이(25~40초 권장)는 경고만 한다(사용자 대본 유지 원칙).
측정 못 한 것은 '측정 못 함'으로 적는다. 이 검사는 음성이 화면 장면과 같은 시간대에 나오는지를 소리 크기로 확인할 뿐,
말의 내용·발음·자막 일치는 확인하지 못한다."""
import json
import re
import subprocess
import sys
from pathlib import Path

FPS = 30
MIN_MEAN_DB = -35.0       # 영상 전체 평균 음량이 이보다 작으면 사실상 무음
SCENE_MIN_DB = -45.0      # 장면 구간 평균 음량이 이보다 작으면 그 장면은 무음
MAX_LEAD_SIL = 1.2        # 장면 시작 후 음성이 나오기까지 허용 무음(초)
MAX_TAIL_SIL = 2.2        # 음성이 끝나고 다음 장면까지 허용 무음(초)
SYNC_TOL = 0.25           # 장면 길이 합과 영상 길이의 허용 차이(초)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,duration", "-of", "json", str(path)])
    return json.loads(r.stdout or "{}").get("streams", [])


def mean_db(path, start=None, dur=None):
    cmd = ["ffmpeg", "-v", "info", "-nostats"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}", "-t", f"{dur:.3f}"]
    cmd += ["-i", str(path), "-vn", "-af", "volumedetect", "-f", "null", "-"]
    m = re.search(r"mean_volume:\s*(-?[\d.]+|-inf)", run(cmd).stderr)
    return None if not m else (-99.0 if m.group(1) == "-inf" else float(m.group(1)))


def speech_window(path, start, dur):
    """장면 구간에서 소리가 나는 첫·마지막 시각(장면 시작 기준 초). 못 구하면 None."""
    cmd = ["ffmpeg", "-v", "info", "-nostats", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(path), "-vn",
           "-af", "silencedetect=noise=-40dB:d=0.12", "-f", "null", "-"]
    err = run(cmd).stderr
    starts = [float(x) for x in re.findall(r"silence_start:\s*(-?[\d.]+)", err)]
    ends = [(float(a), float(b)) for a, b in re.findall(r"silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)", err)]
    lead = 0.0
    if starts and starts[0] <= 0.05 and ends:
        lead = ends[0][0]          # 구간 처음부터 이어진 무음이 끝나는 시각 = 음성 시작
    elif not starts:
        lead = 0.0
    if starts and len(starts) > len(ends):
        tail = dur - starts[-1]    # 마지막 무음이 구간 끝까지 이어짐
    else:
        tail = 0.0
    if lead >= dur - 0.05:
        return None                # 구간 전체가 무음
    return lead, tail


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    report_path = None
    if "--report" in sys.argv:
        report_path = Path(sys.argv[sys.argv.index("--report") + 1])
        args = [a for a in args if a != str(report_path)]
    if not args:
        print(__doc__)
        return 2
    video = Path(args[0])
    cards = Path(args[1]) if len(args) > 1 else None
    errs, warns, info = [], [], []

    if not video.exists():
        print(f"영상 파일 없음: {video}")
        return 1
    st = probe(video)
    v = next((s for s in st if s.get("codec_type") == "video"), None)
    a = next((s for s in st if s.get("codec_type") == "audio"), None)
    if not v:
        errs.append("영상 스트림 없음")
    else:
        if (v.get("width"), v.get("height")) != (1080, 1920):
            errs.append(f"해상도 {v.get('width')}x{v.get('height')} (1080x1920 필요)")
        if v.get("codec_name") != "h264":
            warns.append(f"비디오 코덱 {v.get('codec_name')} (h264 권장)")
    if not a:
        errs.append("오디오 스트림 없음(무음 영상)")
    vdur = float(v["duration"]) if v and v.get("duration") else None
    adur = float(a["duration"]) if a and a.get("duration") else None
    if vdur:
        info.append(f"영상 길이 {vdur:.1f}초")
        if vdur > 45:
            warns.append(f"길이 {vdur:.1f}초: 상위 영상 분석 목표(25~40초)보다 긺 (사용자 대본이면 알리기만)")
        if vdur > 60:
            warns.append("60초 초과: 쇼츠 권장 한도 초과")
    if vdur and adur and abs(vdur - adur) > 0.3:
        errs.append(f"영상 {vdur:.2f}초 vs 오디오 {adur:.2f}초: 길이 어긋남(싱크 밀림 가능)")

    if a:
        md = mean_db(video)
        if md is None:
            warns.append("전체 음량 측정 못 함")
        else:
            info.append(f"전체 평균 음량 {md:.1f}dB")
            if md < MIN_MEAN_DB:
                errs.append(f"전체 평균 음량 {md:.1f}dB: 사실상 무음 (기준 {MIN_MEAN_DB}dB)")

    if cards and cards.exists() and a and vdur:
        d = json.loads(cards.read_text(encoding="utf-8"))
        scenes = d["scenes"]
        total = sum(s["seconds"] for s in scenes)
        info.append(f"장면 {len(scenes)}개, 장면 길이 합 {total:.1f}초")
        if abs(total - vdur) > SYNC_TOL:
            errs.append(f"장면 길이 합 {total:.2f}초 vs 영상 {vdur:.2f}초: 장면 타이밍 어긋남")
        t = 0.0
        for i, s in enumerate(scenes):
            dur = float(s["seconds"])
            label = f"장면{i + 1}({s['type']}{s.get('n', '')})"
            vd = None
            vp = Path(cards).parent.parent / "public" / s["audio"] if s.get("audio") else None
            if vp and vp.exists():
                r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(vp)])
                try:
                    vd = float(r.stdout.strip())
                except ValueError:
                    vd = None
            if vd is not None and vd + 0.2 > dur:
                errs.append(f"{label}: 음성 {vd:.1f}초가 장면 {dur:.1f}초보다 길어 잘림")
            m = mean_db(video, t, dur)
            win = speech_window(video, t, dur)
            if m is None or m < SCENE_MIN_DB or win is None:
                errs.append(f"{label} {t:.1f}~{t + dur:.1f}초: 소리 없음(평균 {m if m is not None else '측정 못 함'}dB)")
            else:
                lead, tail = win
                if lead > MAX_LEAD_SIL:
                    warns.append(f"{label}: 음성이 장면 시작 {lead:.1f}초 뒤에 시작")
                if tail > MAX_TAIL_SIL:
                    warns.append(f"{label}: 음성 끝나고 {tail:.1f}초 무음 (늘어짐)")
            t += dur
    elif cards:
        warns.append("cards.json 없음 또는 오디오 없음: 장면별 싱크 검사 못 함")
    else:
        warns.append("cards.json 미지정: 장면별 싱크 검사 못 함(기본 검사만)")

    lines = [f"검사 대상: {video.name}", *[f"- {x}" for x in info]]
    lines += [f"[실패] {x}" for x in errs] + [f"[경고] {x}" for x in warns]
    lines.append("판정: " + ("실패" if errs else "통과(소리·길이·장면 타이밍 기준. 발음·자막 내용은 확인하지 못함)"))
    out = "\n".join(lines)
    print(out)
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(out + "\n", encoding="utf-8")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
