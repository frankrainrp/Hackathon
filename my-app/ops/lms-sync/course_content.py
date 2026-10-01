"""Extract bounded, read-only study text. Archives never write member paths to disk."""
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET

MAX_TEXT = 20000
MAX_MEMBER = 20 * 1024 * 1024
MAX_ARCHIVE_BYTES = 60 * 1024 * 1024
TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".py", ".sql", ".js", ".ts", ".css"}


class HtmlText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1
        elif tag in ("p", "br", "div", "li", "h1", "h2", "h3", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def decode(data):
    for encoding in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeError:
            continue
    return data.decode("utf-8", errors="replace")


def archive_members(archive):
    total = 0
    for entry in archive.infolist()[:200]:
        if entry.is_dir() or entry.flag_bits & 1 or entry.file_size > MAX_MEMBER:
            continue
        total += entry.file_size
        if total > MAX_ARCHIVE_BYTES:
            break
        # Reject archive traversal names even though no extraction occurs.
        name = entry.filename.replace("\\", "/")
        if name.startswith("/") or ".." in name.split("/") or ":" in name:
            continue
        yield name, entry


def extract_bytes(name, data, depth=0):
    suffix = Path(name).suffix.lower()
    if suffix in TEXT_EXTENSIONS:
        return decode(data)[:MAX_TEXT + 1]
    if suffix in (".html", ".htm"):
        parser = HtmlText()
        parser.feed(decode(data))
        return "".join(parser.parts)[:MAX_TEXT + 1]
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted and not reader.decrypt(""):
            return ""
        parts, length = [], 0
        for index, page in enumerate(reader.pages[:100]):
            extracted = page.extract_text() or ""
            if not extracted.strip():
                continue
            text = f"\n## Page {index + 1}\n{extracted}"
            parts.append(text)
            length += len(text)
            if length > MAX_TEXT:
                break
        return "\n".join(parts)[:MAX_TEXT + 1]
    if suffix in (".pptx", ".docx", ".xlsx", ".zip"):
        with zipfile.ZipFile(BytesIO(data)) as archive:
            members = list(archive_members(archive))
            if suffix in (".pptx", ".docx", ".xlsx"):
                pattern = {".pptx": r"ppt/slides/slide\d+\.xml$", ".docx": r"word/document\.xml$", ".xlsx": r"xl/(sharedStrings|worksheets/sheet\d+)\.xml$"}[suffix]
                selected = [(n, e) for n, e in members if re.match(pattern, n)]
                selected.sort(key=lambda item: int(re.search(r"\d+", item[0]).group()) if re.search(r"\d+", item[0]) else 0)
                parts = []
                for member_name, entry in selected:
                    xml = archive.read(entry)
                    if b"<!DOCTYPE" in xml.upper() or b"<!ENTITY" in xml.upper():
                        continue
                    root = ET.fromstring(xml)
                    texts = [node.text for node in root.iter() if node.tag.rsplit("}", 1)[-1] in ("t", "v") and node.text]
                    parts.append(f"\n## {member_name}\n" + "\n".join(texts))
                    if sum(map(len, parts)) > MAX_TEXT:
                        break
                return "\n".join(parts)[:MAX_TEXT + 1]
            if depth >= 2:
                return ""
            parts = []
            for member_name, entry in members:
                try:
                    text = extract_bytes(member_name, archive.read(entry), depth + 1)
                except Exception:
                    continue
                if text.strip():
                    parts.append(f"\n## File: {member_name}\n{text}")
                if sum(map(len, parts)) > MAX_TEXT:
                    break
            return "\n".join(parts)[:MAX_TEXT + 1]
    return ""


def extract_material(path: Path):
    try:
        if path.stat().st_size > 150 * 1024 * 1024:
            return {"text": "", "textStatus": "unsupported"}
        text = extract_bytes(path.name, path.read_bytes()).replace("\x00", "").strip()
        if not text:
            return {"text": "", "textStatus": "empty"}
        return {"text": text[:MAX_TEXT], "textStatus": "truncated" if len(text) > MAX_TEXT else "ready"}
    except Exception:
        return {"text": "", "textStatus": "error"}
