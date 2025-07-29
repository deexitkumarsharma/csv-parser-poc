import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd
from fastapi import WebSocket
import structlog

from app.core.cache import cache_manager
from app.core.llm_client import gemini_client
from app.models.schemas import ParseStatus
from app.services.llm_mapper import LLMMapper
from app.services.validators import DataValidator
from app.services.transformers import DataTransformer
from app.utils.file_handler import FileHandler

logger = structlog.get_logger()


class ParserService:
    def __init__(self):
        self.file_handler = FileHandler()
        self.llm_mapper = LLMMapper()
        self.validator = DataValidator()
        self.transformer = DataTransformer()
        self.job_cache_prefix = "job"
    
    async def start_parsing(
        self,
        job_id: str,
        file_path: str,
        business_context: str
    ) -> Dict[str, Any]:
        job_data = {
            "job_id": job_id,
            "status": ParseStatus.PROCESSING,
            "file_path": file_path,
            "business_context": business_context,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "progress": 0,
            "metrics": {
                "llm_calls": 0,
                "llm_tokens_used": 0,
                "cache_hits": 0,
                "cache_misses": 0,
                "processing_start": datetime.utcnow().isoformat()
            }
        }
        
        await cache_manager.set(f"{self.job_cache_prefix}:{job_id}", job_data)
        
        # Start async processing
        asyncio.create_task(self._process_file(job_id, file_path, business_context))
        
        return job_data
    
    async def _process_file(self, job_id: str, file_path: str, business_context: str):
        try:
            await self._update_job_status(job_id, ParseStatus.PROCESSING, progress=10)
            
            # Read and parse file
            df = await self.file_handler.read_file(file_path)
            
            job_data = await self._get_job_data(job_id)
            job_data["row_count"] = len(df)
            job_data["column_count"] = len(df.columns)
            job_data["headers"] = df.columns.tolist()
            
            await self._update_job_data(job_id, job_data, progress=20)
            
            # Generate column mappings
            await self._update_job_status(job_id, ParseStatus.MAPPING, progress=30)
            
            sample_data = df.head(10).to_dict(orient="records")
            
            # Here you would normally have a target schema, for demo we'll create one
            target_schema = self._generate_default_schema(df.columns.tolist())
            
            mappings = await self.llm_mapper.map_columns(
                headers=df.columns.tolist(),
                sample_data=sample_data,
                target_schema=target_schema,
                business_context=business_context
            )
            
            job_data["mappings"] = mappings
            job_data["metrics"]["llm_calls"] += 1
            
            await self._update_job_data(job_id, job_data, progress=50)
            
            # Validate data
            await self._update_job_status(job_id, ParseStatus.VALIDATING, progress=60)
            
            validation_results = await self.validator.validate_dataframe(
                df, mappings, business_context
            )
            
            job_data["validation_results"] = validation_results
            job_data["metrics"]["validation_errors"] = len(validation_results.get("errors", []))
            
            await self._update_job_data(job_id, job_data, progress=80)
            
            # Clean data
            await self._update_job_status(job_id, ParseStatus.CLEANING, progress=90)
            
            cleaned_df = await self.transformer.clean_dataframe(
                df, mappings, business_context
            )
            
            # Save cleaned data
            cleaned_file_path = Path(file_path).parent / f"{job_id}_cleaned.csv"
            cleaned_df.to_csv(cleaned_file_path, index=False)
            
            job_data["cleaned_file_path"] = str(cleaned_file_path)
            job_data["metrics"]["data_changes"] = self._count_changes(df, cleaned_df)
            job_data["metrics"]["processing_end"] = datetime.utcnow().isoformat()
            
            # Calculate processing time
            start_time = datetime.fromisoformat(job_data["metrics"]["processing_start"])
            end_time = datetime.fromisoformat(job_data["metrics"]["processing_end"])
            job_data["metrics"]["processing_time_seconds"] = (end_time - start_time).total_seconds()
            
            # Estimate cost
            job_data["metrics"]["estimated_cost"] = gemini_client.estimate_cost(
                job_data["metrics"]["llm_tokens_used"]
            )
            
            await self._update_job_status(job_id, ParseStatus.COMPLETED, progress=100)
            await self._update_job_data(job_id, job_data)
            
        except Exception as e:
            logger.error("Failed to process file", job_id=job_id, error=str(e))
            await self._update_job_status(
                job_id,
                ParseStatus.FAILED,
                error=str(e)
            )
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await self._get_job_data(job_id)
    
    async def preview_file(
        self,
        file_contents: bytes,
        filename: str,
        rows: int = 10
    ) -> Dict[str, Any]:
        df = await self.file_handler.read_file_contents(file_contents, filename)
        
        return {
            "headers": df.columns.tolist(),
            "data": df.head(rows).to_dict(orient="records"),
            "total_rows": len(df),
            "file_type": filename.split(".")[-1].lower(),
            "encoding": "utf-8"  # Can be detected if needed
        }
    
    async def suggest_mappings(
        self,
        headers: List[str],
        sample_data: List[Dict[str, Any]],
        target_schema: Dict[str, str],
        business_context: str
    ) -> Dict[str, Dict[str, Any]]:
        return await self.llm_mapper.map_columns(
            headers, sample_data, target_schema, business_context
        )
    
    async def save_mappings(self, job_id: str, mappings: Dict) -> bool:
        job_data = await self._get_job_data(job_id)
        if not job_data:
            return False
        
        job_data["user_mappings"] = mappings
        job_data["updated_at"] = datetime.utcnow().isoformat()
        
        return await self._update_job_data(job_id, job_data)
    
    async def validate_data(
        self,
        job_id: str,
        data: List[Dict[str, Any]],
        rules: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        job_data = await self._get_job_data(job_id)
        if not job_data:
            return {"valid": False, "errors": ["Job not found"]}
        
        df = pd.DataFrame(data)
        mappings = job_data.get("user_mappings") or job_data.get("mappings", {})
        
        return await self.validator.validate_dataframe(
            df,
            mappings,
            job_data.get("business_context", "general"),
            custom_rules=rules
        )
    
    async def clean_data(
        self,
        job_id: str,
        data: List[Dict[str, Any]],
        cleaning_rules: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        job_data = await self._get_job_data(job_id)
        if not job_data:
            return {"data": data, "changes": {}, "total_changes": 0}
        
        df = pd.DataFrame(data)
        mappings = job_data.get("user_mappings") or job_data.get("mappings", {})
        
        cleaned_df = await self.transformer.clean_dataframe(
            df,
            mappings,
            job_data.get("business_context", "general"),
            custom_rules=cleaning_rules
        )
        
        changes = self._analyze_changes(df, cleaned_df)
        
        return {
            "data": cleaned_df.to_dict(orient="records"),
            "changes": changes,
            "total_changes": sum(sum(field.values()) for field in changes.values())
        }
    
    async def export_data(self, job_id: str, format: str) -> Optional[Dict[str, str]]:
        job_data = await self._get_job_data(job_id)
        if not job_data or job_data.get("status") != ParseStatus.COMPLETED:
            return None
        
        cleaned_file_path = job_data.get("cleaned_file_path")
        if not cleaned_file_path or not Path(cleaned_file_path).exists():
            return None
        
        df = pd.read_csv(cleaned_file_path)
        
        export_filename = f"{job_id}_export.{format}"
        export_path = Path(cleaned_file_path).parent / export_filename
        
        if format == "csv":
            df.to_csv(export_path, index=False)
        elif format == "xlsx":
            df.to_excel(export_path, index=False)
        elif format == "json":
            df.to_json(export_path, orient="records", indent=2)
        
        return {
            "url": f"/uploads/{export_filename}",
            "filename": export_filename
        }
    
    async def get_job_metrics(self, job_id: str) -> Optional[Dict[str, Any]]:
        job_data = await self._get_job_data(job_id)
        if not job_data:
            return None
        
        return job_data.get("metrics", {})
    
    async def handle_websocket(self, websocket: WebSocket, job_id: str):
        while True:
            job_data = await self._get_job_data(job_id)
            
            if job_data:
                await websocket.send_json({
                    "type": "status_update",
                    "data": {
                        "status": job_data.get("status"),
                        "progress": job_data.get("progress", 0),
                        "message": self._get_status_message(job_data.get("status"))
                    }
                })
                
                if job_data.get("status") in [ParseStatus.COMPLETED, ParseStatus.FAILED]:
                    break
            
            await asyncio.sleep(1)
    
    async def _get_job_data(self, job_id: str) -> Optional[Dict[str, Any]]:
        return await cache_manager.get(f"{self.job_cache_prefix}:{job_id}")
    
    async def _update_job_data(
        self,
        job_id: str,
        job_data: Dict[str, Any],
        progress: Optional[int] = None
    ) -> bool:
        if progress is not None:
            job_data["progress"] = progress
        
        job_data["updated_at"] = datetime.utcnow().isoformat()
        return await cache_manager.set(f"{self.job_cache_prefix}:{job_id}", job_data)
    
    async def _update_job_status(
        self,
        job_id: str,
        status: ParseStatus,
        progress: Optional[int] = None,
        error: Optional[str] = None
    ):
        job_data = await self._get_job_data(job_id)
        if job_data:
            job_data["status"] = status
            if progress is not None:
                job_data["progress"] = progress
            if error:
                job_data["error"] = error
                job_data["errors"] = job_data.get("errors", []) + [error]
            
            await self._update_job_data(job_id, job_data)
    
    def _generate_default_schema(self, headers: List[str]) -> Dict[str, str]:
        # Simple default schema generation
        schema = {}
        for header in headers:
            clean_header = header.lower().replace(" ", "_").replace("-", "_")
            schema[clean_header] = "string"  # Default type
        
        return schema
    
    def _count_changes(self, original_df: pd.DataFrame, cleaned_df: pd.DataFrame) -> int:
        changes = 0
        for col in original_df.columns:
            if col in cleaned_df.columns:
                changes += (original_df[col] != cleaned_df[col]).sum()
        return int(changes)
    
    def _analyze_changes(self, original_df: pd.DataFrame, cleaned_df: pd.DataFrame) -> Dict[str, Dict[str, int]]:
        changes = {}
        
        for col in original_df.columns:
            if col in cleaned_df.columns:
                col_changes = {}
                
                # Count different types of changes
                modified = (original_df[col] != cleaned_df[col]).sum()
                
                if modified > 0:
                    col_changes["modified"] = int(modified)
                    
                    # Analyze specific changes
                    for idx in range(len(original_df)):
                        if original_df[col].iloc[idx] != cleaned_df[col].iloc[idx]:
                            original_val = str(original_df[col].iloc[idx])
                            cleaned_val = str(cleaned_df[col].iloc[idx])
                            
                            if original_val.strip() != original_val:
                                col_changes["trimmed"] = col_changes.get("trimmed", 0) + 1
                            if original_val.lower() == cleaned_val:
                                col_changes["case_changed"] = col_changes.get("case_changed", 0) + 1
                
                if col_changes:
                    changes[col] = col_changes
        
        return changes
    
    def _get_status_message(self, status: Optional[str]) -> str:
        messages = {
            ParseStatus.PENDING: "Job is queued for processing",
            ParseStatus.PROCESSING: "Reading and analyzing file",
            ParseStatus.MAPPING: "Generating intelligent column mappings",
            ParseStatus.VALIDATING: "Validating data integrity",
            ParseStatus.CLEANING: "Cleaning and standardizing data",
            ParseStatus.COMPLETED: "Processing completed successfully",
            ParseStatus.FAILED: "Processing failed"
        }
        
        return messages.get(status, "Unknown status")