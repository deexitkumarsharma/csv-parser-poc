import json
from typing import Dict, List, Optional, Any
import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential
import structlog

from app.core.config import settings
from app.core.cache import cache_manager

logger = structlog.get_logger()

genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiClient:
    def __init__(self):
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
        self.cache_prefix = "gemini"
    
    def _make_cache_key(self, prompt: str, context: Optional[Dict] = None) -> str:
        cache_data = {"prompt": prompt, "context": context or {}}
        return f"{self.cache_prefix}:{hash(json.dumps(cache_data, sort_keys=True))}"
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate(
        self,
        prompt: str,
        context: Optional[Dict] = None,
        use_cache: bool = True,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        cache_key = self._make_cache_key(prompt, context)
        
        if use_cache:
            cached_response = await cache_manager.get(cache_key)
            if cached_response:
                logger.info("Using cached LLM response", cache_key=cache_key)
                return cached_response
        
        try:
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=temperature,
                    max_output_tokens=settings.GEMINI_MAX_TOKENS,
                )
            )
            
            result = {
                "text": response.text,
                "usage": {
                    "prompt_tokens": response.usage_metadata.prompt_token_count,
                    "completion_tokens": response.usage_metadata.candidates_token_count,
                    "total_tokens": response.usage_metadata.total_token_count,
                },
                "finish_reason": response.candidates[0].finish_reason.name,
            }
            
            if use_cache:
                await cache_manager.set(cache_key, result)
            
            return result
            
        except Exception as e:
            logger.error("Gemini API error", error=str(e))
            raise
    
    async def map_columns(
        self,
        headers: List[str],
        sample_data: List[Dict],
        target_schema: Dict[str, str],
        business_context: str = "general"
    ) -> Dict[str, Dict[str, Any]]:
        prompt = f"""You are an expert data analyst. Map the CSV columns to the target schema.

Business Context: {business_context}

CSV Headers: {headers}

Sample Data (first 5 rows):
{json.dumps(sample_data[:5], indent=2)}

Target Schema Fields:
{json.dumps(target_schema, indent=2)}

Instructions:
1. Analyze the headers and sample data
2. Map each CSV column to the most appropriate target field
3. Consider the business context for accurate mapping
4. Provide confidence scores (0.0-1.0) for each mapping
5. Explain your reasoning briefly

Return JSON in this format:
{{
    "mappings": {{
        "csv_column": {{
            "target_field": "field_name",
            "confidence": 0.95,
            "reasoning": "Brief explanation"
        }}
    }}
}}
"""
        
        response = await self.generate(prompt, {"business_context": business_context})
        
        try:
            result = json.loads(response["text"])
            return result.get("mappings", {})
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM mapping response")
            return {}
    
    async def generate_validation_rules(
        self,
        field_name: str,
        field_type: str,
        sample_values: List[Any],
        business_context: str = "general"
    ) -> List[Dict[str, Any]]:
        prompt = f"""Generate validation rules for a data field.

Field Name: {field_name}
Field Type: {field_type}
Business Context: {business_context}

Sample Values:
{json.dumps(sample_values[:10], indent=2)}

Generate appropriate validation rules based on the data patterns and business context.

Return JSON array of validation rules:
[
    {{
        "rule_type": "pattern|range|format|required|unique|custom",
        "parameters": {{}},
        "error_message": "User-friendly error message",
        "severity": "error|warning|info"
    }}
]
"""
        
        response = await self.generate(prompt, {"field": field_name})
        
        try:
            return json.loads(response["text"])
        except json.JSONDecodeError:
            logger.error("Failed to parse validation rules")
            return []
    
    async def clean_value(
        self,
        value: str,
        field_name: str,
        field_type: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        prompt = f"""Clean and standardize this data value.

Field: {field_name}
Type: {field_type}
Value: "{value}"
Context: {json.dumps(context, indent=2)}

Instructions:
1. Clean and standardize the value
2. Fix obvious typos and formatting issues
3. Ensure consistency with the field type
4. Maintain data integrity

Return JSON:
{{
    "cleaned_value": "the cleaned value",
    "changes_made": ["list of changes"],
    "confidence": 0.95
}}
"""
        
        response = await self.generate(
            prompt,
            {"field": field_name, "value": value},
            temperature=0.3
        )
        
        try:
            return json.loads(response["text"])
        except json.JSONDecodeError:
            return {
                "cleaned_value": value,
                "changes_made": [],
                "confidence": 0.0
            }
    
    def estimate_cost(self, token_count: int) -> float:
        # Gemini 1.5 Flash pricing (approximate)
        input_cost_per_million = 0.35
        output_cost_per_million = 1.05
        
        # Rough estimate: 30% input, 70% output
        input_tokens = token_count * 0.3
        output_tokens = token_count * 0.7
        
        cost = (input_tokens * input_cost_per_million / 1_000_000) + \
               (output_tokens * output_cost_per_million / 1_000_000)
        
        return round(cost, 4)


gemini_client = GeminiClient()