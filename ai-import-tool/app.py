"""
ContestHub AI Import Tool
Gradio UI — extract, review, edit, approve, send.
"""
import json
import os
import tempfile
import inspect
from pathlib import Path

import gradio as gr
from dotenv import load_dotenv

load_dotenv()

from extractor import extract_from_text, extract_from_image, extract_from_url, refine_with_prompt, check_ai_connection, has_vision_model, backend_label, is_probable_url
from sender import send_to_server

CONTENT_TYPES = ["contest", "scholarship", "document", "news", "course"]
CONTENT_TYPE_LABELS = {
    "contest": "Cuộc thi",
    "scholarship": "Học bổng",
    "document": "Tài liệu",
    "news": "Tin tức",
    "course": "Khóa học",
}
APP_THEME = gr.themes.Soft()


def launch_supports_theme() -> bool:
    return "theme" in inspect.signature(gr.Blocks.launch).parameters

# ── State helpers ──────────────────────────────────────────────────────────────

def fmt_json(data: dict) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)

def parse_json_safe(text: str) -> tuple[dict | None, str]:
    try:
        return json.loads(text), ""
    except json.JSONDecodeError as e:
        return None, f"JSON không hợp lệ: {e}"

# ── Core actions ───────────────────────────────────────────────────────────────

def check_status():
    ok, msg = check_ai_connection()
    icon = "✅" if ok else "❌"
    return f"{icon} {msg}"

def do_extract_text(content_type, text_input):
    if not text_input.strip():
        return "", "⚠️ Vui lòng nhập nội dung cần trích xuất."
    try:
        if is_probable_url(text_input):
            data = extract_from_url(content_type, text_input.strip())
            return fmt_json(data), "✅ Phát hiện URL và trích xuất từ trang web thành công."
        data = extract_from_text(content_type, text_input)
        return fmt_json(data), "✅ Trích xuất thành công. Kiểm tra kết quả bên dưới."
    except Exception as e:
        return "", f"❌ Lỗi: {e}"

def do_extract_url(content_type, url_input):
    if not url_input.strip():
        return "", "⚠️ Vui lòng nhập URL."
    try:
        data = extract_from_url(content_type, url_input.strip())
        return fmt_json(data), "✅ Trích xuất từ URL thành công."
    except Exception as e:
        return "", f"❌ Lỗi: {e}"

def do_extract_image(content_type, image_file, extra_text):
    if image_file is None:
        return "", "⚠️ Vui lòng tải lên hình ảnh."
    try:
        data = extract_from_image(content_type, image_file, extra_text or "")
        return fmt_json(data), "✅ Trích xuất từ ảnh thành công."
    except Exception as e:
        return "", f"❌ Lỗi: {e}"

def do_refine(json_text, user_request):
    if not json_text.strip():
        return json_text, "⚠️ Chưa có dữ liệu để chỉnh sửa."
    if not user_request.strip():
        return json_text, "⚠️ Vui lòng nhập yêu cầu chỉnh sửa."
    data, err = parse_json_safe(json_text)
    if err:
        return json_text, f"❌ {err}"
    try:
        refined = refine_with_prompt(data, user_request)
        return fmt_json(refined), "✅ Đã chỉnh sửa theo yêu cầu."
    except Exception as e:
        return json_text, f"❌ Lỗi: {e}"

def do_send(content_type, json_text):
    if not json_text.strip():
        return "⚠️ Chưa có dữ liệu để gửi."
    data, err = parse_json_safe(json_text)
    if err:
        return f"❌ {err}"
    try:
        result = send_to_server(content_type, data)
        url = result.get("url", "")
        item_id = result.get("id", "")
        server = os.getenv("SERVER_URL", "http://localhost:4000")
        full_url = f"{server.rstrip('/')}{url}" if url else ""
        return f"✅ Đã tạo thành công!\n\nID: {item_id}\nURL: {full_url}"
    except Exception as e:
        return f"❌ Lỗi khi gửi: {e}"

# ── UI ─────────────────────────────────────────────────────────────────────────

def build_ui():
    blocks_kwargs = {"title": "ContestHub AI Import"}
    if not launch_supports_theme():
        blocks_kwargs["theme"] = APP_THEME

    with gr.Blocks(**blocks_kwargs) as demo:
        gr.Markdown("# ContestHub AI Import Tool")
        gr.Markdown(f"`{backend_label()}`")

        with gr.Row():
            status_box = gr.Textbox(label="Trạng thái AI provider", interactive=False, scale=4)
            check_btn = gr.Button("Kiểm tra kết nối", scale=1)
        check_btn.click(check_status, outputs=status_box)

        gr.Markdown("---")

        content_type = gr.Dropdown(
            choices=CONTENT_TYPES,
            value="contest",
            label="Loại nội dung",
        )

        with gr.Tabs():
            # Tab 1: Text input
            with gr.Tab("📝 Từ văn bản"):
                text_input = gr.Textbox(
                    label="Dán nội dung vào đây (thông báo, mô tả cuộc thi...)",
                    lines=10,
                    placeholder="Dán nội dung cuộc thi / học bổng vào đây... Nếu dán một URL, tool sẽ tự chuyển sang trích xuất từ URL.",
                )
                extract_text_btn = gr.Button("Trích xuất", variant="primary")

            # Tab 2: URL
            with gr.Tab("🌐 Từ URL"):
                gr.Markdown("> Tool sẽ tự đọc metadata/JSON-LD, link liên quan, ảnh lazy/background/`og:image`/`twitter:image`, rồi chọn ảnh phù hợp cho `image`, `thumbnail` hoặc `coverImage` theo loại nội dung.")
                url_input = gr.Textbox(
                    label="URL trang web",
                    placeholder="https://example.com/contest",
                )
                extract_url_btn = gr.Button("Trích xuất từ URL", variant="primary")

            # Tab 3: Image
            with gr.Tab("🖼️ Từ hình ảnh"):
                if not has_vision_model():
                    gr.Markdown("> ⚠️ **Chưa có vision model.** Tab ảnh cần model hỗ trợ vision (ví dụ `qwen2.5vl:7b`). Thêm `OLLAMA_VISION_MODEL=qwen2.5vl:7b` vào `.env` sau khi chạy `ollama pull qwen2.5vl:7b`.")
                image_input = gr.Image(label="Tải lên ảnh (poster, screenshot...)", type="filepath")
                extra_text = gr.Textbox(
                    label="Thông tin bổ sung (tùy chọn)",
                    placeholder="Thêm context nếu cần...",
                    lines=2,
                )
                extract_img_btn = gr.Button("Trích xuất từ ảnh", variant="primary")

        gr.Markdown("---")
        gr.Markdown("### Kết quả trích xuất")

        status_msg = gr.Textbox(label="Trạng thái", interactive=False)
        json_output = gr.Code(
            label="Dữ liệu JSON (có thể chỉnh sửa trực tiếp)",
            language="json",
            lines=25,
            interactive=True,
        )

        gr.Markdown("### Chỉnh sửa bằng AI")
        with gr.Row():
            edit_prompt = gr.Textbox(
                label="Yêu cầu chỉnh sửa",
                placeholder='Ví dụ: "Đổi deadline thành 2026-06-30", "Thêm tag Hackathon", "Dịch description sang tiếng Anh"',
                scale=4,
            )
            refine_btn = gr.Button("Chỉnh sửa", scale=1)

        gr.Markdown("---")
        gr.Markdown("### Gửi lên ContestHub")
        with gr.Row():
            send_btn = gr.Button("✅ Approve & Send", variant="primary", scale=2)
            send_result = gr.Textbox(label="Kết quả", interactive=False, scale=3)

        # Wire up events
        extract_text_btn.click(
            do_extract_text,
            inputs=[content_type, text_input],
            outputs=[json_output, status_msg],
        )
        extract_url_btn.click(
            do_extract_url,
            inputs=[content_type, url_input],
            outputs=[json_output, status_msg],
        )
        extract_img_btn.click(
            do_extract_image,
            inputs=[content_type, image_input, extra_text],
            outputs=[json_output, status_msg],
        )
        refine_btn.click(
            do_refine,
            inputs=[json_output, edit_prompt],
            outputs=[json_output, status_msg],
        )
        send_btn.click(
            do_send,
            inputs=[content_type, json_output],
            outputs=[send_result],
        )

        # Auto-check on load
        demo.load(check_status, outputs=status_box)

    return demo


if __name__ == "__main__":
    ui = build_ui()
    launch_kwargs = {
        "server_name": "127.0.0.1",
        "server_port": 7860,
        "share": False,
        "inbrowser": True,
    }
    if launch_supports_theme():
        launch_kwargs["theme"] = APP_THEME
    ui.launch(**launch_kwargs)
