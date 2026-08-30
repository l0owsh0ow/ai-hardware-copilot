"""API 数据结构（Pydantic v2）。字段定义与《开发交接说明》4.2 一致。"""

from typing import Optional

from pydantic import BaseModel, Field


class StructuredParams(BaseModel):
    """需求解析结果。"""

    application: str = ""
    power_supply: str = ""
    power_consumption: str = ""
    communication: list[str] = Field(default_factory=list)
    interface: list[str] = Field(default_factory=list)
    voltage: str = ""
    budget: str = ""
    duration: str = ""
    extra_notes: str = ""


class Component(BaseModel):
    """元器件推荐结果（列表项）。"""

    id: str
    part_number: str
    category: str
    subcategory: str = ""
    manufacturer: str = ""
    key_params: dict = Field(default_factory=dict)
    price_cny: float = 0.0
    price_unit: str = "个"
    stock_status: str = ""
    datasheet_url: str = ""
    recommend_reason: str = ""
    match_score: float = 0.0


class ComponentDetail(Component):
    """元器件详情（在 Component 基础上补充完整字段）。"""

    description: str = ""
    package: str = ""
    supplier: str = ""
    supplier_url: str = ""
    tags: list[str] = Field(default_factory=list)
    typical_applications: list[str] = Field(default_factory=list)
    difficulty_level: str = ""
    notes: str = ""


class SelectedComponent(BaseModel):
    """用户选入 BOM 的元器件。"""

    part_number: str
    quantity: int = Field(default=1, ge=1)


class BOMItem(BaseModel):
    part_number: str
    description: str = ""
    quantity: int = 1
    unit_price: float = 0.0
    subtotal: float = 0.0
    supplier: str = ""
    supplier_url: str = ""
    category: str = ""


class BOMTable(BaseModel):
    id: str = ""
    project_name: str = ""
    created_at: str = ""
    items: list[BOMItem] = Field(default_factory=list)
    total_cost: float = 0.0


# ---------- 请求 / 响应 ----------


class ParseRequest(BaseModel):
    text: str = Field(..., min_length=1)


class ParseResponse(BaseModel):
    params: StructuredParams


class RecommendRequest(BaseModel):
    params: StructuredParams


class RecommendResponse(BaseModel):
    recommendations: list[Component]


class BomGenerateRequest(BaseModel):
    selections: list[SelectedComponent]
    project_name: str = "未命名项目"


class BomGenerateResponse(BaseModel):
    bom: BOMTable


class ComponentDetailResponse(BaseModel):
    component: ComponentDetail


class ComponentSearchResponse(BaseModel):
    results: list[Component]


# ---------- 历史记录 ----------


class HistoryCreateRequest(BaseModel):
    title: str = ""
    query_text: str = ""
    params: StructuredParams
    recommendations: list[Component] = Field(default_factory=list)


class HistoryCreateResponse(BaseModel):
    id: str


class HistoryListItem(BaseModel):
    id: str
    title: str
    query_text: str
    created_at: str
    count: int


class HistoryListResponse(BaseModel):
    items: list[HistoryListItem]


class HistoryDetailResponse(BaseModel):
    id: str
    title: str
    query_text: str
    created_at: str
    params: StructuredParams
    recommendations: list[Component]


# ---------- LLM 设置 ----------


class LLMSettingsResponse(BaseModel):
    provider: str = "mock"
    model: str = ""
    base_url: str = ""
    api_key_set: bool = False


class LLMSettingsUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None


class LLMTestResponse(BaseModel):
    ok: bool
    latency_ms: int = 0
    model: str = ""
    error: str = ""
