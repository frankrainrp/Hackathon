"""System-generated export headings only; school names and source text stay intact."""
_EXPORT = {
    "en": {
        "school": "School", "materials": "Course materials", "module": "Module",
        "source": "Source", "sourcePath": "Original location", "open": "Open material",
        "downloadPending": "Download pending or failed. See sync warnings.",
        "assignments": "Assignment submission status", "due": "Due", "unpublished": "Not published",
        "states": {"missing": "Not submitted", "submitted": "Submitted", "unknown": "Unverified"},
    },
    "zh": {
        "school": "学校", "materials": "课程资料", "module": "课程",
        "source": "来源", "sourcePath": "原目录", "open": "打开课件",
        "downloadPending": "下载状态：待下载或下载失败，见同步警告。",
        "assignments": "作业提交状态", "due": "截止", "unpublished": "未公布",
        "states": {"missing": "未提交", "submitted": "已提交", "unknown": "待核实"},
    },
}


def export_copy(language="en"):
    return _EXPORT["zh" if language == "zh" else "en"]
