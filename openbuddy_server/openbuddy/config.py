from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OPENBUDDY_", env_file=None)

    port: int = 8000
    host: str = "0.0.0.0"
    config_dir: Path = Path.home() / ".config" / "openbuddy"
    log_dir: Path = Path.home() / ".cache" / "openbuddy"
    cardputer_devices_file: Path = Path.home() / ".config" / "openbuddy" / "devices.json"

    def ensure_dirs(self) -> None:
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.log_dir.mkdir(parents=True, exist_ok=True)
