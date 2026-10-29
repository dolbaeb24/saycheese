---
name: reel-setup
description: Установка и проверка окружения для конвейера роликов (lemo-opuscar, Node, ffmpeg, Python venv, headless Chromium, faster-whisper, ключ Gemini). Используй при первом запуске на новой машине, когда рендер или скрипты падают из-за отсутствующих пакетов, или когда пользователь спрашивает, всё ли установлено.
---

# Установка окружения

## Что нужно на машине

| Компонент | Зачем | Кто ставит |
|---|---|---|
| Node 20+ | рендер страниц через Playwright | пользователь (системный инструмент) |
| ffmpeg | сборка видео, громкость, проверки | пользователь |
| Python 3.11–3.13 или `uv` | звук, субтитры, проверка речи | пользователь |
| git | клонировать библиотеку | пользователь |
| lemo-opuscar (`$LIB`, по умолчанию `~/lemo-opuscar`) | инструменты рендера `core/render/*`, синтез звуков `core/audio/sfx.py`, мастеринг `mux.sh`, 59 стилей | скрипт |
| npm-пакеты `playwright-core`, `three` и headless Chromium | съёмка кадров | скрипт |
| `$LIB/.venv` с numpy, scipy, soundfile, soxr, pillow | микс, листы кадров, субтитры | скрипт |
| faster-whisper и модель `small` (~480 МБ) | проверка русской озвучки | скрипт |
| ключ Gemini API | озвучка | пользователь кладёт в `~/.config/gemini.env` |

macOS и Linux работают напрямую. На Windows всё запускай внутри WSL2 (Ubuntu): рендер-скрипты написаны на `sh`.

## Шаги

1. Проверь состояние: `sh .agents/skills/reel-setup/scripts/doctor.sh`.
2. Если чего-то из системных инструментов нет, назови пользователю одной строкой, что поставить: macOS — `brew install node ffmpeg python@3.12 uv`; Ubuntu/WSL — `sudo apt install nodejs npm ffmpeg python3-venv git` (Node 20+ ставится через nodesource или `nvm`). Сам системный софт не ставь без разрешения.
3. Установи всё остальное: `sh .agents/skills/reel-setup/scripts/setup.sh`. Первый запуск занимает несколько минут, его лучше запустить в фоне и дождаться последней строки `LIB=...`.
4. Ключ Gemini. Попроси пользователя создать файл `~/.config/gemini.env` с одной строкой `GEMINI_API_KEY=<ключ>` и правами `chmod 600`, либо задать переменную окружения. Ключ в чат не принимай и не печатай.
5. Проверка дыма: `cd "$LIB" && node core/render/still.mjs "<рабочая папка>/templates/hologram-hud-defog" 9 --size 1080x1920 --out /tmp/smoke`. Должен появиться `/tmp/smoke/t_9.jpg` с машиной и карточкой «≈15 г».

## Типичные поломки

- `optional file missing: …/fonts/...` — шрифт не скопирован в `fonts/` проекта; кириллица отрисуется запасным шрифтом. Скопируй шрифт.
- Тайм-аут `window.READY` (180 с) — страница упала до `READY = true`. Открой `index.html` через `node core/render/serve.mjs` или посмотри ошибку в выводе `still.mjs`.
- `HTTP 429` от Gemini — исчерпана минутная или дневная квота (см. `reel-voice`).
- `TypeError: metadata_errors` у faster-whisper — нужна версия `av<19` (её ставит скрипт).
- На Mac с Apple Silicon WebGL идёт через Metal (`LEMO_ANGLE=metal` по умолчанию). На Linux без GPU three.js-сцены рисуются программно, медленнее, но работают.
