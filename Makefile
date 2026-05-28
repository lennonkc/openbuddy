.PHONY: dev server webui test lint fw-stopwatch clean-dev

clean-dev:
	@# Graceful stop
	@lsof -ti :8000 | xargs kill 2>/dev/null || true
	@lsof -ti :5173 | xargs kill 2>/dev/null || true
	@pkill -f 'openbuddy_server/.venv/bin/python.*uvicorn' 2>/dev/null || true
	@pkill -f 'openbuddy_server/.venv/bin/python.*multiprocessing' 2>/dev/null || true
	@pkill -f 'vite.*openbuddy_webui' 2>/dev/null || true
	@sleep 0.5
	@# Force-kill anything still lingering
	@lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti :5173 | xargs kill -9 2>/dev/null || true

dev: clean-dev
	@echo "Starting server (:8000) + webui (:5173)"
	@trap 'kill 0' EXIT; \
	(cd openbuddy_server && .venv/bin/uvicorn openbuddy.server:app --reload --host 0.0.0.0 --port 8000) & \
	(cd openbuddy_webui && npm run dev) & \
	wait

server:
	cd openbuddy_server && .venv/bin/uvicorn openbuddy.server:app --reload --host 0.0.0.0 --port 8000

webui:
	cd openbuddy_webui && npm run dev

test:
	cd openbuddy_server && .venv/bin/pytest -xvs
	cd openbuddy_webui && npm test --silent || true

lint:
	cd openbuddy_server && .venv/bin/ruff check . && .venv/bin/ruff format --check .

fw-stopwatch:
	cd stopwatch && idf.py build flash monitor
