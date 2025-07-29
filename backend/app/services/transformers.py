import re
from typing import Dict, List, Any, Optional
import pandas as pd
import structlog

from app.core.llm_client import gemini_client
from app.models.enums import CleaningActionType

logger = structlog.get_logger()


class DataTransformer:
    def __init__(self):
        self.special_chars_pattern = re.compile(r'[^\w\s-]')
    
    async def clean_dataframe(
        self,
        df: pd.DataFrame,
        mappings: Dict[str, Dict[str, Any]],
        business_context: str,
        custom_rules: Optional[List[Dict]] = None
    ) -> pd.DataFrame:
        cleaned_df = df.copy()
        
        for column, mapping in mappings.items():
            if column not in cleaned_df.columns:
                continue
            
            field_type = mapping.get("data_type", "string")
            
            # Apply basic cleaning first
            cleaned_df[column] = cleaned_df[column].apply(
                lambda x: self._basic_clean(x, field_type)
            )
            
            # Apply LLM-powered cleaning for complex cases
            if field_type in ["name", "address", "email"]:
                sample_values = cleaned_df[column].dropna().head(5).tolist()
                
                if sample_values:
                    # Process in batches for efficiency
                    for idx, value in enumerate(cleaned_df[column]):
                        if pd.notna(value) and self._needs_llm_cleaning(value, field_type):
                            cleaned_value = await self._llm_clean(
                                value=str(value),
                                field_name=column,
                                field_type=field_type,
                                context={"business_context": business_context}
                            )
                            
                            if cleaned_value and cleaned_value != value:
                                cleaned_df.at[idx, column] = cleaned_value
            
            # Apply custom rules if provided
            if custom_rules:
                for rule in custom_rules:
                    if rule.get("field_name") == column:
                        cleaned_df[column] = self._apply_cleaning_rule(
                            cleaned_df[column], rule
                        )
        
        return cleaned_df
    
    def _basic_clean(self, value: Any, field_type: str) -> Any:
        if pd.isna(value):
            return value
        
        value_str = str(value).strip()
        
        if field_type == "string":
            # Remove extra whitespace
            value_str = " ".join(value_str.split())
        
        elif field_type == "number":
            # Remove non-numeric characters except decimal point
            value_str = re.sub(r'[^\d.-]', '', value_str)
            try:
                return float(value_str)
            except ValueError:
                return value
        
        elif field_type == "currency":
            # Remove currency symbols and convert to float
            value_str = re.sub(r'[$,€£¥]', '', value_str).strip()
            try:
                return float(value_str)
            except ValueError:
                return value
        
        elif field_type == "percentage":
            # Remove % and convert to decimal
            value_str = value_str.replace('%', '').strip()
            try:
                return float(value_str) / 100
            except ValueError:
                return value
        
        elif field_type == "phone":
            # Basic phone number cleaning
            value_str = re.sub(r'[^\d+\-()]', '', value_str)
        
        elif field_type == "email":
            # Lowercase and remove spaces
            value_str = value_str.lower().replace(' ', '')
        
        return value_str
    
    def _needs_llm_cleaning(self, value: str, field_type: str) -> bool:
        if field_type == "name":
            # Check for inconsistent capitalization, abbreviations
            return (
                value.isupper() or
                value.islower() or
                any(word in value.lower() for word in ["jr", "sr", "iii", "ii"]) or
                len(value.split()) == 1  # Single name that might need expansion
            )
        
        elif field_type == "address":
            # Check for abbreviations, inconsistent formatting
            return any(
                abbr in value.lower()
                for abbr in ["st.", "ave.", "rd.", "blvd.", "apt", "ste"]
            )
        
        elif field_type == "email":
            # Check for obvious typos in domain
            return any(
                typo in value.lower()
                for typo in ["gmial", "yaho", "hotmial", "outlok"]
            )
        
        return False
    
    async def _llm_clean(
        self,
        value: str,
        field_name: str,
        field_type: str,
        context: Dict[str, Any]
    ) -> Optional[str]:
        try:
            result = await gemini_client.clean_value(
                value=value,
                field_name=field_name,
                field_type=field_type,
                context=context
            )
            
            if result.get("confidence", 0) > 0.7:
                return result.get("cleaned_value", value)
            
        except Exception as e:
            logger.error("LLM cleaning error", error=str(e))
        
        return value
    
    def _apply_cleaning_rule(self, series: pd.Series, rule: Dict[str, Any]) -> pd.Series:
        action_type = rule.get("action_type")
        parameters = rule.get("parameters", {})
        
        if action_type == CleaningActionType.TRIM:
            return series.str.strip()
        
        elif action_type == CleaningActionType.UPPERCASE:
            return series.str.upper()
        
        elif action_type == CleaningActionType.LOWERCASE:
            return series.str.lower()
        
        elif action_type == CleaningActionType.TITLE_CASE:
            return series.str.title()
        
        elif action_type == CleaningActionType.REMOVE_SPECIAL:
            chars_to_remove = parameters.get("characters", "")
            if chars_to_remove:
                pattern = f"[{re.escape(chars_to_remove)}]"
                return series.str.replace(pattern, "", regex=True)
            else:
                return series.str.replace(self.special_chars_pattern, "", regex=True)
        
        elif action_type == CleaningActionType.FORMAT:
            format_string = parameters.get("format")
            if format_string:
                # Apply custom formatting
                return series.apply(lambda x: format_string.format(x) if pd.notna(x) else x)
        
        return series