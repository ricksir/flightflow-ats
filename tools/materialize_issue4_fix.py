#!/usr/bin/env python3
"""Apply the minimal issue #4 fix to index.html exactly once."""
from pathlib import Path
import hashlib

path = Path('index.html')
text = path.read_text(encoding='utf-8')

old = """function enableControls(enabled) {
    ['exportBtn','showProtocolBtn','exactMessageBtn','copySummaryBtn','restartBtn','prevBtn','playBtn','nextBtn','scrubber','speedSelect','soundBtn','fpvToggleBtn','stripToggleBtn']
      .forEach(id => { els[id].disabled = !enabled; });
    if (enabled && state.parsed) {
      els.scrubber.max = String(Math.max(0, state.parsed.events.length - 1));
      els.endTimeLabel.textContent = state.parsed.events[state.parsed.events.length - 1].time || '--:--:--';
    } else {
      els.scrubber.max = '0';
      els.endTimeLabel.textContent = '--:--:--';
    }
  }"""

new = """function enableControls(enabled) {
    ['exportBtn','showProtocolBtn','exactMessageBtn','copySummaryBtn','restartBtn','prevBtn','playBtn','nextBtn','scrubber','speedSelect','soundBtn','fpvToggleBtn','stripToggleBtn']
      .forEach(id => { els[id].disabled = !enabled; });
    if (enabled && state.parsed) {
      const lastIndex = Math.max(0, state.parsed.events.length - 1);
      els.scrubber.max = String(lastIndex);
      els.endTimeLabel.textContent = state.parsed.events[state.parsed.events.length - 1].time || '--:--:--';
      els.prevBtn.disabled = state.index <= 0;
      els.nextBtn.disabled = state.index >= lastIndex;
    } else {
      els.scrubber.max = '0';
      els.endTimeLabel.textContent = '--:--:--';
    }
  }"""

count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one enableControls baseline block; found {count}.')

before = hashlib.sha256(text.encode('utf-8')).hexdigest()
patched = text.replace(old, new, 1)
path.write_text(patched, encoding='utf-8')
after = hashlib.sha256(path.read_bytes()).hexdigest()
print(f'index.html patched for issue #4: {before} -> {after}')
