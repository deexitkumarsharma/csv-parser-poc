import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from fastapi.responses import JSONResponse
import structlog

from app.services.parser_service import ParserService
from app.models.schemas import (
    ParseJobResponse,
    MappingSuggestionRequest,
    MappingSuggestionResponse,
    ValidationRequest,
    ValidationResponse,
    CleaningRequest,
    CleaningResponse,
    ParseStatus
)
from app.core.config import settings

logger = structlog.get_logger()
router = APIRouter()

parser_service = ParserService()


@router.post("/upload", response_model=ParseJobResponse)
async def upload_file(
    file: UploadFile = File(...),
    business_context: str = Query("general", description="Business context for parsing")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
    
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB"
        )
    
    job_id = str(uuid.uuid4())
    file_path = settings.UPLOAD_DIR / f"{job_id}_{file.filename}"
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    try:
        result = await parser_service.start_parsing(
            job_id=job_id,
            file_path=str(file_path),
            business_context=business_context
        )
        
        return ParseJobResponse(
            job_id=job_id,
            status=ParseStatus.PROCESSING,
            message="File uploaded successfully. Processing started.",
            file_name=file.filename,
            file_size=file_size
        )
    except Exception as e:
        logger.error("Failed to start parsing", job_id=job_id, error=str(e))
        if file_path.exists():
            os.unlink(file_path)
        raise HTTPException(status_code=500, detail="Failed to start parsing")


@router.get("/{job_id}", response_model=ParseJobResponse)
async def get_job_status(job_id: str):
    status_data = await parser_service.get_job_status(job_id)
    
    if not status_data:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return ParseJobResponse(**status_data)


@router.post("/preview")
async def preview_file(
    file: UploadFile = File(...),
    rows: int = Query(10, description="Number of rows to preview"),
    sheet_name: Optional[str] = Query(None, description="Excel sheet name or index")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    contents = await file.read()
    
    try:
        # Check if it's an Excel file and user wants sheet info
        file_extension = file.filename.split(".")[-1].lower()
        if file_extension in ["xlsx", "xls"] and sheet_name is None:
            # Return sheet information for Excel files
            sheets_info = await parser_service.get_excel_sheets_info(contents, file.filename)
            if sheets_info:
                return JSONResponse(content={
                    "type": "excel_sheets",
                    "sheets": sheets_info,
                    "message": "Please select a sheet to preview"
                })
        
        preview_data = await parser_service.preview_file(contents, file.filename, rows, sheet_name)
        return JSONResponse(content=preview_data)
    except Exception as e:
        logger.error("Failed to preview file", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to preview file")


@router.post("/mappings/suggest", response_model=MappingSuggestionResponse)
async def suggest_mappings(request: MappingSuggestionRequest):
    try:
        suggestions = await parser_service.suggest_mappings(
            headers=request.headers,
            sample_data=request.sample_data,
            target_schema=request.target_schema,
            business_context=request.business_context
        )
        
        return MappingSuggestionResponse(
            mappings=suggestions,
            status="success"
        )
    except Exception as e:
        logger.error("Failed to generate mapping suggestions", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to generate suggestions")


@router.put("/mappings/save")
async def save_mappings(job_id: str, mappings: dict):
    success = await parser_service.save_mappings(job_id, mappings)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save mappings")
    
    return {"status": "success", "message": "Mappings saved successfully"}


@router.post("/validate", response_model=ValidationResponse)
async def validate_data(request: ValidationRequest):
    try:
        validation_results = await parser_service.validate_data(
            job_id=request.job_id,
            data=request.data,
            rules=request.rules
        )
        
        return ValidationResponse(
            job_id=request.job_id,
            valid=validation_results["valid"],
            errors=validation_results["errors"],
            warnings=validation_results["warnings"],
            summary=validation_results["summary"]
        )
    except Exception as e:
        logger.error("Failed to validate data", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to validate data")


@router.post("/clean", response_model=CleaningResponse)
async def clean_data(request: CleaningRequest):
    try:
        cleaned_data = await parser_service.clean_data(
            job_id=request.job_id,
            data=request.data,
            cleaning_rules=request.cleaning_rules
        )
        
        return CleaningResponse(
            job_id=request.job_id,
            cleaned_data=cleaned_data["data"],
            changes_summary=cleaned_data["changes"],
            total_changes=cleaned_data["total_changes"]
        )
    except Exception as e:
        logger.error("Failed to clean data", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to clean data")


@router.get("/export/{job_id}")
async def export_data(
    job_id: str,
    format: str = Query("csv", description="Export format: csv, xlsx, json")
):
    try:
        export_data = await parser_service.export_data(job_id, format)
        
        if not export_data:
            raise HTTPException(status_code=404, detail="Job not found or data not ready")
        
        return JSONResponse(content={
            "download_url": export_data["url"],
            "file_name": export_data["filename"],
            "format": format
        })
    except Exception as e:
        logger.error("Failed to export data", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to export data")


@router.get("/metrics/{job_id}")
async def get_metrics(job_id: str):
    metrics = await parser_service.get_job_metrics(job_id)
    
    if not metrics:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JSONResponse(content=metrics)


@router.post("/excel/sheets")
async def get_excel_sheets(file: UploadFile = File(...)):
    """Get list of sheets in an Excel file"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["xlsx", "xls"]:
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    contents = await file.read()
    
    try:
        sheets_info = await parser_service.get_excel_sheets_info(contents, file.filename)
        return JSONResponse(content={"sheets": sheets_info})
    except Exception as e:
        logger.error("Failed to get Excel sheets", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get Excel sheets")


@router.post("/excel/preview-sheet")
async def preview_excel_sheet(
    file: UploadFile = File(...),
    sheet_name: str = Query(..., description="Sheet name or index"),
    rows: int = Query(20, description="Number of rows to preview")
):
    """Preview a specific sheet from an Excel file"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    contents = await file.read()
    
    try:
        # Try to parse sheet_name as integer if possible
        try:
            sheet_index = int(sheet_name)
            sheet_identifier = sheet_index
        except ValueError:
            sheet_identifier = sheet_name
        
        preview_data = await parser_service.preview_excel_sheet(contents, file.filename, sheet_identifier, rows)
        return JSONResponse(content=preview_data)
    except Exception as e:
        logger.error("Failed to preview Excel sheet", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to preview Excel sheet")


@router.post("/excel/extract-json")
async def extract_json_from_excel(
    file: UploadFile = File(...),
    sheet_name: str = Query(..., description="Sheet name or index"),
    header_row: int = Query(0, description="Row index containing headers (0-based)"),
    start_row: Optional[int] = Query(None, description="Start reading data from this row"),
    end_row: Optional[int] = Query(None, description="Stop reading data at this row"),
    columns: Optional[List[str]] = Query(None, description="Specific columns to include")
):
    """Extract JSON data from Excel with flexible options"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    contents = await file.read()
    
    try:
        # Try to parse sheet_name as integer if possible
        try:
            sheet_index = int(sheet_name)
            sheet_identifier = sheet_index
        except ValueError:
            sheet_identifier = sheet_name
        
        json_data = await parser_service.extract_json_from_excel(
            contents=contents,
            filename=file.filename,
            sheet_name=sheet_identifier,
            header_row=header_row,
            start_row=start_row,
            end_row=end_row,
            columns=columns
        )
        
        return JSONResponse(content=json_data)
    except Exception as e:
        logger.error("Failed to extract JSON from Excel", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    
    try:
        await parser_service.handle_websocket(websocket, job_id)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", job_id=job_id)
    except Exception as e:
        logger.error("WebSocket error", job_id=job_id, error=str(e))
        await websocket.close()