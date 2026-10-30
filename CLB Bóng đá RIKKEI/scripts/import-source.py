#!/usr/bin/env python3
"""Normalize the Rikkei Google Sheets XLSX export using only Python's standard library.

Usage: python3 scripts/import-source.py /path/to/source.xlsx --snapshot-date 2026-10-09
Source cells/formulas are retained in data/source-snapshot.json. No network calls or
Google Sheets writes are made. Receipt anchors never establish payment amounts.
"""

import argparse
from collections import Counter
from datetime import date, timedelta
from decimal import Decimal
import hashlib
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile


NS = {
    "s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
SPREADSHEET_ID = "1kX0Buru0yjKmbEliCNz0RT0k3wWAjHJVkZEgqEw1fUs"
SOURCE_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit?gid=0#gid=0"


def number(value):
    if value is None or value == "":
        return None
    parsed = Decimal(str(value))
    return int(parsed) if parsed == parsed.to_integral_value() else float(parsed)


def column_name(index):
    result = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        result = chr(65 + remainder) + result
    return result


def rels(zipfile, owner):
    owner_path = PurePosixPath(owner)
    relfile = str(owner_path.parent / "_rels" / (owner_path.name + ".rels"))
    if relfile not in zipfile.namelist():
        return {}
    return {
        item.attrib["Id"]: {
            **item.attrib,
            "path": posixpath.normpath(str(owner_path.parent / item.attrib["Target"])),
        }
        for item in ET.fromstring(zipfile.read(relfile))
    }


def read_workbook(zipfile):
    strings = [
        "".join(node.itertext())
        for node in ET.fromstring(zipfile.read("xl/sharedStrings.xml"))
    ]
    styles = ET.fromstring(zipfile.read("xl/styles.xml"))
    formats = {item.attrib["numFmtId"]: item.attrib["formatCode"]
               for item in styles.findall("s:numFmts/s:numFmt", NS)}
    xfs = styles.findall("s:cellXfs/s:xf", NS)
    workbook = ET.fromstring(zipfile.read("xl/workbook.xml"))
    workbook_rels = rels(zipfile, "xl/workbook.xml")
    workbook_properties = workbook.find("s:workbookPr", NS)
    date1904 = workbook_properties is not None and workbook_properties.get("date1904") in ("1", "true")
    sheets = []
    for index, node in enumerate(workbook.findall("s:sheets/s:sheet", NS), 1):
        path = workbook_rels[node.attrib[f"{{{NS['r']}}}id"]]["path"]
        xml = ET.fromstring(zipfile.read(path))
        rows = []
        for row in xml.findall("s:sheetData/s:row", NS):
            cells = {}
            for cell in row.findall("s:c", NS):
                value = cell.find("s:v", NS)
                raw_value = value.text if value is not None else ""
                cell_type = cell.attrib.get("t", "n")
                if cell_type == "s":
                    text = strings[int(raw_value)]
                elif cell_type == "inlineStr":
                    text = "".join(cell.find("s:is", NS).itertext())
                else:
                    text = raw_value or ""
                formula = cell.find("s:f", NS)
                if text == "" and formula is None:
                    continue
                style = xfs[int(cell.attrib.get("s", "0"))]
                format_id = style.attrib.get("numFmtId", "0")
                cells[cell.attrib["r"]] = {
                    "text": text,
                    "type": cell_type,
                    "rawValue": raw_value,
                    "numberFormat": formats.get(format_id, format_id),
                    "formula": formula.text if formula is not None else None,
                }
            if cells:
                rows.append({"row": int(row.attrib["r"]), "cells": cells})
        sheets.append({"index": index, "name": node.attrib["name"], "path": path, "rows": rows})
    return sheets, date1904


def value(row, col):
    return row["cells"].get(f"{col}{row['row']}", {}).get("text", "")


def provenance(sheet, row):
    return {
        "sheet": sheet["name"], "sheetIndex": sheet["index"], "row": row["row"],
        "raw": {ref: cell["text"] for ref, cell in row["cells"].items()},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--snapshot-date", required=True, help="Date the source was retrieved, YYYY-MM-DD")
    parser.add_argument("--output-root", type=Path, default=Path(__file__).resolve().parent.parent)
    args = parser.parse_args()
    date.fromisoformat(args.snapshot_date)
    root = args.output_root
    (root / "dist/assets/receipts").mkdir(parents=True, exist_ok=True)
    (root / "data").mkdir(parents=True, exist_ok=True)
    source_hash = hashlib.sha256(args.xlsx.read_bytes()).hexdigest()
    with ZipFile(args.xlsx) as zipfile:
        sheets, date1904 = read_workbook(zipfile)
        by_name = {sheet["name"].strip(): sheet for sheet in sheets}
        member_sheet = by_name["Danh sách thành viên CLB Bóng đ"]
        members, dues = [], []
        for row in member_sheet["rows"]:
            if row["row"] < 4 or not value(row, "B").strip():
                continue
            ordinal = number(value(row, "A"))
            source_position = value(row, "D")
            fields = [field.strip() for field in source_position.split(",") if field.strip()]
            management = any(field.casefold() == "quản lý đội" for field in fields)
            department = "Quản Lý Đội" if management else next(
                (field for field in fields if field.casefold() in ("hậu cần", "truyền thông")), "")
            member_id = f"gs-member-{ordinal:03d}"
            member = {
                "id": member_id, "sourceIndex": ordinal,
                "name": value(row, "B").strip(),
                "unit": value(row, "C").strip(), "className": value(row, "C").strip(),
                "positions": [field for field in fields if field.casefold() not in ("quản lý đội", "hậu cần", "truyền thông")],
                "sourcePosition": source_position, "managementRole": "Quản Lý Đội" if management else "",
                "role": "Quản lý đội" if management else "Thành viên", "department": department,
                "status": value(row, "E").strip(), "participationStatus": value(row, "E").strip(),
                "duesStatus": value(row, "G").strip(), "email": "", "phone": "", "joined": "",
                "note": value(row, "F"), "note2": value(row, "H"), "locked": False,
                "receipts": [], "source": provenance(member_sheet, row),
            }
            members.append(member)
            dues.append({
                "id": f"gs-due-{ordinal:03d}", "member": member_id,
                "status": member["duesStatus"], "periodLabel": "Tháng đầu",
                "expectedAmount": None, "paidAmount": None, "paidDate": None,
                "receipts": [], "source": provenance(member_sheet, row),
            })

        receipts = []
        row_members = {member["source"]["row"]: member for member in members}
        for relation in rels(zipfile, member_sheet["path"]).values():
            if not relation["Type"].endswith("/drawing"):
                continue
            drawing_path = relation["path"]
            drawing_rels = rels(zipfile, drawing_path)
            for anchor in ET.fromstring(zipfile.read(drawing_path)):
                picture = anchor.find("xdr:pic", NS)
                origin = anchor.find("xdr:from", NS)
                if picture is None or origin is None:
                    continue
                image = picture.find("xdr:blipFill/a:blip", NS)
                image_path = drawing_rels[image.attrib[f"{{{NS['r']}}}embed"]]["path"]
                row = int(origin.find("xdr:row", NS).text) + 1
                column = int(origin.find("xdr:col", NS).text) + 1
                offset_x = int(origin.find("xdr:colOff", NS).text)
                offset_y = int(origin.find("xdr:rowOff", NS).text)
                member = row_members.get(row)
                # Exact I-column cell origin + paid flag is reliable structural attribution.
                # Floating/offset drawings near other rows remain explicitly unassigned.
                exact_anchor = column == 9 and offset_x == 0 and offset_y == 0
                assigned = member if exact_anchor and member["duesStatus"] == "Đã đóng" else None
                filename = f"source-{PurePosixPath(image_path).name}"
                relative = f"assets/receipts/{filename}"
                (root / "dist" / relative).write_bytes(zipfile.read(image_path))
                receipt = {
                    "id": f"gs-receipt-{len(receipts) + 1:02d}", "path": relative,
                    "member": assigned["id"] if assigned else None,
                    "assignment": "exact-cell-anchor" if assigned else "needs-verification",
                    "source": {"sheet": member_sheet["name"], "sheetIndex": member_sheet["index"],
                               "row": row, "cell": f"{column_name(column)}{row}",
                               "originalImage": image_path, "offsetX": offset_x, "offsetY": offset_y},
                }
                receipts.append(receipt)
                if assigned:
                    assigned["receipts"].append(receipt)
                    next(due for due in dues if due["member"] == assigned["id"])["receipts"].append(receipt)

        task_sheet = by_name["ĐẦU VIỆC"]
        tasks, current_department, current_note = [], "", ""
        status_map = {"Đã xong": "Hoàn thành", "Đang triển khai": "Đang làm", "Chưa triển khai": "Chưa làm"}
        for row in task_sheet["rows"]:
            if row["row"] == 1 or not value(row, "B").strip():
                continue
            if value(row, "A").strip():
                current_department, current_note = value(row, "A").strip(), value(row, "F").strip()
            deadline_raw = value(row, "D")
            deadline_cell = row["cells"].get(f"D{row['row']}", {})
            deadline = ""
            if deadline_raw and deadline_cell.get("type") == "n":
                origin = date(1904, 1, 1) if date1904 else date(1899, 12, 30)
                deadline = (origin + timedelta(days=float(deadline_raw))).isoformat()
            tasks.append({
                "id": f"gs-task-{row['row']:03d}", "title": value(row, "B").strip(),
                "department": current_department, "owner": value(row, "C").strip(),
                "deadline": deadline, "deadlineText": "" if deadline else deadline_raw,
                "deadlineDisplayFormat": deadline_cell.get("numberFormat", ""),
                "status": status_map.get(value(row, "E").strip(), value(row, "E").strip()),
                "sourceStatus": value(row, "E"), "note": value(row, "F").strip() or current_note,
                "event": "", "source": provenance(task_sheet, row),
            })

        venue_sheet = by_name["Ban chuyên môn"]
        venues = [{
            "id": f"gs-venue-{row['row']:03d}", "name": value(row, "A").strip(),
            "weekday": value(row, "B").strip(), "time": value(row, "C").strip(),
            "place": value(row, "D").strip(), "price": number(value(row, "E")),
            "survey": value(row, "F").strip(), "confirmed": value(row, "G") == "1",
            "source": provenance(venue_sheet, row),
        } for row in venue_sheet["rows"] if row["row"] > 1 and value(row, "A").strip()]

        budget_sheet = by_name["Dự trù chi phí"]
        budget = [{
            "id": f"gs-budget-{row['row']:03d}", "title": value(row, "A").strip(),
            "quantity": number(value(row, "B")), "unit": value(row, "C").strip(),
            "unitPrice": number(value(row, "D")), "amount": number(value(row, "E")),
            "frequency": value(row, "F").strip(), "owner": value(row, "G").strip(),
            "note": value(row, "H"), "source": provenance(budget_sheet, row),
        } for row in budget_sheet["rows"] if 4 <= row["row"] <= 7]

        finance_sheet = by_name["Tổng hợp quỹ Hà Nội"]
        finance_rows = {row["row"]: row for row in finance_sheet["rows"]}
        finance = {
            "basisMembers": number(value(finance_rows[4], "C")),
            "monthlyFee": number(value(finance_rows[5], "C")),
            "feePeriodLabel": value(finance_rows[5], "B").strip(),
            "expected": number(value(finance_rows[6], "C")),
            "plannedExpenses": number(value(finance_rows[7], "C")),
            "projectedBalance": number(value(finance_rows[8], "C")),
            "received": number(value(finance_rows[9], "C")),
            "paidMembers": int(re.match(r"(\d+)/", value(finance_rows[9], "E")).group(1)),
            "paidMembersNote": value(finance_rows[9], "E"),
            "actualExpenses": None, "openingBalance": None,
            "source": {"sheet": finance_sheet["name"], "sheetIndex": finance_sheet["index"],
                       "rows": [provenance(finance_sheet, row) for row in finance_sheet["rows"] if row["row"] >= 4]},
        }
        for due in dues:
            due["expectedAmount"] = finance["monthlyFee"]
            due["amountBasis"] = {"sheet": finance_sheet["name"], "cell": "C5"}

        rule_sheet = by_name["NỘI QUY CLB"]
        rules = {"title": value(rule_sheet["rows"][0], "A"),
                 "text": value(rule_sheet["rows"][1], "A"),
                 "source": {"sheet": rule_sheet["name"], "sheetIndex": rule_sheet["index"], "cells": ["A1", "A2"]}}
        summary = {
            "memberCount": len(members), "paidCount": sum(m["duesStatus"] == "Đã đóng" for m in members),
            "unpaidCount": sum(m["duesStatus"] == "Chưa đóng" for m in members),
            "readyCount": sum(m["status"] == "Sẵn sàng" for m in members),
            "pendingCount": sum(m["status"] == "Chờ xác nhận" for m in members),
            "managementCount": sum(bool(m["managementRole"]) for m in members),
            "taskCount": len(tasks), "venueCount": len(venues), "budgetCount": len(budget),
            "receiptCount": len(receipts), "assignedReceiptCount": sum(bool(r["member"]) for r in receipts),
            "taskStatusCounts": dict(Counter(task["status"] for task in tasks)),
        }
        warnings = [
            {"id": "roster-finance-count", "message": f"Danh sách có {len(members)} thành viên; bảng tổng hợp quỹ dùng cơ sở {finance['basisMembers']} thành viên. Giữ nguyên tổng dự kiến của bảng nguồn, chưa tự tính lại theo danh sách.", "source": {"sheets": [member_sheet["name"], finance_sheet["name"]]}},
            {"id": "ready-confirmed-count", "message": f"Danh sách ghi {summary['readyCount']} người ‘Sẵn sàng’ và {summary['pendingCount']} ‘Chờ xác nhận’; chỉ tiêu tài chính ghi {finance['basisMembers']} thành viên Hà Nội đã xác nhận. Hai cách ghi nhận cần được đối chiếu.", "source": {"sheets": [member_sheet["name"], finance_sheet["name"]]}},
            {"id": "no-actual-expenses", "message": "Nguồn ghi quỹ thực thu 2.300.000 ₫, chưa có số thực chi hoặc số dư đầu kỳ; chưa thể xác định số dư tiền thực tế.", "source": {"sheets": [finance_sheet["name"], "Ban tài chính "]}},
            {"id": "missing-dues-date", "message": "Trạng thái đóng quỹ không kèm ngày nộp, tháng áp dụng cụ thể hoặc số tiền của từng người trong ô dữ liệu. Không chuyển trạng thái thành giao dịch thu.", "source": {"sheet": member_sheet["name"]}},
            {"id": "unassigned-receipts", "message": "Có 2 ảnh bill nổi, lệch ô; giữ riêng để đối chiếu người nộp, chưa gán tự động cho thành viên.", "source": {"sheet": member_sheet["name"], "cells": ["H3", "I42"]}},
            {"id": "tentative-venues", "message": "6 sân đang ‘Chưa Khảo Sát’, chưa chốt deal. Thứ 5, 19h30–21h là lịch dự kiến, chưa tạo trận đấu đã xác nhận.", "source": {"sheet": venue_sheet["name"]}},
            {"id": "date-year", "message": "Hạn công việc hiển thị ngày/tháng trong Sheet; năm 2026 được đọc từ giá trị ngày Excel gốc. Giữ nguyên cả giá trị số và định dạng nguồn.", "source": {"sheet": task_sheet["name"]}},
        ]
        source = {
            "spreadsheetId": SPREADSHEET_ID, "url": SOURCE_URL, "title": "CLB Bóng đá PTIT x Rikkei",
            "snapshotDate": args.snapshot_date, "importedAt": args.snapshot_date,
            "sha256": source_hash, "mode": "snapshot", "dateSystem": "1904" if date1904 else "1900",
            "sheets": [{"name": sheet["name"], "index": sheet["index"], "nonemptyRows": len(sheet["rows"])} for sheet in sheets],
            "warnings": warnings,
        }
        normalized = {
            "schemaVersion": 2, "source": source, "members": members, "dues": dues,
            "transactions": [], "events": [], "requests": [], "posts": [], "notifications": [],
            "tasks": tasks, "venues": venues, "budget": budget, "finance": finance,
            "rules": rules, "receipts": receipts, "summary": summary, "warnings": warnings,
        }
        assert len({m["id"] for m in members}) == len(members)
        assert sum(item["amount"] for item in budget) == finance["plannedExpenses"]
        assert finance["basisMembers"] * finance["monthlyFee"] == finance["expected"]
        assert finance["expected"] - finance["plannedExpenses"] == finance["projectedBalance"]
        assert finance["paidMembers"] == summary["paidCount"]
        serialized = json.dumps(normalized, ensure_ascii=False, indent=2)
        (root / "dist/club-data.js").write_text("// Generated by scripts/import-source.py. Edit the importer, not this snapshot.\nwindow.RIKKEI_SOURCE = " + serialized + ";\n", encoding="utf-8")
        (root / "data/source-snapshot.json").write_text(json.dumps({"source": source, "sheets": sheets, "receipts": receipts}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"summary": summary, "finance": {key: value for key, value in finance.items() if key != "source"}, "dateValues": sorted({task["deadline"] for task in tasks if task["deadline"]})}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
