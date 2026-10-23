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


def archive_members(archive, pattern=None):
    total = 0
    count = 0
    for entry in archive.infolist()[:20000]:
        if entry.is_dir() or entry.flag_bits & 1 or entry.file_size > MAX_MEMBER:
            continue
        # Reject archive traversal names even though no extraction occurs.
        name = entry.filename.replace("\\", "/")
        if name.startswith("/") or ".." in name.split("/") or ":" in name:
            continue
        if pattern and not re.fullmatch(pattern, name):
            continue
        count += 1
        total += entry.file_size
        if total > MAX_ARCHIVE_BYTES or count > 200:
            break
        yield name, entry


def office_text(archive, suffix):
    pattern = {".pptx": r"ppt/slides/slide\d+\.xml", ".docx": r"word/document\.xml", ".xlsx": r"xl/(sharedStrings|worksheets/sheet\d+)\.xml"}[suffix]
    selected = list(archive_members(archive, pattern))
    selected.sort(key=lambda item: int(re.search(r"\d+", item[0]).group()) if re.search(r"\d+", item[0]) else 0)
    parts, length = [], 0
    for member_name, entry in selected:
        xml = archive.read(entry)
        if b"<!DOCTYPE" in xml.upper() or b"<!ENTITY" in xml.upper():
            continue
        root = ET.fromstring(xml)
        texts = [node.text for node in root.iter() if node.tag.rsplit("}", 1)[-1] in ("t", "v") and node.text]
        part = f"\n## {member_name}\n" + "\n".join(texts)
        parts.append(part)
        length += len(part)
        if length > MAX_TEXT: break
    return "\n".join(parts)[:MAX_TEXT + 1]


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
            if suffix in (".pptx", ".docx", ".xlsx"):
                return office_text(archive, suffix)
            members = list(archive_members(archive))
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
        if path.suffix.lower() in (".pptx", ".docx", ".xlsx"):
            with zipfile.ZipFile(path) as archive:
                text = office_text(archive, path.suffix.lower())
        elif path.suffix.lower() in (".mp4", ".webm", ".mp3", ".m4a"):
            caption = path.with_suffix(path.suffix + '.vtt')
            if not caption.is_file() or caption.stat().st_size > 2 * 1024 * 1024:
                return {"text": "", "textStatus": "unsupported"}
            lines = decode(caption.read_bytes()).splitlines()
            text = '\n'.join(line for line in lines if line.strip() and not re.match(r'^(WEBVTT|\d+$|.*-->.*|NOTE\b)', line))
            parser = HtmlText()
            parser.feed(text)
            text = ''.join(parser.parts)
        elif path.stat().st_size > 150 * 1024 * 1024:
            return {"text": "", "textStatus": "unsupported"}
        else:
            text = extract_bytes(path.name, path.read_bytes())
        text = text.replace("\x00", "").strip()
        if not text:
            return {"text": "", "textStatus": "empty"}
        return {"text": text[:MAX_TEXT], "textStatus": "truncated" if len(text) > MAX_TEXT else "ready"}
    except Exception:
        return {"text": "", "textStatus": "error"}


def rich_text_body(value):
    """Keep only published page instructions, never a form or invented metadata."""
    if not isinstance(value, dict):
        return ""
    text = value.get("Text")
    if isinstance(text, str) and text.strip():
        return text.replace("\x00", "").strip()[:MAX_TEXT + 1]
    html = value.get("Html")
    return extract_bytes("page.html", html.encode("utf-8")).replace("\x00", "").strip()[:MAX_TEXT + 1] if isinstance(html, str) else ""
