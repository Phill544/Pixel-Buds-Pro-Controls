import os
import re
import asyncio

import decky


class Plugin:
    pbpctrl_path: str = ""
    _lock: asyncio.Lock = None

    async def _main(self):
        self._lock = asyncio.Lock()
        self.pbpctrl_path = os.path.join(decky.DECKY_PLUGIN_DIR, "bin", "pbpctrl")
        if os.path.exists(self.pbpctrl_path):
            os.chmod(self.pbpctrl_path, 0o755)
            decky.logger.info(f"pbpctrl found at {self.pbpctrl_path}")
        else:
            decky.logger.error(f"pbpctrl not found at {self.pbpctrl_path}")

    async def _unload(self):
        pass

    async def _uninstall(self):
        pass

    async def _migration(self):
        pass

    async def get_battery(self) -> dict:
        output = await self._run_pbpctrl("show", "battery")
        return self._parse_battery(output)

    async def get_anc(self) -> str:
        output = await self._run_pbpctrl("get", "anc")
        raw = output.strip().lower()
        # pbpctrl returns named values or "unknown (N)" with numeric codes
        if raw in ("off", "active", "aware"):
            return raw
        # "unknown (N)" means buds aren't being worn — pass through as "unknown"
        if "unknown" in raw:
            return "unknown"
        return "unknown"

    async def set_anc(self, mode: str) -> bool:
        mode_map = {
            "off": "off",
            "active": "active",
            "aware": "aware",
        }
        pbpctrl_mode = mode_map.get(mode.lower())
        if not pbpctrl_mode:
            decky.logger.error(f"Unknown ANC mode: {mode}")
            return False
        await self._run_pbpctrl("set", "anc", pbpctrl_mode)
        return True

    async def is_connected(self) -> bool:
        try:
            await self._run_pbpctrl("show", "battery")
            return True
        except Exception:
            return False

    async def get_device_info(self) -> dict:
        try:
            software = await self._run_pbpctrl("show", "software")
        except Exception:
            software = ""
        try:
            hardware = await self._run_pbpctrl("show", "hardware")
        except Exception:
            hardware = ""
        return {"software": software.strip(), "hardware": hardware.strip()}

    async def _run_pbpctrl(self, *args: str) -> str:
        if not os.path.exists(self.pbpctrl_path):
            raise Exception("pbpctrl binary not found")

        async with self._lock:
            return await self._run_pbpctrl_locked(*args)

    async def _run_pbpctrl_locked(self, *args: str) -> str:
        cmd = [self.pbpctrl_path] + list(args)
        decky.logger.info(f"Running: {' '.join(cmd)}")

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10.0)
        except asyncio.TimeoutError:
            proc.kill()
            raise Exception("pbpctrl timed out")

        if proc.returncode != 0:
            err = stderr.decode().strip()
            decky.logger.error(f"pbpctrl error: {err}")
            raise Exception(f"pbpctrl failed: {err}")

        return stdout.decode()

    @staticmethod
    def _parse_battery(output: str) -> dict:
        result = {
            "left": -1,
            "right": -1,
            "case": -1,
            "left_charging": False,
            "right_charging": False,
            "case_charging": False,
        }
        for line in output.strip().split("\n"):
            match = re.match(
                r"\s*(case|left bud|right bud):\s+(\d+%\s+\(.+?\)|unknown)", line
            )
            if not match:
                continue
            component = match.group(1)
            value = match.group(2)
            if value == "unknown":
                continue
            pct_match = re.match(r"(\d+)%\s+\((.+?)\)", value)
            if not pct_match:
                continue
            percent = int(pct_match.group(1))
            charging = pct_match.group(2).strip() == "charging"
            if component == "case":
                result["case"] = percent
                result["case_charging"] = charging
            elif component == "left bud":
                result["left"] = percent
                result["left_charging"] = charging
            elif component == "right bud":
                result["right"] = percent
                result["right_charging"] = charging
        return result
