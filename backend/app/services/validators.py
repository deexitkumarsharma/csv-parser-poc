import re
from typing import Dict, List, Any, Optional
from datetime import datetime
import pandas as pd
import structlog

from app.core.llm_client import gemini_client
from app.models.enums import ValidationRuleType, ValidationSeverity

logger = structlog.get_logger()


class DataValidator:
    def __init__(self):
        self.email_pattern = re.compile(r'^[\w\.-]+@[\w\.-]+\.\w+$')
        self.phone_pattern = re.compile(r'^\+?1?\d{9,15}$')
        self.url_pattern = re.compile(
            r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)$'
        )
    
    async def validate_dataframe(
        self,
        df: pd.DataFrame,
        mappings: Dict[str, Dict[str, Any]],
        business_context: str,
        custom_rules: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        errors = []
        warnings = []
        info = []
        
        # Generate validation rules using LLM
        for column, mapping in mappings.items():
            if column not in df.columns:
                continue
            
            # Get sample values
            sample_values = df[column].dropna().head(10).tolist()
            
            if not sample_values:
                continue
            
            # Generate rules with LLM
            rules = await gemini_client.generate_validation_rules(
                field_name=column,
                field_type=mapping.get("data_type", "string"),
                sample_values=sample_values,
                business_context=business_context
            )
            
            # Apply rules
            for idx, value in enumerate(df[column]):
                for rule in rules:
                    validation_result = self._apply_rule(
                        value=value,
                        rule=rule,
                        row_index=idx,
                        column=column
                    )
                    
                    if validation_result:
                        if rule.get("severity") == ValidationSeverity.ERROR:
                            errors.append(validation_result)
                        elif rule.get("severity") == ValidationSeverity.WARNING:
                            warnings.append(validation_result)
                        else:
                            info.append(validation_result)
        
        # Apply custom rules if provided
        if custom_rules:
            for rule in custom_rules:
                column = rule.get("field_name")
                if column in df.columns:
                    for idx, value in enumerate(df[column]):
                        validation_result = self._apply_rule(
                            value=value,
                            rule=rule,
                            row_index=idx,
                            column=column
                        )
                        
                        if validation_result:
                            errors.append(validation_result)
        
        # Summary statistics
        summary = {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "errors_count": len(errors),
            "warnings_count": len(warnings),
            "info_count": len(info),
            "error_columns": list(set(e["column"] for e in errors)),
            "warning_columns": list(set(w["column"] for w in warnings))
        }
        
        return {
            "valid": len(errors) == 0,
            "errors": errors[:100],  # Limit to first 100 errors
            "warnings": warnings[:50],  # Limit to first 50 warnings
            "info": info[:20],  # Limit to first 20 info messages
            "summary": summary
        }
    
    def _apply_rule(
        self,
        value: Any,
        rule: Dict[str, Any],
        row_index: int,
        column: str
    ) -> Optional[Dict[str, Any]]:
        rule_type = rule.get("rule_type")
        parameters = rule.get("parameters", {})
        
        try:
            if rule_type == ValidationRuleType.REQUIRED:
                if pd.isna(value) or str(value).strip() == "":
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} is required")
                    )
            
            elif rule_type == ValidationRuleType.PATTERN:
                pattern = parameters.get("pattern")
                if pattern and not re.match(pattern, str(value)):
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} does not match expected pattern")
                    )
            
            elif rule_type == ValidationRuleType.RANGE:
                min_val = parameters.get("min")
                max_val = parameters.get("max")
                
                try:
                    numeric_value = float(value)
                    if min_val is not None and numeric_value < min_val:
                        return self._create_error(
                            row_index, column, value, rule,
                            rule.get("error_message", f"{column} is below minimum value {min_val}")
                        )
                    
                    if max_val is not None and numeric_value > max_val:
                        return self._create_error(
                            row_index, column, value, rule,
                            rule.get("error_message", f"{column} exceeds maximum value {max_val}")
                        )
                except (ValueError, TypeError):
                    return self._create_error(
                        row_index, column, value, rule,
                        f"{column} must be numeric for range validation"
                    )
            
            elif rule_type == ValidationRuleType.LENGTH:
                min_length = parameters.get("min")
                max_length = parameters.get("max")
                value_length = len(str(value))
                
                if min_length is not None and value_length < min_length:
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} is too short (minimum {min_length} characters)")
                    )
                
                if max_length is not None and value_length > max_length:
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} is too long (maximum {max_length} characters)")
                    )
            
            elif rule_type == ValidationRuleType.FORMAT:
                format_type = parameters.get("type")
                
                if format_type == "email" and not self.email_pattern.match(str(value)):
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} is not a valid email address")
                    )
                
                elif format_type == "phone" and not self.phone_pattern.match(str(value).replace("-", "").replace(" ", "")):
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} is not a valid phone number")
                    )
                
                elif format_type == "url" and not self.url_pattern.match(str(value)):
                    return self._create_error(
                        row_index, column, value, rule,
                        rule.get("error_message", f"{column} is not a valid URL")
                    )
                
                elif format_type == "date":
                    date_format = parameters.get("format", "%Y-%m-%d")
                    try:
                        datetime.strptime(str(value), date_format)
                    except ValueError:
                        return self._create_error(
                            row_index, column, value, rule,
                            rule.get("error_message", f"{column} is not a valid date")
                        )
            
            elif rule_type == ValidationRuleType.UNIQUE:
                # This would need access to all values in the column
                # Implement in the calling function
                pass
            
            elif rule_type == ValidationRuleType.CUSTOM:
                # Custom validation logic would go here
                pass
        
        except Exception as e:
            logger.error("Validation rule error", rule_type=rule_type, error=str(e))
        
        return None
    
    def _create_error(
        self,
        row_index: int,
        column: str,
        value: Any,
        rule: Dict[str, Any],
        message: str
    ) -> Dict[str, Any]:
        return {
            "row_index": row_index,
            "column": column,
            "value": value,
            "rule": rule,
            "message": message
        }