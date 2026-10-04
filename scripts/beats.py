#!/usr/bin/env python3
"""Measure a supplied track into beats.json (same shape as scripts/beatgrid.mjs writes).

    .venv/bin/python scripts/beats.py audio/track.wav [--out beats.json] [--meter 4] [--phase N]

beats      every beat: state changes go here
downbeats  bar starts, phase chosen by onset energy: scene cuts and the hook go here
hits       measured onset peaks: SFX go here
"""
import argparse, json
import numpy as np
import librosa

ap = argparse.ArgumentParser()
ap.add_argument("track")
ap.add_argument("--out", default="beats.json")
ap.add_argument("--meter", type=int, default=4)
ap.add_argument("--phase", type=int, default=-1, help="force which detected beat (0..meter-1) is the first downbeat")
a = ap.parse_args()

HOP = 512
y, sr = librosa.load(a.track, sr=None, mono=True)
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
tempo, frames = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=HOP, units="frames")
beats = librosa.frames_to_time(frames, sr=sr, hop_length=HOP)

# Trackers often miss the first beat or two: extend the grid back to the start of the track.
spb = float(np.median(np.diff(beats))) if len(beats) > 1 else 60 / float(np.atleast_1d(tempo)[0])
lead = int(max(0, (beats[0] + 0.02) // spb)) if len(beats) else 0
beats = np.concatenate([beats[0] - spb * np.arange(lead, 0, -1), beats]) if lead else beats
frames = librosa.time_to_frames(beats, sr=sr, hop_length=HOP)

# Bar phase: downbeats usually carry the kick and bass, so pick the beat offset with the highest
# median low-band (<200 Hz) spectral flux. Kick on 1 and 3 can still fool it: check, and pass --phase.
S = np.log1p(np.abs(librosa.stft(y, n_fft=4096, hop_length=HOP)))
low = S[librosa.fft_frequencies(sr=sr, n_fft=4096) < 200]
flux = np.concatenate([[0], np.maximum(0, np.diff(low, axis=1)).sum(axis=0)])
win = lambda f: flux[max(0, f - 2): f + 3].max()   # tolerate a frame or two of tracker jitter
strength = [np.median([win(f) for f in frames[p::a.meter]]) for p in range(min(a.meter, len(frames)))]
phase = a.phase if a.phase >= 0 else int(np.argmax(strength)) if strength else 0

peaks = librosa.util.peak_pick(onset, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
r = lambda xs: [round(float(x), 3) for x in xs]
out = {
    "source": a.track,
    "bpm": round(float(np.atleast_1d(tempo)[0]), 2),
    "meter": a.meter,
    "duration": round(len(y) / sr, 3),
    "beats": r(beats),
    "downbeats": r(beats[phase::a.meter]),
    "hits": r(librosa.frames_to_time(peaks, sr=sr)),
}
with open(a.out, "w") as f:
    json.dump(out, f, indent=1)
print(f"{out['bpm']} BPM, {len(out['beats'])} beats ({lead} extrapolated at the start), "
      f"{len(out['hits'])} hits, first downbeat {out['downbeats'][0] if out['downbeats'] else '-'}s -> {a.out}")
