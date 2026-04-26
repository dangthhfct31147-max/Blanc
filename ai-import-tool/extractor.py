"""
Extractor: extracts structured data with either local Ollama or Codex CLI.
- AI_PROVIDER=codex: use Codex CLI (cloud fallback for low-memory machines)
- AI_PROVIDER=ollama: use local Ollama
- AI_PROVIDER=auto: try Ollama first, then Codex
"""
import json
import re
import base64
import os
import shutil
import subprocess
import tempfile
from html import unescape
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import ollama
from dotenv import load_dotenv
from prompts import PROMPTS, EDIT_PROMPT_TEMPLATE

load_dotenv()

AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama").strip().lower()
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3.5:latest")
OLLAMA_VISION_MODEL = os.getenv("OLLAMA_VISION_MODEL", OLLAMA_MODEL)
CODEX_COMMAND = os.getenv("CODEX_COMMAND", "codex").strip() or "codex"
CODEX_MODEL = os.getenv("CODEX_MODEL", "").strip()


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


OLLAMA_NUM_CTX = _int_env("OLLAMA_NUM_CTX", 2048)
CODEX_TIMEOUT_SECONDS = _int_env("CODEX_TIMEOUT_SECONDS", 300)
MAX_URL_TEXT_CHARS = _int_env("MAX_URL_TEXT_CHARS", 20000)
MAX_URL_METADATA_CHARS = _int_env("MAX_URL_METADATA_CHARS", 8000)
MAX_IMAGE_CANDIDATES = _int_env("MAX_IMAGE_CANDIDATES", 12)
MAX_LINK_CANDIDATES = _int_env("MAX_LINK_CANDIDATES", 12)
MAX_RELATED_PAGES = _int_env("MAX_RELATED_PAGES", 2)
MAX_RELATED_PAGE_TEXT_CHARS = _int_env("MAX_RELATED_PAGE_TEXT_CHARS", 5000)
MAX_STRUCTURED_DATA_ITEMS = _int_env("MAX_STRUCTURED_DATA_ITEMS", 24)

_client = None

def get_client():
    global _client
    if _client is None:
        _client = ollama.Client(host=OLLAMA_HOST)
    return _client


def _parse_json_response(text: str) -> dict:
    """Extract JSON from model response, stripping markdown fences and <think> blocks."""
    text = text.strip()
    # Strip <think>...</think> blocks (qwen3 thinking mode)
    text = re.sub(r"<think>[\s\S]*?</think>", "", text).strip()
    # Strip ```json ... ``` or ``` ... ```
    fence = re.match(r"^```(?:json)?\s*([\s\S]*?)```\s*$", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        embedded = _find_first_json_object(text)
        if embedded:
            try:
                return json.loads(embedded)
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Model returned invalid JSON: {e}\n\nRaw response:\n{text[:500]}")


def _find_first_json_object(text: str) -> str | None:
    """Return the first balanced JSON object in a response, if the model added prose."""
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escaped = False
    for idx in range(start, len(text)):
        ch = text[idx]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue

        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start:idx + 1]

    return None


def _image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def is_probable_url(text: str) -> bool:
    value = text.strip()
    if "\n" in value or " " in value:
        return False
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _normalize_url(base_url: str, maybe_url: str) -> str:
    value = unescape(str(maybe_url or "")).strip().strip("'\"")
    if not value or value.startswith(("data:", "blob:", "javascript:")):
        return ""
    return urljoin(base_url, value)


def _clean_text(value: object, max_chars: int = 1000) -> str:
    text = re.sub(r"\s+", " ", unescape(str(value or ""))).strip()
    return text[:max_chars].rstrip()


def _pick_srcset_candidate(srcset: str) -> str:
    best_url = ""
    best_score = -1.0
    for raw_candidate in (srcset or "").split(","):
        parts = raw_candidate.strip().split()
        if not parts:
            continue

        candidate_url = parts[0]
        score = 0.0
        if len(parts) > 1:
            descriptor = parts[1].lower()
            try:
                if descriptor.endswith("w"):
                    score = float(descriptor[:-1])
                elif descriptor.endswith("x"):
                    score = float(descriptor[:-1]) * 1000
            except ValueError:
                score = 0.0

        if score > best_score:
            best_url = candidate_url
            best_score = score

    return best_url


STYLE_URL_RE = re.compile(r"url\((['\"]?)(.*?)\1\)", re.IGNORECASE)
SIZE_IN_URL_RE = re.compile(r"(?<!\d)([2-9]\d{2,4})[xX_-]([2-9]\d{2,4})(?!\d)")


def _extract_style_image_urls(style: str) -> list[str]:
    urls = []
    for _quote, raw_url in STYLE_URL_RE.findall(style or ""):
        value = raw_url.strip()
        if value and not value.lower().startswith(("data:", "linear-gradient", "radial-gradient")):
            urls.append(value)
    return urls


def _extract_url_dimensions(image_url: str) -> tuple[int, int]:
    match = SIZE_IN_URL_RE.search(image_url or "")
    if not match:
        return 0, 0
    return int(match.group(1)), int(match.group(2))


def _as_list(value: object) -> list:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def _json_value_text(value: object) -> str:
    if isinstance(value, str):
        return _clean_text(value)
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return ", ".join(filter(None, (_json_value_text(item) for item in value)))[:1000]
    if isinstance(value, dict):
        for key in ("name", "headline", "title", "description", "text", "@id", "url"):
            text = _json_value_text(value.get(key))
            if text:
                return text
        details = []
        for key in ("price", "priceCurrency", "lowPrice", "highPrice", "availability", "validFrom", "address", "email", "telephone"):
            text = _json_value_text(value.get(key))
            if text:
                details.append(f"{key}: {text}")
        if details:
            return ", ".join(details)[:1000]
    return ""


def _json_urls(base_url: str, value: object) -> list[str]:
    urls = []
    if isinstance(value, str):
        normalized = _normalize_url(base_url, value)
        if normalized:
            urls.append(normalized)
    elif isinstance(value, list):
        for item in value:
            urls.extend(_json_urls(base_url, item))
    elif isinstance(value, dict):
        for key in ("url", "contentUrl", "thumbnailUrl", "@id"):
            urls.extend(_json_urls(base_url, value.get(key)))
    return urls


class PageContentExtractor(HTMLParser):
    """Extract visible text, metadata, links, and representative images from a web page."""

    META_IMAGE_KEYS = {
        "image",
        "thumbnail",
        "thumbnailurl",
        "itemprop:image",
        "og:image",
        "og:image:url",
        "og:image:secure_url",
        "twitter:image",
        "twitter:image:src",
    }
    META_TEXT_KEYS = {
        "title",
        "description",
        "keywords",
        "author",
        "canonical",
        "og:title",
        "og:description",
        "og:type",
        "og:url",
        "og:site_name",
        "twitter:title",
        "twitter:description",
        "article:author",
        "article:published_time",
        "article:modified_time",
        "article:section",
        "article:tag",
        "event:start_time",
        "event:end_time",
        "event:location",
    }
    IMAGE_ATTRS = (
        "src",
        "data-src",
        "data-original",
        "data-original-src",
        "data-lazy-src",
        "data-lazy",
        "data-url",
        "data-image",
        "data-bg",
        "data-background",
        "data-background-image",
        "poster",
    )
    SRCSET_ATTRS = ("srcset", "data-srcset", "data-lazy-srcset")
    RELATED_LINK_KEYWORDS = (
        "dang-ky",
        "đăng ký",
        "register",
        "registration",
        "apply",
        "submit",
        "chi-tiet",
        "chi tiết",
        "detail",
        "the-le",
        "thể lệ",
        "rules",
        "timeline",
        "schedule",
        "lich-trinh",
        "lịch trình",
        "prize",
        "award",
        "eligibility",
        "faq",
        "pdf",
        "brochure",
        "syllabus",
        "curriculum",
        "course",
        "contest",
        "competition",
        "event",
        "scholarship",
        "hoc-bong",
        "học bổng",
    )
    LOW_VALUE_LINK_KEYWORDS = (
        "facebook.com/sharer",
        "twitter.com/share",
        "mailto:",
        "tel:",
        "login",
        "sign-in",
        "signup",
        "privacy",
        "terms",
        "javascript:",
    )

    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.text_parts = []
        self.meta_images = []
        self.image_candidates = []
        self.links = []
        self.metadata = {}
        self.structured_data = []
        self._skip_depth = 0
        self._script_stack = []
        self._active_links = []
        self._capture_title = False
        self._title_parts = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        attrs_dict = {str(key).lower(): value or "" for key, value in attrs}

        if tag == "script":
            self._skip_depth += 1
            self._script_stack.append({
                "type": attrs_dict.get("type", "").lower(),
                "id": attrs_dict.get("id", ""),
                "text": [],
            })
            return

        if tag in ("style", "nav", "footer", "header", "noscript", "svg"):
            self._skip_depth += 1

        if tag == "title":
            self._capture_title = True

        if tag == "meta":
            self._handle_meta(attrs_dict)

        if tag == "link":
            self._handle_link(attrs_dict)

        if tag in ("img", "source", "video"):
            for image_url in self._image_urls_from_attrs(attrs_dict):
                self._add_image_candidate(image_url, attrs_dict, source=tag)

        for raw_style_url in _extract_style_image_urls(attrs_dict.get("style") or ""):
            self._add_image_candidate(raw_style_url, attrs_dict, source=f"{tag}:style", bonus=-25)

        if tag == "a":
            link_url = _normalize_url(self.base_url, attrs_dict.get("href") or "")
            if link_url:
                link = {
                    "url": link_url,
                    "text": _clean_text(attrs_dict.get("aria-label") or attrs_dict.get("title") or "", 300),
                    "score": self._score_link(link_url, attrs_dict),
                }
                self.links.append(link)
                self._active_links.append(link)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "title":
            self._capture_title = False
            title = _clean_text(" ".join(self._title_parts), 500)
            if title:
                self._set_metadata("title", title)

        if tag == "a" and self._active_links:
            self._active_links.pop()

        if tag == "script":
            script = self._script_stack.pop() if self._script_stack else None
            if script:
                self._process_structured_script(script)
            self._skip_depth = max(0, self._skip_depth - 1)
            return

        if tag in ("style", "nav", "footer", "header", "noscript", "svg"):
            self._skip_depth = max(0, self._skip_depth - 1)

    def handle_data(self, data):
        stripped = data.strip()
        if not stripped:
            return

        if self._script_stack:
            current = self._script_stack[-1]
            if self._should_collect_script(current):
                current["text"].append(data)
            return

        if self._capture_title:
            self._title_parts.append(stripped)

        if self._active_links:
            link = self._active_links[-1]
            pieces = [link.get("text", ""), stripped]
            link["text"] = _clean_text(" ".join(filter(None, pieces)), 300)
            link["score"] = self._score_link(link["url"], {"title": link["text"]})

        if self._skip_depth:
            return

        self.text_parts.append(stripped)

    def get_text(self) -> str:
        return "\n".join(self.text_parts)

    def get_image_items(self) -> list[dict]:
        seen = set()
        images = []

        for image_url in self.meta_images:
            if image_url not in seen:
                images.append({
                    "url": image_url,
                    "score": 2000 + self._score_image({}, image_url),
                    "source": "metadata",
                    "alt": "",
                })
                seen.add(image_url)

        sorted_candidates = sorted(self.image_candidates, key=lambda item: item["score"], reverse=True)
        for item in sorted_candidates:
            image_url = item["url"]
            if item["score"] <= -100 or image_url in seen:
                continue
            images.append(item)
            seen.add(image_url)
            if len(images) >= MAX_IMAGE_CANDIDATES:
                break

        return images

    def get_images(self) -> list[str]:
        return [item["url"] for item in self.get_image_items()]

    def get_links(self) -> list[str]:
        return [item["url"] for item in self.get_context_links(include_neutral=True)]

    def get_context_links(self, include_neutral: bool = False) -> list[dict]:
        seen = set()
        links = []
        sorted_links = sorted(self.links, key=lambda item: item["score"], reverse=True)
        for item in sorted_links:
            link_url = item["url"]
            if link_url in seen:
                continue
            if not include_neutral and item["score"] <= 0:
                continue
            links.append({
                "url": link_url,
                "text": _clean_text(item.get("text", ""), 300),
                "score": item["score"],
            })
            seen.add(link_url)
            if len(links) >= MAX_LINK_CANDIDATES:
                break
        return links

    def get_metadata(self) -> dict:
        return dict(self.metadata)

    def get_structured_data(self) -> list[dict]:
        return self.structured_data[:MAX_STRUCTURED_DATA_ITEMS]

    def _handle_meta(self, attrs: dict) -> None:
        raw_key = attrs.get("property") or attrs.get("name") or attrs.get("itemprop") or ""
        key = raw_key.strip().lower()
        if attrs.get("itemprop") and not key.startswith("itemprop:"):
            itemprop_key = f"itemprop:{key}"
        else:
            itemprop_key = key
        content = _clean_text(attrs.get("content"), 1200)
        if not key or not content:
            return

        if key in self.META_IMAGE_KEYS or itemprop_key in self.META_IMAGE_KEYS:
            image_url = _normalize_url(self.base_url, content)
            if image_url:
                self.meta_images.append(image_url)
            return

        if attrs.get("itemprop"):
            self._set_metadata(itemprop_key, content)
            return

        if key in self.META_TEXT_KEYS or key.startswith(("og:", "twitter:", "article:", "event:")):
            self._set_metadata(key, content)

    def _handle_link(self, attrs: dict) -> None:
        rel = (attrs.get("rel") or "").lower()
        href = _normalize_url(self.base_url, attrs.get("href") or "")
        if not href:
            return

        if "canonical" in rel:
            self._set_metadata("canonical", href)

        is_image_link = (
            "image_src" in rel
            or ("preload" in rel and (attrs.get("as") or "").lower() == "image")
            or (attrs.get("type") or "").lower().startswith("image/")
        )
        if is_image_link and "icon" not in rel:
            self._add_image_candidate(href, attrs, source=f"link:{rel}", bonus=250)

    def _set_metadata(self, key: str, value: str) -> None:
        text = _clean_text(value, 1200)
        if not text:
            return
        if key not in self.metadata:
            self.metadata[key] = text

    def _image_urls_from_attrs(self, attrs: dict) -> list[str]:
        urls = []
        for attr in self.SRCSET_ATTRS:
            candidate = _pick_srcset_candidate(attrs.get(attr) or "")
            if candidate:
                urls.append(candidate)

        for attr in self.IMAGE_ATTRS:
            value = attrs.get(attr)
            if value:
                urls.append(value)

        return urls

    def _add_image_candidate(self, raw_url: str, attrs: dict, source: str, bonus: float = 0) -> None:
        image_url = _normalize_url(self.base_url, raw_url)
        if not image_url:
            return
        alt = _clean_text(attrs.get("alt") or attrs.get("aria-label") or attrs.get("title") or "", 300)
        self.image_candidates.append({
            "url": image_url,
            "score": self._score_image(attrs, image_url) + bonus,
            "source": source,
            "alt": alt,
        })

    def _score_image(self, attrs: dict, image_url: str) -> float:
        haystack = " ".join([
            image_url,
            attrs.get("alt") or "",
            attrs.get("class") or "",
            attrs.get("id") or "",
            attrs.get("title") or "",
            attrs.get("aria-label") or "",
        ]).lower()

        if any(keyword in haystack for keyword in ("sprite", "favicon", "tracking", "pixel", "1x1")):
            return -200
        if any(keyword in haystack for keyword in ("logo", "icon", "avatar")):
            return -150
        if image_url.lower().split("?")[0].endswith(".svg"):
            return -150

        score = 0.0
        if any(keyword in haystack for keyword in (
            "poster",
            "banner",
            "cover",
            "hero",
            "thumbnail",
            "contest",
            "competition",
            "event",
            "hackathon",
            "course",
            "news",
            "article",
            "scholarship",
        )):
            score += 1000
        if image_url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
            score += 120

        try:
            width = int(float(attrs.get("width") or 0))
            height = int(float(attrs.get("height") or 0))
        except ValueError:
            width, height = 0, 0

        url_width, url_height = _extract_url_dimensions(image_url)
        width = width or url_width
        height = height or url_height
        if width and height:
            if width < 120 or height < 90:
                score -= 150
            score += min(width * height / 1000, 900)
            aspect = width / height if height else 0
            if 1.2 <= aspect <= 2.2:
                score += 120

        return score

    def _score_link(self, link_url: str, attrs: dict) -> float:
        text = _clean_text(attrs.get("title") or attrs.get("aria-label") or attrs.get("text") or "", 300)
        haystack = f"{link_url} {text}".lower()
        if any(keyword in haystack for keyword in self.LOW_VALUE_LINK_KEYWORDS):
            return -100

        score = 0.0
        if _same_origin(self.base_url, link_url):
            score += 10
        if any(keyword in haystack for keyword in self.RELATED_LINK_KEYWORDS):
            score += 100
        if urlparse(link_url).path.lower().endswith(".pdf"):
            score += 150
        return score

    def _should_collect_script(self, script: dict) -> bool:
        script_type = (script.get("type") or "").lower()
        script_id = (script.get("id") or "").lower()
        return "ld+json" in script_type or script_id in {"__next_data__", "__nuxt_data__"}

    def _process_structured_script(self, script: dict) -> None:
        if not self._should_collect_script(script):
            return

        raw_text = "\n".join(script.get("text") or []).strip()
        if not raw_text:
            return

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            embedded = _find_first_json_object(raw_text)
            if not embedded:
                return
            try:
                data = json.loads(embedded)
            except json.JSONDecodeError:
                return

        for node in self._iter_structured_nodes(data):
            self._ingest_structured_node(node)
            if len(self.structured_data) >= MAX_STRUCTURED_DATA_ITEMS:
                break

    def _iter_structured_nodes(self, value: object):
        if isinstance(value, list):
            for item in value:
                yield from self._iter_structured_nodes(item)
            return

        if not isinstance(value, dict):
            return

        if any(key in value for key in ("@type", "name", "headline", "description", "startDate", "endDate", "image")):
            yield value

        for key in ("@graph", "mainEntity", "itemListElement", "items", "events", "coursePrerequisites"):
            child = value.get(key)
            if child is not None:
                yield from self._iter_structured_nodes(child)

    def _ingest_structured_node(self, node: dict) -> None:
        summary = {}
        for key in (
            "@type",
            "name",
            "headline",
            "title",
            "description",
            "startDate",
            "endDate",
            "datePublished",
            "dateModified",
            "eventStatus",
            "applicationDeadline",
            "url",
            "email",
            "telephone",
        ):
            text = _json_value_text(node.get(key))
            if text:
                summary[key] = text

        for key in ("organizer", "provider", "author", "publisher", "location", "offers"):
            text = _json_value_text(node.get(key))
            if text:
                summary[key] = text

        for entity_key in ("organizer", "provider", "author", "publisher"):
            entity = node.get(entity_key)
            if isinstance(entity, dict):
                logo_urls = _json_urls(self.base_url, entity.get("logo"))
                if logo_urls:
                    summary[f"{entity_key}.logo"] = logo_urls[0]
                entity_url = _json_value_text(entity.get("url"))
                if entity_url:
                    summary[f"{entity_key}.url"] = _normalize_url(self.base_url, entity_url) or entity_url
                for contact_key in ("email", "telephone"):
                    contact = _json_value_text(entity.get(contact_key))
                    if contact:
                        summary[f"{entity_key}.{contact_key}"] = contact

        for image_key in ("image", "thumbnail", "thumbnailUrl", "primaryImageOfPage"):
            for image_url in _json_urls(self.base_url, node.get(image_key)):
                self._add_image_candidate(image_url, {}, source=f"json-ld:{image_key}", bonus=350)

        for logo_url in _json_urls(self.base_url, node.get("logo")):
            self._add_image_candidate(logo_url, {}, source="json-ld:logo", bonus=-75)

        for link_key in ("url", "sameAs", "mainEntityOfPage"):
            for link_url in _json_urls(self.base_url, node.get(link_key)):
                self.links.append({
                    "url": link_url,
                    "text": _clean_text(summary.get("name") or summary.get("headline") or link_key, 300),
                    "score": self._score_link(link_url, {"title": summary.get("name") or ""}) + 40,
                })

        if summary:
            compact = json.dumps(summary, ensure_ascii=False, sort_keys=True)
            if compact not in {json.dumps(item, ensure_ascii=False, sort_keys=True) for item in self.structured_data}:
                self.structured_data.append(summary)


def _fetch_html(url: str) -> str:
    import urllib.request

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def _parse_page(url: str, html: str) -> tuple[PageContentExtractor, str, list[str]]:
    parser = PageContentExtractor(url)
    parser.feed(html)
    return parser, parser.get_text(), parser.get_images()


def _same_origin(first_url: str, second_url: str) -> bool:
    first = urlparse(first_url)
    second = urlparse(second_url)
    return (first.scheme, first.netloc) == (second.scheme, second.netloc)


def _detail_url_candidates(url: str, parser: PageContentExtractor) -> list[str]:
    parsed = urlparse(url)
    path_parts = [part for part in parsed.path.split("/") if part]
    if not path_parts:
        return []

    slug = path_parts[-1]
    candidates = []

    # Some sites expose /ki-thi/<slug> publicly but the richer detail page lives at /<slug>.
    if len(path_parts) >= 2 and path_parts[-2] in {"ki-thi", "cuoc-thi", "contest", "event"}:
        candidates.append(f"{parsed.scheme}://{parsed.netloc}/{slug}")

    for link_url in parser.get_links():
        if not _same_origin(url, link_url):
            continue
        link_path = urlparse(link_url).path.strip("/")
        if link_path == slug or link_path.endswith(f"/{slug}"):
            candidates.append(link_url)

    seen = {url.rstrip("/")}
    unique = []
    for candidate in candidates:
        normalized = candidate.rstrip("/")
        if normalized in seen:
            continue
        unique.append(candidate)
        seen.add(normalized)
    return unique[:3]


def _related_url_candidates(url: str, parser: PageContentExtractor) -> list[str]:
    if MAX_RELATED_PAGES <= 0:
        return []

    candidates = []
    for link in parser.get_context_links():
        link_url = link["url"]
        if not _same_origin(url, link_url):
            continue
        if link_url.rstrip("/") == url.rstrip("/"):
            continue
        candidates.append(link_url)

    seen = {url.rstrip("/")}
    unique = []
    for candidate in candidates:
        normalized = candidate.rstrip("/")
        if normalized in seen:
            continue
        unique.append(candidate)
        seen.add(normalized)
        if len(unique) >= MAX_RELATED_PAGES:
            break
    return unique


def _choose_best_url_page(url: str) -> tuple[str, str, PageContentExtractor, str, list[str], list[str]]:
    html = _fetch_html(url)
    parser, page_text, image_candidates = _parse_page(url, html)
    current = (url, html, parser, page_text, image_candidates)
    best = current
    followed_urls = []

    for candidate in _detail_url_candidates(url, parser):
        try:
            candidate_html = _fetch_html(candidate)
            candidate_parser, candidate_text, candidate_images = _parse_page(candidate, candidate_html)
        except Exception:
            continue

        followed_urls.append(candidate)
        current_score = len(best[3]) + (500 if best[4] else 0)
        candidate_score = len(candidate_text) + (500 if candidate_images else 0)
        if candidate_score > current_score * 1.25 or len(candidate_text) > len(best[3]) + 2000:
            best = (candidate, candidate_html, candidate_parser, candidate_text, candidate_images)

    return (*best, followed_urls)


def _fetch_related_pages(url: str, parser: PageContentExtractor) -> tuple[list[dict], list[str]]:
    related_pages = []
    related_images = []

    for candidate in _related_url_candidates(url, parser):
        if urlparse(candidate).path.lower().endswith((".pdf", ".zip", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx")):
            continue
        try:
            candidate_html = _fetch_html(candidate)
            candidate_parser, candidate_text, candidate_images = _parse_page(candidate, candidate_html)
        except Exception:
            continue

        related_pages.append({
            "url": candidate,
            "text": candidate_text[:MAX_RELATED_PAGE_TEXT_CHARS],
            "metadata": candidate_parser.get_metadata(),
            "structured_data": candidate_parser.get_structured_data(),
            "links": candidate_parser.get_context_links()[:5],
        })
        related_images.extend(candidate_images)

    return related_pages, related_images


def _format_metadata(metadata: dict) -> str:
    if not metadata:
        return ""
    metadata_json = json.dumps(metadata, ensure_ascii=False, indent=2)
    return metadata_json[:MAX_URL_METADATA_CHARS]


def _format_structured_data(structured_data: list[dict]) -> str:
    if not structured_data:
        return ""
    structured_json = json.dumps(structured_data, ensure_ascii=False, indent=2)
    return structured_json[:MAX_URL_METADATA_CHARS]


def _format_image_items(items: list[dict]) -> str:
    if not items:
        return ""
    lines = []
    for item in items[:MAX_IMAGE_CANDIDATES]:
        label_parts = [item.get("source") or "image"]
        if item.get("alt"):
            label_parts.append(f'alt="{item["alt"]}"')
        lines.append(f"- {item['url']} ({'; '.join(label_parts)})")
    return "\n".join(lines)


def _format_link_items(items: list[dict]) -> str:
    if not items:
        return ""
    lines = []
    for item in items[:MAX_LINK_CANDIDATES]:
        label = f" - {item['text']}" if item.get("text") else ""
        lines.append(f"- {item['url']}{label}")
    return "\n".join(lines)


def _build_url_extraction_text(
    original_url: str,
    final_url: str,
    parser: PageContentExtractor,
    page_text: str,
    image_items: list[dict],
    followed_urls: list[str],
    related_pages: list[dict],
) -> str:
    sections = [
        f"URL nguồn người dùng nhập: {original_url}",
    ]

    if final_url.rstrip("/") != original_url.rstrip("/"):
        sections.append(f"URL trang chi tiết tự phát hiện: {final_url}")
    if followed_urls:
        sections.append("Các URL đã kiểm tra thêm:\n" + "\n".join(f"- {item}" for item in followed_urls))

    image_context = _format_image_items(image_items)
    if image_context:
        sections.append(
            "Ảnh ứng viên tìm thấy trên trang. Hãy ưu tiên ảnh poster/banner/cover/hero phù hợp, không chọn logo/icon nếu đã có ảnh đại diện tốt hơn:\n"
            + image_context
        )

    metadata_context = _format_metadata(parser.get_metadata())
    if metadata_context:
        sections.append("Metadata/SEO tìm thấy:\n" + metadata_context)

    structured_context = _format_structured_data(parser.get_structured_data())
    if structured_context:
        sections.append("Dữ liệu có cấu trúc JSON-LD/microdata tìm thấy:\n" + structured_context)

    link_context = _format_link_items(parser.get_context_links())
    if link_context:
        sections.append("Link liên quan tìm thấy trong trang:\n" + link_context)

    sections.append("Nội dung văn bản trang chính:\n" + page_text)

    if related_pages:
        related_sections = []
        for related in related_pages:
            blocks = [f"URL liên quan: {related['url']}"]
            related_meta = _format_metadata(related.get("metadata") or {})
            if related_meta:
                blocks.append("Metadata:\n" + related_meta)
            related_structured = _format_structured_data(related.get("structured_data") or [])
            if related_structured:
                blocks.append("JSON-LD:\n" + related_structured)
            related_links = _format_link_items(related.get("links") or [])
            if related_links:
                blocks.append("Link nổi bật:\n" + related_links)
            if related.get("text"):
                blocks.append("Văn bản:\n" + related["text"])
            related_sections.append("\n\n".join(blocks))
        sections.append("Nội dung từ trang liên quan tự đọc thêm:\n" + "\n\n---\n\n".join(related_sections))

    return "\n\n".join(sections)


def _image_field_for_content_type(content_type: str) -> str:
    if content_type == "document":
        return "thumbnail"
    if content_type == "news":
        return "coverImage"
    return "image"


def _normalize_result_urls(result: dict, base_url: str) -> None:
    for field in ("image", "thumbnail", "coverImage", "source_url", "actionLink", "link"):
        value = result.get(field)
        if isinstance(value, str) and value.strip():
            normalized = _normalize_url(base_url, value)
            if normalized:
                result[field] = normalized

    organizer_details = result.get("organizerDetails")
    if isinstance(organizer_details, dict):
        for field in ("logo", "website"):
            value = organizer_details.get(field)
            if isinstance(value, str) and value.strip():
                normalized = _normalize_url(base_url, value)
                if normalized:
                    organizer_details[field] = normalized


def _ensure_primary_image(result: dict, content_type: str, image_candidates: list[str]) -> None:
    if not image_candidates:
        return

    primary_field = _image_field_for_content_type(content_type)
    if not result.get(primary_field):
        result[primary_field] = image_candidates[0]

    if primary_field == "coverImage":
        if not result.get("image"):
            result["image"] = result["coverImage"]
    elif primary_field == "thumbnail":
        if not result.get("image"):
            result["image"] = result["thumbnail"]
    elif content_type == "news" and not result.get("coverImage"):
        result["coverImage"] = result.get("image") or image_candidates[0]


def _chat_options() -> dict:
    return {
        "temperature": 0.1,
        "num_ctx": OLLAMA_NUM_CTX,
    }


def _codex_json_prompt(prompt: str, has_image: bool = False) -> str:
    image_note = "\nẢnh đầu vào đã được đính kèm qua tham số --image của Codex CLI." if has_image else ""
    return f"""Bạn là provider AI cho ContestHub AI Import Tool.{image_note}

Yêu cầu bắt buộc:
- Chỉ trả về một JSON object hợp lệ.
- Không dùng markdown/code fence.
- Không giải thích, không thêm văn bản ngoài JSON.
- Nếu thiếu thông tin, dùng giá trị mặc định theo prompt.
- Nếu prompt có URL nguồn hoặc URL trang chi tiết, hãy dùng nội dung đã cung cấp là chính và có thể tự kiểm tra URL đó để bổ sung thông tin còn thiếu.

Prompt nghiệp vụ:
{prompt}
"""


def _run_codex(prompt: str, image_path: str | None = None) -> str:
    codex_bin = shutil.which(CODEX_COMMAND)
    if not codex_bin:
        raise RuntimeError(
            f"Không tìm thấy Codex CLI '{CODEX_COMMAND}'. Cài/đăng nhập Codex CLI hoặc chỉnh CODEX_COMMAND trong .env."
        )

    output_path = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".txt", delete=False) as output_file:
            output_path = output_file.name

        cmd = [
            codex_bin,
            "exec",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--ephemeral",
            "--color",
            "never",
            "--output-last-message",
            output_path,
        ]
        if CODEX_MODEL:
            cmd.extend(["--model", CODEX_MODEL])
        if image_path:
            cmd.extend(["--image", image_path])
        cmd.append("-")

        result = subprocess.run(
            cmd,
            input=_codex_json_prompt(prompt, has_image=bool(image_path)),
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=Path(__file__).resolve().parent,
            timeout=CODEX_TIMEOUT_SECONDS,
        )
        final_message = Path(output_path).read_text(encoding="utf-8").strip()

        if result.returncode != 0:
            details = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(f"Codex CLI lỗi ({result.returncode}): {details[-1000:]}")

        final_message = final_message or result.stdout.strip()
        if not final_message:
            raise RuntimeError("Codex CLI không trả về nội dung.")
        return final_message
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"Codex CLI quá thời gian chờ sau {CODEX_TIMEOUT_SECONDS}s") from e
    finally:
        if output_path:
            Path(output_path).unlink(missing_ok=True)


def _run_ollama_text(prompt: str) -> str:
    response = get_client().chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options=_chat_options(),
    )
    return response.message.content


def _run_ollama_image(prompt: str, image_path: str) -> str:
    img_b64 = _image_to_base64(image_path)
    response = get_client().chat(
        model=OLLAMA_VISION_MODEL,
        messages=[{
            "role": "user",
            "content": prompt,
            "images": [img_b64],
        }],
        options=_chat_options(),
    )
    return response.message.content


def _run_ai(prompt: str, image_path: str | None = None) -> str:
    if AI_PROVIDER == "codex":
        return _run_codex(prompt, image_path=image_path)

    if AI_PROVIDER == "auto":
        try:
            if image_path:
                return _run_ollama_image(prompt, image_path)
            return _run_ollama_text(prompt)
        except Exception as ollama_error:
            try:
                return _run_codex(prompt, image_path=image_path)
            except Exception as codex_error:
                raise RuntimeError(
                    f"Ollama lỗi: {ollama_error}\nCodex fallback cũng lỗi: {codex_error}"
                ) from codex_error

    if image_path:
        return _run_ollama_image(prompt, image_path)
    return _run_ollama_text(prompt)


def extract_from_text(content_type: str, text: str) -> dict:
    """Extract structured data from plain text."""
    prompt = PROMPTS[content_type]
    full_prompt = f"{prompt}\n\nNội dung cần trích xuất:\n\n{text}"

    return _parse_json_response(_run_ai(full_prompt))


def extract_from_image(content_type: str, image_path: str, extra_text: str = "") -> dict:
    """Extract structured data from an image file. Requires a vision model."""
    prompt = PROMPTS[content_type]
    if extra_text:
        prompt = f"{prompt}\n\nThông tin bổ sung:\n{extra_text}"

    return _parse_json_response(_run_ai(prompt, image_path=image_path))


def extract_from_url(content_type: str, url: str) -> dict:
    """Fetch URL content and extract structured data."""
    final_url, _html, parser, raw_page_text, _image_candidates, followed_urls = _choose_best_url_page(url)
    page_text = raw_page_text[:MAX_URL_TEXT_CHARS]
    related_pages, related_images = _fetch_related_pages(final_url, parser)

    image_items = parser.get_image_items()
    seen_images = {item["url"] for item in image_items}
    for related_image in related_images:
        if related_image in seen_images:
            continue
        image_items.append({
            "url": related_image,
            "score": 0,
            "source": "related-page",
            "alt": "",
        })
        seen_images.add(related_image)
        if len(image_items) >= MAX_IMAGE_CANDIDATES:
            break

    extraction_text = _build_url_extraction_text(
        original_url=url,
        final_url=final_url,
        parser=parser,
        page_text=page_text,
        image_items=image_items,
        followed_urls=followed_urls,
        related_pages=related_pages,
    )

    result = extract_from_text(content_type, extraction_text)
    _normalize_result_urls(result, final_url)
    if not result.get("source_url"):
        result["source_url"] = final_url or url
    _ensure_primary_image(result, content_type, [item["url"] for item in image_items])
    return result


def refine_with_prompt(current_data: dict, user_request: str) -> dict:
    """Apply user's edit instructions to existing extracted data."""
    current_json = json.dumps(current_data, ensure_ascii=False, indent=2)
    prompt = EDIT_PROMPT_TEMPLATE.format(
        current_json=current_json,
        user_request=user_request,
    )
    return _parse_json_response(_run_ai(prompt))


def has_vision_model() -> bool:
    """Check if a separate vision model is configured."""
    if AI_PROVIDER == "codex":
        return True
    if AI_PROVIDER == "auto" and shutil.which(CODEX_COMMAND):
        return True
    return OLLAMA_VISION_MODEL != OLLAMA_MODEL or "vl" in OLLAMA_VISION_MODEL.lower()


def check_codex_connection() -> tuple[bool, str]:
    """Check if Codex CLI is available."""
    codex_bin = shutil.which(CODEX_COMMAND)
    if not codex_bin:
        return False, f"Không tìm thấy Codex CLI '{CODEX_COMMAND}' trong PATH"

    try:
        result = subprocess.run(
            [codex_bin, "--version"],
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=15,
        )
        if result.returncode != 0:
            details = (result.stderr or result.stdout or "").strip()
            return False, f"Codex CLI lỗi: {details}"
        model = f" | Model: {CODEX_MODEL}" if CODEX_MODEL else " | Model: cấu hình mặc định của Codex"
        return True, f"Codex CLI: {result.stdout.strip()}{model}"
    except Exception as e:
        return False, f"Không kiểm tra được Codex CLI: {e}"


def check_ollama_connection() -> tuple[bool, str]:
    """Check if Ollama is running and the text model is available."""
    try:
        client = get_client()
        models = client.list()
        model_names = [m.model for m in models.models]

        def find_model(name):
            if name in model_names:
                return name
            return next((m for m in model_names if m.startswith(name.split(":")[0])), None)

        text_match = find_model(OLLAMA_MODEL)
        if not text_match:
            return False, f"Model '{OLLAMA_MODEL}' chưa tải. Chạy: ollama pull {OLLAMA_MODEL}"

        if OLLAMA_VISION_MODEL != OLLAMA_MODEL:
            vision_match = find_model(OLLAMA_VISION_MODEL)
            vision_status = f" | Vision: {vision_match}" if vision_match else f" | Vision: '{OLLAMA_VISION_MODEL}' chưa tải"
        else:
            vision_status = " | Vision: dùng chung model text"

        return True, f"✅ Text: {text_match}{vision_status}"
    except Exception as e:
        return False, f"Không kết nối được Ollama tại {OLLAMA_HOST}: {e}"


def check_ai_connection() -> tuple[bool, str]:
    """Check the configured AI provider."""
    if AI_PROVIDER == "codex":
        return check_codex_connection()
    if AI_PROVIDER == "auto":
        ollama_ok, ollama_msg = check_ollama_connection()
        if ollama_ok:
            return True, f"Auto: Ollama sẵn sàng ({ollama_msg})"

        codex_ok, codex_msg = check_codex_connection()
        if codex_ok:
            return True, f"Auto: dùng Codex fallback ({codex_msg}); Ollama không khả dụng ({ollama_msg})"
        return False, f"Auto: Ollama lỗi ({ollama_msg}); Codex lỗi ({codex_msg})"

    return check_ollama_connection()


def backend_label() -> str:
    if AI_PROVIDER == "codex":
        model = CODEX_MODEL or "Codex default"
        return f"Provider: Codex CLI | Model: {model}"
    if AI_PROVIDER == "auto":
        model = CODEX_MODEL or "Codex default"
        return f"Provider: Auto | Ollama: {OLLAMA_MODEL} | Codex: {model}"
    return f"Provider: Ollama | Text: {OLLAMA_MODEL} | Vision: {OLLAMA_VISION_MODEL}"
