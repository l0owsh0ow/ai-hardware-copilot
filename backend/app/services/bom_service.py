"""BOM 生成、持久化与导出。"""

import csv
import io
import uuid
from datetime import datetime

from openpyxl import Workbook

from ..db import db_session
from ..models.schemas import BOMItem, BOMTable, SelectedComponent


def generate_bom(selections: list[SelectedComponent], project_name: str) -> BOMTable:
    bom_id = uuid.uuid4().hex[:12]
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    items: list[BOMItem] = []

    with db_session() as conn:
        for sel in selections:
            row = conn.execute(
                "SELECT * FROM components WHERE part_number = ?", (sel.part_number,)
            ).fetchone()
            if row is None:
                continue  # 防幻觉：知识库外型号不入 BOM
            unit_price = row["price_cny"] or 0.0
            subtotal = round(unit_price * sel.quantity, 2)
            items.append(
                BOMItem(
                    part_number=row["part_number"],
                    description=row["description"] or "",
                    quantity=sel.quantity,
                    unit_price=unit_price,
                    subtotal=subtotal,
                    supplier=row["supplier"] or "",
                    supplier_url=row["supplier_url"] or "",
                    category=row["category"] or "",
                )
            )
        total = round(sum(i.subtotal for i in items), 2)

        conn.execute(
            "INSERT INTO bom_records (id, project_name, user_session, total_cost, created_at, status)"
            " VALUES (?, ?, ?, ?, ?, 'active')",
            (bom_id, project_name, "anonymous", total, now),
        )
        for it in items:
            conn.execute(
                "INSERT INTO bom_items (bom_id, component_id, part_number, quantity, unit_price, subtotal)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (bom_id, None, it.part_number, it.quantity, it.unit_price, it.subtotal),
            )

    return BOMTable(
        id=bom_id, project_name=project_name, created_at=now, items=items, total_cost=total
    )


def get_bom(bom_id: str) -> BOMTable | None:
    with db_session() as conn:
        record = conn.execute(
            "SELECT * FROM bom_records WHERE id = ? AND status = 'active'", (bom_id,)
        ).fetchone()
        if record is None:
            return None
        item_rows = conn.execute(
            """
            SELECT bi.*, c.description AS comp_description, c.supplier AS comp_supplier,
                   c.supplier_url AS comp_supplier_url, c.category AS comp_category
            FROM bom_items bi
            LEFT JOIN components c ON c.part_number = bi.part_number
            WHERE bi.bom_id = ? ORDER BY bi.id
            """,
            (bom_id,),
        ).fetchall()
    items = [
        BOMItem(
            part_number=r["part_number"],
            description=r["comp_description"] or "",
            quantity=r["quantity"],
            unit_price=r["unit_price"] or 0,
            subtotal=r["subtotal"] or 0,
            supplier=r["comp_supplier"] or "",
            supplier_url=r["comp_supplier_url"] or "",
            category=r["comp_category"] or "",
        )
        for r in item_rows
    ]
    return BOMTable(
        id=record["id"],
        project_name=record["project_name"],
        created_at=record["created_at"],
        items=items,
        total_cost=record["total_cost"] or 0,
    )


def apply_quantities(bom: BOMTable, quantities: dict[str, int]) -> BOMTable:
    """按 part_number 覆盖数量并重算小计/总价（用于导出时反映用户修改）。"""
    new_items = []
    for item in bom.items:
        qty = quantities.get(item.part_number, item.quantity)
        subtotal = round(item.unit_price * qty, 2)
        new_items.append(item.model_copy(update={"quantity": qty, "subtotal": subtotal}))
    total = round(sum(i.subtotal for i in new_items), 2)
    return bom.model_copy(update={"items": new_items, "total_cost": total})


def export_csv(bom: BOMTable) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["序号", "型号", "分类", "描述", "数量", "单价(元)", "小计(元)", "建议采购渠道", "采购链接"])
    for i, it in enumerate(bom.items, 1):
        writer.writerow(
            [
                i,
                it.part_number,
                it.category,
                it.description,
                it.quantity,
                it.unit_price,
                it.subtotal,
                it.supplier,
                it.supplier_url,
            ]
        )
    writer.writerow([])
    writer.writerow(["总计", "", "", "", "", "", bom.total_cost, "", ""])
    writer.writerow(["说明", "价格仅供参考，请以实际采购为准"])
    return buf.getvalue()


def export_excel(bom: BOMTable) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "BOM"
    ws.append(["AI硬件选型助手 - BOM 物料清单"])
    ws.append(["项目名称", bom.project_name, "生成时间", bom.created_at])
    ws.append([])
    ws.append(["序号", "型号", "分类", "描述", "数量", "单价(元)", "小计(元)", "建议采购渠道", "采购链接"])
    for i, it in enumerate(bom.items, 1):
        ws.append(
            [
                i,
                it.part_number,
                it.category,
                it.description,
                it.quantity,
                it.unit_price,
                it.subtotal,
                it.supplier,
                it.supplier_url,
            ]
        )
    ws.append([])
    ws.append(["总计", "", "", "", "", "", bom.total_cost])
    ws.append(["说明", "价格仅供参考，请以实际采购为准"])

    for col in ws.columns:
        width = max(len(str(cell.value)) if cell.value else 10 for cell in col) + 4
        ws.column_dimensions[col[0].column_letter].width = min(width, 60)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
