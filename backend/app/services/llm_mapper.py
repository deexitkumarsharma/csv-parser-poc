from typing import Dict, List, Any, Optional
import structlog

from app.core.llm_client import gemini_client
from app.core.cache import cache_manager
from app.utils.patterns import PatternMatcher

logger = structlog.get_logger()


class LLMMapper:
    def __init__(self):
        self.pattern_matcher = PatternMatcher()
        self.cache_prefix = "mapping"
    
    async def map_columns(
        self,
        headers: List[str],
        sample_data: List[Dict[str, Any]],
        target_schema: Dict[str, str],
        business_context: str = "general"
    ) -> Dict[str, Dict[str, Any]]:
        # Level 1: Try pattern matching first
        pattern_mappings = self.pattern_matcher.match_columns(headers, target_schema)
        
        # Filter high-confidence pattern matches
        high_confidence_mappings = {
            col: mapping
            for col, mapping in pattern_mappings.items()
            if mapping.get("confidence", 0) >= 0.9
        }
        
        # Identify columns that need LLM mapping
        unmapped_columns = [
            col for col in headers
            if col not in high_confidence_mappings
        ]
        
        if not unmapped_columns:
            logger.info("All columns mapped via patterns", count=len(headers))
            return pattern_mappings
        
        # Level 2: Check cache for LLM mappings
        cache_key = self._generate_cache_key(unmapped_columns, business_context)
        cached_mappings = await cache_manager.get(f"{self.cache_prefix}:{cache_key}")
        
        if cached_mappings:
            logger.info("Using cached LLM mappings", count=len(cached_mappings))
            # Merge pattern and cached mappings
            return {**high_confidence_mappings, **cached_mappings}
        
        # Level 3: Use LLM for remaining columns
        logger.info("Requesting LLM mappings", columns=unmapped_columns)
        
        # Prepare sample data for unmapped columns
        unmapped_sample_data = [
            {col: row.get(col) for col in unmapped_columns}
            for row in sample_data
        ]
        
        llm_mappings = await gemini_client.map_columns(
            headers=unmapped_columns,
            sample_data=unmapped_sample_data,
            target_schema=target_schema,
            business_context=business_context
        )
        
        # Cache the LLM mappings
        if llm_mappings:
            await cache_manager.set(
                f"{self.cache_prefix}:{cache_key}",
                llm_mappings,
                ttl=86400 * 7  # Cache for 7 days
            )
        
        # Merge all mappings
        final_mappings = {**high_confidence_mappings}
        
        for col in unmapped_columns:
            if col in llm_mappings:
                final_mappings[col] = llm_mappings[col]
            else:
                # Fallback to best pattern match
                if col in pattern_mappings:
                    final_mappings[col] = pattern_mappings[col]
                else:
                    final_mappings[col] = {
                        "target_field": None,
                        "confidence": 0.0,
                        "reasoning": "No suitable mapping found"
                    }
        
        return final_mappings
    
    def _generate_cache_key(self, columns: List[str], context: str) -> str:
        # Create a deterministic cache key
        sorted_columns = sorted(columns)
        key_string = f"{context}:{':'.join(sorted_columns)}"
        return str(hash(key_string))
    
    async def improve_mapping(
        self,
        original_mapping: Dict[str, str],
        user_correction: Dict[str, str],
        context: str
    ):
        # Learn from user corrections for future mappings
        for source_col, target_field in user_correction.items():
            if source_col in original_mapping:
                # Store the correction pattern
                pattern_key = f"correction:{context}:{source_col.lower()}"
                await cache_manager.set(
                    pattern_key,
                    {"target": target_field, "confidence": 1.0},
                    ttl=86400 * 30  # Remember for 30 days
                )