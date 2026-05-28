import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path


def setup_logging(log_dir: Path) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    fmt = "%(asctime)s %(levelname)s %(name)s %(message)s"
    handlers: list[logging.Handler] = [
        logging.StreamHandler(),
        TimedRotatingFileHandler(log_dir / "server.log", when="midnight", backupCount=7),
    ]
    logging.basicConfig(level=logging.INFO, format=fmt, handlers=handlers)
