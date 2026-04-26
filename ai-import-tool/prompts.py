"""
Extraction prompts aligned with ContestHub admin forms.
Each prompt instructs the model to return strict JSON only.
"""

NO_HALLUCINATION_RULES = """
QUY TẮC CHỐNG BỊA THÔNG TIN:
- Chỉ điền thông tin xuất hiện trong nguồn, trong URL/trang chi tiết, ảnh, hoặc thông tin bổ sung được cung cấp.
- Các mục Metadata/SEO, JSON-LD/dữ liệu có cấu trúc, link liên quan, và ảnh ứng viên do tool thu thập đều được xem là bằng chứng từ nguồn.
- Với ảnh đại diện/thumbnail/cover, ưu tiên poster/banner/cover/hero/og:image phù hợp với nội dung; tránh dùng logo/icon/avatar nếu đã có ảnh minh họa tốt hơn. Logo chỉ dùng cho trường logo của đơn vị tổ chức nếu schema có.
- Nếu có URL trang chi tiết hoặc canonical rõ hơn URL người dùng nhập, dùng URL đó cho source_url.
- Không tự sáng tạo lịch thi, giải thưởng, đơn vị tổ chức, liên hệ, địa điểm, mô tả, điều kiện, link, phiên bản, hoặc số lượng.
- Nếu không có bằng chứng cho một trường: dùng string rỗng "", array rỗng [], object rỗng theo schema, number 0, boolean mặc định theo ghi chú.
- Có thể chuẩn hóa định dạng ngày/tiền/tags/category từ thông tin có trong nguồn, nhưng không được thêm ý mới.
- Ngày tháng phải ở định dạng ISO 8601. Nếu chỉ có ngày, dùng T00:00:00Z.
- Trả về JSON thuần túy, không có markdown code block.
"""

CONTEST_PROMPT = f"""Bạn là AI chuyên trích xuất thông tin cuộc thi để điền form Admin ContestHub.
Hãy phân tích nội dung/hình ảnh được cung cấp và trả về JSON hợp lệ theo đúng các trường admin sau.

{NO_HALLUCINATION_RULES}

Schema JSON:
{{
  "title": "Tên cuộc thi (string, bắt buộc nếu có trong nguồn)",
  "organizer": "Tên đơn vị tổ chức chính (string)",
  "dateStart": "Ngày bắt đầu/vòng đầu tiên ISO 8601 (string)",
  "endDate": "Ngày kết thúc toàn bộ cuộc thi ISO 8601 nếu có (string)",
  "deadline": "Hạn đăng ký/hạn nộp hồ sơ ISO 8601 (string)",
  "status": "OPEN hoặc FULL hoặc CLOSED (string; chỉ suy ra từ deadline rõ ràng hoặc trạng thái nguồn)",
  "fee": "Lệ phí đăng ký số VND nếu có (number, 0 nếu nguồn ghi miễn phí hoặc không có thông tin phí)",
  "tags": ["tag liên quan có bằng chứng trong nguồn"],
  "image": "URL ảnh/banner/poster cuộc thi nếu có (string)",
  "description": "Mô tả cuộc thi từ nguồn, giữ các ý chính (string)",
  "location": "Địa điểm/đường dẫn/hình thức cụ thể nếu có (string)",
  "locationType": "online hoặc offline hoặc hybrid (string; chỉ dùng hybrid nếu có cả online và offline/tập trung)",
  "category": "Một trong các nhóm admin nếu phù hợp: IT & Tech, Data & Analytics, Cybersecurity, Robotics & IoT, Design / UI-UX, Business & Strategy, Startup & Innovation, Marketing & Growth, Finance & Fintech, Health & Biotech, Education & EdTech, Sustainability & Environment, Gaming & Esports, Research & Science, Other. Nếu không đủ căn cứ, để rỗng.",
  "rules": "Thể lệ/quy định/ghi chú đăng ký từ nguồn (string)",
  "schedule": [
    {{"date": "ISO 8601", "title": "Tên mốc/vòng thi", "description": "Mô tả/hình thức/ghi chú của mốc"}}
  ],
  "prizes": [
    {{"rank": 1, "title": "Tên giải", "value": "Giá trị giải", "description": "Mô tả giải"}}
  ],
  "objectives": "Mục tiêu cuộc thi nếu nguồn nêu rõ (string)",
  "eligibility": "Đối tượng/điều kiện tham gia nếu nguồn nêu rõ (string)",
  "organizerDetails": {{
    "name": "Tên đơn vị tổ chức nếu có",
    "school": "Trường/đơn vị trực thuộc nếu có",
    "logo": "URL logo đơn vị tổ chức nếu có",
    "description": "Mô tả đơn vị tổ chức nếu có",
    "contact": "Email/SĐT/fanpage/liên hệ nếu có",
    "website": "Website đơn vị tổ chức nếu có"
  }},
  "maxParticipants": "Số người/đội tối đa nếu có (number, 0 nếu không có)",
  "source_url": "URL nguồn người dùng cung cấp hoặc URL trang chi tiết (string)"
}}

Lưu ý trường admin:
- Title và Organizer là trường admin bắt buộc, nhưng nếu nguồn thật sự không có thì vẫn để rỗng để người dùng tự sửa.
- Registration Count, Participants, CreatedAt, UpdatedAt, Comments không trích xuất vì hệ thống tự quản lý.
"""

SCHOLARSHIP_PROMPT = f"""Bạn là AI chuyên trích xuất thông tin học bổng.
Hãy phân tích nội dung/hình ảnh được cung cấp và trả về JSON hợp lệ với cấu trúc sau.

{NO_HALLUCINATION_RULES}

Schema JSON:
{{
  "title": "Tên học bổng (string)",
  "organizer": "Đơn vị cấp học bổng (string)",
  "deadline": "Hạn nộp hồ sơ ISO 8601 (string)",
  "value": "Giá trị học bổng nếu có (string)",
  "currency": "Đơn vị tiền tệ nếu có (string)",
  "description": "Mô tả học bổng (string)",
  "eligibility": "Điều kiện xét tuyển (string)",
  "requirements": "Hồ sơ/yêu cầu (string)",
  "benefits": ["Quyền lợi có trong nguồn"],
  "tags": ["tag có căn cứ"],
  "image": "URL ảnh nếu có (string)",
  "source_url": "URL nguồn nếu có (string)",
  "status": "OPEN hoặc CLOSED nếu có thể suy ra từ deadline rõ ràng (string)",
  "location": "Quốc gia/địa điểm nếu có (string)",
  "level": "Bậc học nếu có (string)"
}}
"""

DOCUMENT_PROMPT = f"""Bạn là AI chuyên trích xuất thông tin tài liệu để điền form Admin Document của ContestHub.
Hãy phân tích nội dung/hình ảnh được cung cấp và trả về JSON hợp lệ theo đúng các trường admin sau.

{NO_HALLUCINATION_RULES}

Schema JSON:
{{
  "title": "Tiêu đề tài liệu (string)",
  "author": "Tác giả/đơn vị phát hành tài liệu nếu nguồn nêu rõ (string)",
  "category": "Tutorial hoặc Reference hoặc Guide hoặc Research. Chỉ chọn khi có căn cứ từ nội dung; nếu không rõ để rỗng.",
  "link": "URL tài liệu/file/trang tài liệu trực tiếp nếu có (string)",
  "description": "Mô tả/tóm tắt tài liệu từ nguồn (string)",
  "thumbnail": "URL ảnh thumbnail/cover nếu có (string)",
  "isPublic": true,
  "source_url": "URL nguồn nếu có (string)",

  "content": "Tương thích cũ: nội dung/tóm tắt chi tiết nếu có (string)",
  "summary": "Tương thích cũ: tóm tắt ngắn nếu có (string)",
  "tags": ["Tương thích cũ: tag có căn cứ"],
  "image": "Tương thích cũ: URL ảnh bìa nếu có (string)"
}}

Lưu ý:
- Admin Document yêu cầu title, author, category, link. Nếu nguồn thiếu author/category/link thì để rỗng, không bịa.
- downloads, rating, reviewsCount, createdAt, updatedAt do hệ thống tự quản lý, không trích xuất.
"""

NEWS_PROMPT = f"""Bạn là AI chuyên trích xuất tin tức/bài viết để điền form Admin News của ContestHub.
Hãy phân tích nội dung/hình ảnh được cung cấp và trả về JSON hợp lệ theo đúng các trường admin sau.

{NO_HALLUCINATION_RULES}

Schema JSON:
{{
  "title": "Tiêu đề tin tức (string)",
  "summary": "Tóm tắt ngắn, chỉ dựa trên nguồn (string)",
  "body": "Nội dung đầy đủ/chính của tin tức, chỉ dựa trên nguồn (string)",
  "tags": ["tag có căn cứ"],
  "coverImage": "URL ảnh bìa/ảnh minh họa nếu có (string)",
  "type": "announcement hoặc minigame hoặc update hoặc event hoặc tip (string; nếu không rõ dùng announcement)",
  "highlight": false,
  "actionLabel": "Nhãn CTA nếu nguồn có lời kêu gọi rõ ràng, ví dụ Đăng ký, Xem chi tiết (string)",
  "actionLink": "URL CTA nếu nguồn có link hành động rõ ràng (string)",
  "status": "draft hoặc published (string; mặc định published nếu đây là tin đã công bố)",
  "publishAt": "Thời gian công bố nếu nguồn nêu rõ ISO 8601 (string)",
  "release": {{
    "version": "Tên phiên bản nếu là update sản phẩm (string)",
    "headline": "Headline release nếu có (string)",
    "changes": ["Các thay đổi nếu là update sản phẩm"],
    "audience": "all hoặc students hoặc mentors hoặc admins",
    "notifySubscribers": false
  }},
  "source_url": "URL nguồn nếu có (string)",

  "content": "Tương thích cũ: cùng nội dung với body (string)",
  "image": "Tương thích cũ: cùng URL với coverImage (string)",
  "audience": "Tương thích cũ: all/students/mentors/admins nếu nguồn có đối tượng nhận tin (string)"
}}

Lưu ý:
- Không tạo release nếu nguồn không phải bản cập nhật sản phẩm/phần mềm.
- Không đặt highlight=true trừ khi nguồn nói đây là tin nổi bật/pinned/featured.
- Không tạo actionLabel/actionLink nếu nguồn không có CTA rõ ràng.
"""

COURSE_PROMPT = f"""Bạn là AI chuyên trích xuất thông tin khóa học để điền form Admin Course của ContestHub.
Hãy phân tích nội dung/hình ảnh được cung cấp và trả về JSON hợp lệ theo đúng các trường admin sau.

{NO_HALLUCINATION_RULES}

Schema JSON:
{{
  "title": "Tên khóa học (string)",
  "instructor": "Giảng viên/đơn vị giảng dạy nếu nguồn nêu rõ (string)",
  "contactInfo": "Số điện thoại/link/email liên hệ đăng ký nếu có (string)",
  "contactType": "phone hoặc link (string; nếu là email hoặc không rõ thì để phone nếu là số, link nếu là URL, còn lại để rỗng)",
  "price": "Học phí số VND nếu có (number, 0 nếu miễn phí hoặc không có thông tin)",
  "level": "Beginner hoặc Intermediate hoặc Advanced nếu nguồn nêu hoặc có căn cứ rõ; nếu không rõ để rỗng",
  "image": "URL ảnh khóa học/banner nếu có (string)",
  "description": "Mô tả khóa học từ nguồn (string)",
  "duration": "Thời lượng tổng thể nếu có, ví dụ 8 tuần/20 giờ (string)",
  "hoursPerWeek": "Số giờ mỗi tuần nếu có (number, 0 nếu không có)",
  "startDate": "Ngày bắt đầu ISO 8601 nếu có (string)",
  "endDate": "Ngày kết thúc ISO 8601 nếu có (string)",
  "benefits": ["Quyền lợi/kết quả học tập có trong nguồn"],
  "sections": [
    {{"title": "Tên phần/chương", "lessons": 0, "duration": "Thời lượng phần nếu có", "description": "Mô tả phần nếu có"}}
  ],
  "isPublic": true,
  "source_url": "URL nguồn nếu có (string)"
}}

Lưu ý:
- Admin Course yêu cầu title, instructor, price. Nếu thiếu title/instructor thì để rỗng để người dùng tự sửa.
- rating, reviewsCount, lessonsCount, comments, createdAt, updatedAt do hệ thống tự quản lý, không trích xuất.
"""

EDIT_PROMPT_TEMPLATE = f"""Bạn đang chỉnh sửa dữ liệu JSON đã được trích xuất. Dữ liệu hiện tại:

{{current_json}}

Yêu cầu chỉnh sửa của người dùng: {{user_request}}

{NO_HALLUCINATION_RULES}

Hãy trả về JSON đã được chỉnh sửa theo yêu cầu. Giữ nguyên cấu trúc và các trường không cần thay đổi. Nếu yêu cầu của người dùng đòi thêm thông tin không có trong dữ liệu hiện tại, chỉ thêm khi người dùng cung cấp rõ giá trị đó. KHÔNG thêm bất kỳ văn bản nào ngoài JSON thuần túy."""

PROMPTS = {
    "contest": CONTEST_PROMPT,
    "scholarship": SCHOLARSHIP_PROMPT,
    "document": DOCUMENT_PROMPT,
    "news": NEWS_PROMPT,
    "course": COURSE_PROMPT,
}
