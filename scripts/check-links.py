"""Optional HTTP audit. A failed request is not proof that a resource is absent.

Run after editing data: python scripts/check-links.py
No credentials, dependencies, or paid services are used.
"""
import concurrent.futures
import datetime
import json
import pathlib
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
urls = {}
previous = {}
report_file = ROOT / "docs/link-audit.json"
if report_file.exists() and "--refresh" not in sys.argv:
    old = json.loads(report_file.read_text())
    previous = {entry["url"]: {**entry, "observedAt": entry.get("observedAt", old["checked"])} for entry in old.get("results", [])}
for file in sorted((ROOT / "data/papers").glob("*.json")):
    paper = json.loads(file.read_text())
    for kind, resource in paper.get("resources", {}).items():
        url = resource.get("url")
        if url:
            urls.setdefault(url, []).append({"id": paper["id"], "resource": kind})


def check(item):
    url, uses = item
    if url in previous:
        return {**previous[url], "uses": uses}
    result = {"url": url, "uses": uses, "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "EmbodiedAtlas-LinkAudit/1.0"})
        with urllib.request.urlopen(request, timeout=15) as response:
            result.update(http=response.status, finalUrl=response.url, state="reachable")
    except urllib.error.HTTPError as error:
        result.update(http=error.code, state="unavailable" if error.code in (404, 410) else "inconclusive")
    except Exception as error:
        result.update(state="inconclusive", error=type(error).__name__)
    return result


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(check, sorted(urls.items())))
report = {
    "checked": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "scope": "Resource URLs only; HTTP HEAD; observations may be reused (see observedAt; --refresh checks again). 403/429/timeouts are inconclusive. Reachability is not download, license, or reproduction verification.",
    "counts": {state: sum(r["state"] == state for r in results) for state in ("reachable", "unavailable", "inconclusive")},
    "results": results,
}
(ROOT / "docs/link-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(report["counts"]))
