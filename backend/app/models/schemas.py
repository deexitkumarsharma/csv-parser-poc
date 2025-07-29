from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.enums import ParseStatus, DataType, ValidationRuleType, ValidationSeverity, CleaningActionType


class ParseJobResponse(BaseModel):
    job_id: str
    status: ParseStatus
    message: str
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    progress: Optional[float] = Field(None, ge=0, le=100)
    errors: Optional[List[str]] = None


class ColumnMapping(BaseModel):
    source_column: str
    target_field: str
    confidence: float = Field(ge=0, le=1)
    reasoning: Optional[str] = None
    data_type: Optional[DataType] = None


class MappingSuggestionRequest(BaseModel):
    headers: List[str]
    sample_data: List[Dict[str, Any]]
    target_schema: Dict[str, str]
    business_context: str = "general"


class MappingSuggestionResponse(BaseModel):
    mappings: Dict[str, Dict[str, Any]]
    status: str


class ValidationRule(BaseModel):
    rule_type: ValidationRuleType
    field_name: str
    parameters: Dict[str, Any]
    error_message: str
    severity: ValidationSeverity = ValidationSeverity.ERROR


class ValidationError(BaseModel):
    row_index: int
    column: str
    value: Any
    rule: ValidationRule
    message: str


class ValidationRequest(BaseModel):
    job_id: str
    data: List[Dict[str, Any]]
    rules: Optional[List[ValidationRule]] = None


class ValidationResponse(BaseModel):
    job_id: str
    valid: bool
    errors: List[ValidationError]
    warnings: List[ValidationError]
    summary: Dict[str, int]


class CleaningRule(BaseModel):
    field_name: str
    action_type: CleaningActionType
    parameters: Optional[Dict[str, Any]] = None


class CleaningRequest(BaseModel):
    job_id: str
    data: List[Dict[str, Any]]
    cleaning_rules: Optional[List[CleaningRule]] = None


class CleaningResponse(BaseModel):
    job_id: str
    cleaned_data: List[Dict[str, Any]]
    changes_summary: Dict[str, Dict[str, int]]
    total_changes: int


class FilePreviewResponse(BaseModel):
    headers: List[str]
    data: List[Dict[str, Any]]
    total_rows: int
    file_type: str
    encoding: str


class ExportRequest(BaseModel):
    job_id: str
    format: str = Field("csv", pattern="^(csv|xlsx|json)$")
    include_original: bool = False
    include_changes: bool = True


class MetricsResponse(BaseModel):
    job_id: str
    processing_time_seconds: float
    llm_calls: int
    llm_tokens_used: int
    estimated_cost: float
    cache_hits: int
    cache_misses: int
    validation_errors: int
    data_changes: int
    accuracy_score: Optional[float] = None