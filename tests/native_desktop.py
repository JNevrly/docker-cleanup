#!/usr/bin/env python3
"""Real Tauri/WebKit UI journey, using a synthetic Unix-socket Docker API.

Run inside the disposable Linux builder with xvfb-run and dbus-run-session.
Uses WebDriver's HTTP protocol directly; no Selenium dependency is required.
"""
import base64
from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import shutil
import socketserver
import subprocess
import tempfile
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPORTED_REFERENCE = "gitext.alps.cz:5000/mmwave-radar/idec/idec-ros2-log-replay-ws/idec_ros2_log_replay_ws_devcontainer:v0"


class FakeEngine(socketserver.ThreadingUnixStreamServer):
    daemon_threads = True


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    removed = False
    mutations = []

    def log_message(self, *args):
        pass

    def respond(self, value, status=200, raw=False):
        data = value.encode() if raw else json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        p = self.path
        if p == "/version":
            return self.respond({"Os": "linux", "ApiVersion": "1.56", "MinAPIVersion": "1.44"})
        if p.endswith("/info"):
            return self.respond({"ID": "native-fixture-daemon", "Labels": []})
        if "/events?" in p:
            return self.respond("", raw=True)
        if p.endswith("/system/df"):
            return self.respond({"LayersSize": 8 * 1024 ** 2, "Images": [
                 {"Id": "sha256:fixture", "RepoTags": [REPORTED_REFERENCE, REPORTED_REFERENCE.replace(":v0", ":latest")], "Size": 8 * 1024 ** 2, "SharedSize": 0, "Created": 1700000000}],
                 "Volumes": [{"Name": "keep-database", "UsageData": {"Size": 4 * 1024 ** 2}},
                             {"Name": "tiny-project-data", "UsageData": {"Size": 1}}], "BuildCache": []})
        if "/containers/json?" in p:
            time.sleep(0.6)
            return self.respond([] if self.removed else [{
                "Id": "native-old", "Names": ["/native-old-workspace"], "State": "exited",
                "SizeRw": 16 * 1024 ** 2, "Created": 1700000000,
                "Labels": {"devcontainer.local_folder": "/synthetic/native-project"},
            }])
        if "/containers/native-old/json" in p:
            return self.respond({"Image": "sha256:fixture", "SizeRw": 16 * 1024 ** 2,
                "State": {"StartedAt": "2025-01-01T00:00:00Z", "FinishedAt": "2025-02-01T00:00:00Z"},
                "Config": {"Image": "demo:dev", "Cmd": ["bash"], "Env": ["SECRET=never-display"]},
                "Mounts": [{"Type": "bind", "Source": "/synthetic/native-project", "Destination": "/workspaces/project"},
                           {"Type": "volume", "Name": "keep-database", "Destination": "/data"}]})
        if "/containers/native-old/changes" in p:
            return self.respond([{"Path": "/scratch/important.txt", "Kind": 1}])
        if p.endswith("/volumes"):
            return self.respond({"Volumes": [{"Name": "keep-database", "CreatedAt": "2025-01-01T00:00:00Z"},
                {"Name": "tiny-project-data", "CreatedAt": "2025-01-01T00:00:00Z",
                 "Labels": {"com.docker.compose.project": "/synthetic/tiny-project"}}]})
        return self.respond({"message": "Unsupported fixture endpoint"}, 404)

    def do_DELETE(self):
        Handler.mutations.append(self.path)
        if self.path.endswith("/containers/native-old?force=false&v=false"):
            time.sleep(1.5)  # Keep real native progress observable while the fixture call is in flight.
            Handler.removed = True
            return self.respond("", 204, raw=True)
        self.respond({"message": "Forbidden fixture mutation"}, 403)


def main():
    root = Path(__file__).resolve().parents[1]
    base = Path(os.environ.get("DOCKER_CLEANUP_NATIVE_ARTIFACTS", str(root / "artifacts")))
    base.mkdir(parents=True, exist_ok=True)
    binary = os.environ.get("DOCKER_CLEANUP_NATIVE_BINARY", str(root / "src-tauri/target/debug/docker-cleanup"))
    driver_binary = os.environ.get("DOCKER_CLEANUP_TAURI_DRIVER") or shutil.which("tauri-driver")
    if not driver_binary:
        raise SystemExit("tauri-driver is required on PATH (CI pins version 2.1.0)")
    with tempfile.TemporaryDirectory(prefix="cleanup-native-") as scratch:
        scratch = Path(scratch)
        engine = FakeEngine(str(scratch / "docker.sock"), Handler)
        threading.Thread(target=engine.serve_forever, daemon=True).start()
        env = {**os.environ, "XDG_DATA_HOME": str(scratch / "data"),
               "WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS": "1"}
        logfile = (base / "native-driver.log").open("w")
        driver = subprocess.Popen([driver_binary, "--port", "4444"],
                                  env=env, stdout=logfile, stderr=logfile)
        session = None
        checks = []

        def http(method, path, value=None):
            data = json.dumps(value).encode() if value is not None else None
            try:
                with urlopen(Request("http://127.0.0.1:4444" + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"}), timeout=45) as response:
                    result = json.load(response)
            except HTTPError as error:
                raise RuntimeError(error.read().decode()) from error
            if isinstance(result.get("value"), dict) and "error" in result["value"]:
                raise RuntimeError(result["value"])
            return result.get("value", result)

        def js(script, *args):
            return http("POST", f"/session/{session}/execute/sync", {"script": script, "args": list(args)})

        def wait(script):
            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                if js(script):
                    return
                time.sleep(0.2)
            raise AssertionError("Timed out: " + script + "\n" + str(js("return document.body.innerText")))

        def click(text):
            js("const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===arguments[0]); if(!b||b.disabled)throw Error('Missing/enabled button '+arguments[0]); b.click()", text)

        def pointer_at(selector, click_button=False, whitespace=False):
            point = js("const r=document.querySelector(arguments[0]).getBoundingClientRect();return {x:arguments[1]?r.right-3:r.x+r.width/2,y:arguments[1]?r.y+3:r.y+r.height/2}", selector, whitespace)
            actions = [{"type": "pointerMove", "duration": 50, "origin": "viewport", "x": int(point["x"]), "y": int(point["y"])}]
            if click_button:
                actions += [{"type": "pointerDown", "button": 0}, {"type": "pointerUp", "button": 0}]
            http("POST", f"/session/{session}/actions", {"actions": [{"type": "pointer", "id": "mouse", "parameters": {"pointerType": "mouse"}, "actions": actions}]})

        def check(name, script):
            assert js(script), name
            checks.append(name)
            print("PASS:", name, flush=True)

        try:
            for _ in range(100):
                try:
                    http("GET", "/status")
                    break
                except (URLError, ConnectionError):
                    time.sleep(0.1)
            upgrade_from = os.environ.get("DOCKER_CLEANUP_UPGRADE_FROM")
            upgrade_version = os.environ.get("DOCKER_CLEANUP_UPGRADE_VERSION", "0.1.0")
            if upgrade_from:
                created = http("POST", "/session", {"capabilities": {"alwaysMatch": {
                    "tauri:options": {"application": upgrade_from},
                }}})
                session = created["sessionId"]
                wait("return document.body.innerText.includes(" + json.dumps("v" + upgrade_version) + ")")
                js("const e=document.querySelector('[aria-label=\"Docker socket endpoint\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}))",
                   "unix://" + str(scratch / "docker.sock"))
                click("Connect & scan")
                wait("return !!document.querySelector('[aria-label=\"Select native-old-workspace\"]')")
                click("keep-database")
                for label, value in [("Friendly name", "Preserved database"), ("Project / shared / unattributed", "Upgrade project")]:
                    js("const e=[...document.querySelectorAll('.field')].find(e=>e.textContent.includes(arguments[0])).querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,arguments[1]);e.dispatchEvent(new Event('input',{bubbles:true}))", label, value)
                click("Save identity")
                wait("return document.body.innerText.includes('Preserved database')")
                wait("return document.querySelector('[aria-label=\"Protect keep-database\"]')?.disabled===false")
                js("document.querySelector('[aria-label=\"Protect keep-database\"]').click()")
                wait("return !!document.querySelector('[aria-label=\"Unprotect keep-database\"]')")
                if upgrade_version in ("0.2.0", "0.3.0", "0.3.1"):
                    js("const s=document.querySelector('[aria-label=\"Theme\"]');s.value='dark';s.dispatchEvent(new Event('change',{bubbles:true}));")
                    for label, value in [("Inspector width", "360"), ("Treemap height", "190")]:
                        if upgrade_version == "0.2.0":
                            js("const e=document.querySelector('[aria-label=\"'+arguments[0]+'\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,arguments[1]);e.dispatchEvent(new Event('change',{bubbles:true}))", label, value)
                        else:
                            js("const e=document.querySelector('[role=\"separator\"][aria-label=\"'+arguments[0]+'\"]');e.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))", label)
                            wait("return +document.querySelector('[role=\"separator\"][aria-label=" + json.dumps(label) + "]').getAttribute('aria-valuenow')===" + ("280" if label == "Inspector width" else "40"))
                            for _ in range(4 if label == "Inspector width" else 15):
                                js("const e=document.querySelector('[role=\"separator\"][aria-label=\"'+arguments[0]+'\"]');e.dispatchEvent(new KeyboardEvent('keydown',{key:arguments[1],bubbles:true}))", label, "ArrowLeft" if label == "Inspector width" else "ArrowDown")
                    check("prior package saved theme and layout preferences", "return document.documentElement.dataset.theme==='dark' && JSON.parse(localStorage.getItem('docker-cleanup.preferences')).inspectorWidth===360 && JSON.parse(localStorage.getItem('docker-cleanup.preferences')).mapHeight===190")
                js("document.querySelector('[aria-label=\"Select native-old-workspace\"]').click()")
                click("Review cleanup →")
                wait("return !!document.querySelector('[aria-label=\"Review cleanup plan\"]')")
                js("document.querySelector('.confirmation input').click()")
                click("Delete reviewed assets")
                wait("return !!document.querySelector('[aria-label=\"Cleanup result\"], [aria-label=\"Cleanup results & history\"]')")
                check("prior package seeded persisted result", "return document.querySelector('[aria-label=\"Cleanup result\"], [aria-label=\"Cleanup results & history\"]').textContent.includes('deleted')")
                http("DELETE", f"/session/{session}")
                session = None
                Handler.removed = False  # The synthetic resource is available for the new-version journey.
            created = http("POST", "/session", {"capabilities": {"alwaysMatch": {
                "tauri:options": {"application": binary},
            }}})
            session = created["sessionId"]
            wait("return document.body.innerText.includes('Make room for what')")
            check("real Tauri application loaded, not browser demo",
                  "return !!window.__TAURI_INTERNALS__ && !document.body.innerText.includes('SYNTHETIC DATA')")
            js("const e=document.querySelector('[aria-label=\"Docker socket endpoint\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,arguments[0]);e.dispatchEvent(new Event('input',{bubbles:true}))",
               "unix://" + str(scratch / "docker.sock"))
            click("Connect & scan")
            wait("return !!document.querySelector('[aria-label=\"Select native-old-workspace\"]')")
            check("native IPC returned inventory and identity", "return document.body.innerText.includes('native-fixture-daemon')")
            if upgrade_from:
                click("Preserved database")
                check("prior alias project and protection survive upgrade", "return document.querySelector('[aria-label=\"Select Preserved database\"]').disabled && [...document.querySelectorAll('.field')].find(e=>e.textContent.includes('Project / shared / unattributed')).querySelector('input').value==='Upgrade project' && document.querySelector('.inspector h2').textContent==='Preserved database'")
                if upgrade_version in ("0.2.0", "0.3.0", "0.3.1"):
                    check("prior theme and pane preferences survive upgrade", "return document.documentElement.dataset.theme==='dark' && document.querySelector('[aria-label=\"Theme\"]').value==='dark' && +document.querySelector('[role=\"separator\"][aria-label=\"Inspector width\"]').getAttribute('aria-valuenow')===360 && +document.querySelector('[role=\"separator\"][aria-label=\"Treemap height\"]').getAttribute('aria-valuenow')===190")
                js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Cleanup history')).click()")
                wait("return !!document.querySelector('.history-list a')")
                js("document.querySelector('.history-list a').click()")
                check("prior saved cleanup result opens after upgrade", "return document.querySelector('[aria-label=\"Cleanup result\"]').textContent.includes('deleted')")
                js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Storage explorer')).click()")
            click("native-old-workspace")
            js("window.preRefreshTop=document.querySelector('.explorer-grid').getBoundingClientRect().top")
            click("↻ Refresh")
            wait("return !!document.querySelector('header .scan-status .spinner')")
            check("native refresh status does not shift workspace", "return document.querySelector('.explorer-grid').getBoundingClientRect().top===window.preRefreshTop && !!document.querySelector('header .scan-status')")
            wait("return !document.querySelector('header .scan-status .spinner')")
            js("const s=document.querySelector('[role=\"separator\"][aria-label=\"Inspector width\"]');window.oldPaneWidth=+s.getAttribute('aria-valuenow');s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}))")
            wait("return +document.querySelector('[role=\"separator\"][aria-label=\"Inspector width\"]').getAttribute('aria-valuenow')===window.oldPaneWidth+20")
            check("native inspector separator resizes independent viewport pane", "return Math.abs(document.querySelector('.inspector').getBoundingClientRect().height-document.querySelector('.explorer-grid').getBoundingClientRect().height)<1 && document.documentElement.scrollHeight<=innerHeight")
            js("const s=document.querySelector('[role=\"separator\"][aria-label=\"Treemap height\"]');window.oldMapHeight=+s.getAttribute('aria-valuenow');s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}))")
            wait("return +document.querySelector('[role=\"separator\"][aria-label=\"Treemap height\"]').getAttribute('aria-valuenow')===window.oldMapHeight-10")
            check("native map separator preserves usable asset list", "return document.querySelector('.table-scroll').clientHeight>=100")
            js("document.querySelector('.map-group-target').focus()")
            wait("return !!document.querySelector('[role=\"tooltip\"]')")
            check("native keyboard map labels disclose full names", "return document.querySelector('[role=\"tooltip\"]').textContent.length>0")
            js("document.querySelector('.map-group-target').blur()")
            check("native reported image label prioritizes repository over tags", "const label=[...document.querySelectorAll('[aria-label^=\"Inspect gitext.alps.cz:5000/\"] .map-asset-label')].map(e=>e.textContent).join('');return label.startsWith('idec_ros2') && !/latest|:v0|gitext/.test(label)")
            click("By project")
            pointer_at('.map-group-target[data-group="/synthetic/native-project"] .map-group-hit', whitespace=True)
            wait("return document.querySelector('[role=\"tooltip\"]')?.textContent.includes('/synthetic/native-project')")
            check("native pointer hover over project header whitespace discloses identity", "return document.querySelector('[role=\"tooltip\"]').textContent.includes('MiB')")
            check("native tiny project has no visible leaf title", "return !document.querySelector('.map-group-target[data-group=\"/synthetic/tiny-project\"] .map-group-label')")
            pointer_at('.project-browser > summary', click_button=True)
            wait("return document.querySelector('.project-browser').open")
            pointer_at('.project-browser-list button[aria-label="Explore project /synthetic/tiny-project"]')
            check("native tiny-project pointer fallback identifies full name and size", "return document.querySelector('.project-browser-list').textContent.includes('/synthetic/tiny-project') && document.querySelector('.project-browser-list').textContent.includes('1 B')")
            js("document.querySelector('.project-browser').open=false")
            click("By category")
            js("document.querySelector('[role=\"separator\"][aria-label=\"Treemap height\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))")
            wait("return document.querySelector('.treemap').viewBox.baseVal.height===40")
            for kind, title in [("container", "Writable layers"), ("image", "Images · unique data"), ("volume", "Volumes")]:
                wait("return !!document.querySelector('.map-group-target[data-group=" + json.dumps(kind) + "]')")
                pointer_at(f'.map-group-target[data-group="{kind}"] .map-group-hit', click_button=True, whitespace=True)
                wait("return document.querySelector('[aria-label=\"Storage location\"]').textContent.includes(" + json.dumps(title) + ")")
                check("native pointer category drill-down: " + title, "return document.querySelectorAll('tbody tr').length>0 && document.querySelector('.inspector h2').textContent==='native-old-workspace'")
                click("All storage")
            volume_name = "Preserved database" if upgrade_from else "keep-database"
            volume_selector = f'[aria-label^="Inspect {volume_name},"]'
            js("window.compactVolumeSelector=arguments[0]", volume_selector)
            wait("const e=document.querySelector(window.compactVolumeSelector);return e && e.getBoundingClientRect().height>8")
            check("native compact leaf center is not intercepted by its category header",
                  "const e=document.querySelector(window.compactVolumeSelector),r=e.getBoundingClientRect(),h=document.querySelector('.map-group-target[data-group=\"volume\"] .map-group-hit').getBoundingClientRect();return r.y>=h.bottom && e.contains(document.elementFromPoint(Math.floor(r.x+r.width/2),Math.floor(r.y+r.height/2))) && document.querySelector('.table-scroll').clientHeight>=100")
            pointer_at(volume_selector, click_button=True)
            wait("return document.querySelector('.inspector h2').textContent===" + json.dumps(volume_name))
            check("native compact pointer leaf inspects without category drill-down",
                  "return !document.querySelector('[aria-label=\"Storage location\"]').textContent.includes('Volumes')")
            shot = http("GET", f"/session/{session}/screenshot")
            (base / "native-compact.png").write_bytes(base64.b64decode(shot))
            click("native-old-workspace")
            wait("return document.querySelector('.inspector h2').textContent==='native-old-workspace'")
            js("document.querySelector('[role=\"separator\"][aria-label=\"Treemap height\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))")
            wait("return Math.abs(document.querySelector('.treemap').viewBox.baseVal.height-document.querySelector('.treemap').getBoundingClientRect().height)<1")
            shot = http("GET", f"/session/{session}/screenshot")
            (base / "native-explorer.png").write_bytes(base64.b64decode(shot))
            check("native mount boundaries rendered", "return document.body.innerText.includes('External bind mount · retained')")
            click("Inspect filesystem changes")
            wait("return document.querySelector('.inspection-details')?.textContent.includes('/scratch/important.txt')")
            check("native filesystem diff rendered inline", "return !!document.querySelector('.inspection-table table') && !document.querySelector('[role=\"dialog\"]')")
            click("Overview")
            click("View metadata (environment omitted)")
            wait("return !!document.querySelector('.inspection-details pre')")
            check("native metadata redacts environment", "return !document.querySelector('.inspection-details').textContent.includes('never-display')")
            click("Overview")
            click("Collect process evidence")
            wait("return document.querySelector('.inspection-details')?.textContent.includes('Stopped containers')")
            check("stopped container process investigation never starts it", "return !document.querySelector('[role=\"dialog\"]') && document.querySelector('.inspection-details').textContent.includes('not started')")
            click("Overview")
            js("document.querySelector('[aria-label=\"Select native-old-workspace\"]').click()")
            click("Review cleanup →")
            wait("return !!document.querySelector('[role=\"region\"][aria-label=\"Review cleanup plan\"]')")
            check("review is a main-workspace page, not a dialog", "return !document.querySelector('[role=\"dialog\"]') && !!document.querySelector('main [aria-label=\"Review cleanup plan\"]')")
            check("native delete gated on explicit confirmation", "return [...document.querySelectorAll('button')].find(b=>b.textContent==='Delete reviewed assets').disabled")
            js("document.querySelector('.confirmation input').click()")
            click("Delete reviewed assets")
            wait("return !!document.querySelector('.cleanup-action-progress [data-status=\"deleting\"]')")
            check("native typed item progress is visible", "return document.querySelector('[aria-label=\"Cleanup progress\"]').textContent.includes('0 of 1 actions finished') && !!document.querySelector('.cleanup-action-progress .spinner')")
            shot = http("GET", f"/session/{session}/screenshot")
            (base / "native-progress.png").write_bytes(base64.b64decode(shot))
            wait("return !!document.querySelector('[role=\"region\"][aria-label=\"Cleanup result\"]')")
            check("native execution and verification rendered", "return document.querySelector('[aria-label=\"Cleanup result\"]').textContent.includes('deleted')")
            js("[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Cleanup history')).click()")
            wait("return !!document.querySelector('.history-list a')")
            check("native saved history is a main-workspace list", "return !document.querySelector('[role=\"dialog\"]') && !!document.querySelector('main [aria-label=\"Cleanup history\"]')")
            js("document.querySelector('.history-list a').click()")
            wait("return !!document.querySelector('[aria-label=\"Cleanup result\"]')")
            check("native persisted result reopens without a dialog", "return document.querySelector('[aria-label=\"Cleanup result\"]').textContent.includes('Original estimate') && !document.querySelector('[role=\"dialog\"]')")
            screenshot = http("GET", f"/session/{session}/screenshot")
            (base / "native-results.png").write_bytes(base64.b64decode(screenshot))
            assert Handler.mutations == ["/v1.56/containers/native-old?force=false&v=false"] * (2 if upgrade_from else 1), Handler.mutations
            checks.append("only reviewed non-forced container deletion; volume and bind mount retained")
            (base / "native-report.json").write_text(json.dumps({"binary": binary, "upgradeFrom": upgrade_from, "upgradeVersion": upgrade_version if upgrade_from else None, "checks": checks, "mutations": Handler.mutations}, indent=2))
            print(f"Native desktop: {len(checks)} checks passed.", flush=True)
        finally:
            if session:
                http("DELETE", f"/session/{session}")
            driver.terminate()
            driver.wait(timeout=15)
            logfile.close()
            engine.shutdown()


if __name__ == "__main__":
    main()
