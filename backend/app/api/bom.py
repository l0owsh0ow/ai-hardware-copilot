"""BOM 生成与导出接口。"""

import urllib.parse

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from ..models.schemas import BomGenerateRequest, BomGenerateResponse
from ..services import bom_service

router = APIRouter()


@router.post("/api/v1/bom/generate", response_model=BomGenerateResponse)
async def generate_bom(req: BomGenerateRequest):
    bom = bom_service.generate_bom(req.selections, req.project_name)
    return BomGenerateResponse(bom=bom)


@router.get("/api/v1/bom/{bom_id}/export")
async def export_bom(
    bom_id: str,
    format: str = Query("excel", pattern="^(excel|csv)$"),
    quantities: str = Query("", description="数量覆盖，如 STM32L432KC:2,SHT30:3"),
):
    bom = bom_service.get_bom(bom_id)
    if bom is None:
        raise HTTPException(status_code=404, detail="BOM 不存在或已失效")

    if quantities:
        qty_map: dict[str, int] = {}
        for pair in quantities.split(","):
            if ":" not in pair:
                continue
            part, qty = pair.split(":", 1)
            try:
                qty_map[part.strip()] = max(1, int(qty))
            except ValueError:
                continue
        bom = bom_service.apply_quantities(bom, qty_map)

    safe_name = urllib.parse.quote(f"BOM_{bom_id}")
    if format == "csv":
        content = bom_service.export_csv(bom)
        return StreamingResponse(
            iter([content.encode("utf-8-sig")]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="bom_{bom_id}.csv"; filename*=UTF-8\'\'{safe_name}.csv'
            },
        )
    data = bom_service.export_excel(bom)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="bom_{bom_id}.xlsx"; filename*=UTF-8\'\'{safe_name}.xlsx'
        },
    )
