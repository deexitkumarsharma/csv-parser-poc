import re
from typing import Dict, List, Any
from difflib import SequenceMatcher


class PatternMatcher:
    def __init__(self):
        # Common column name patterns and their likely mappings
        self.patterns = {
            "email": {
                "patterns": [
                    r".*email.*", r".*e-mail.*", r".*mail.*",
                    r".*contact.*email.*", r".*email.*address.*"
                ],
                "confidence": 0.95
            },
            "phone": {
                "patterns": [
                    r".*phone.*", r".*tel.*", r".*mobile.*",
                    r".*cell.*", r".*contact.*number.*", r".*ph\.?$"
                ],
                "confidence": 0.95
            },
            "first_name": {
                "patterns": [
                    r"^first.*name.*", r"^fname.*", r"^given.*name.*",
                    r"^forename.*", r"^first$"
                ],
                "confidence": 0.9
            },
            "last_name": {
                "patterns": [
                    r"^last.*name.*", r"^lname.*", r"^surname.*",
                    r"^family.*name.*", r"^last$"
                ],
                "confidence": 0.9
            },
            "full_name": {
                "patterns": [
                    r"^name$", r"^full.*name.*", r"^customer.*name.*",
                    r"^contact.*name.*", r"^person.*name.*"
                ],
                "confidence": 0.85
            },
            "address": {
                "patterns": [
                    r".*address.*", r".*street.*", r".*addr.*",
                    r".*location.*", r".*residence.*"
                ],
                "confidence": 0.85
            },
            "city": {
                "patterns": [
                    r"^city$", r".*city.*", r"^town$",
                    r"^municipality.*", r"^locality.*"
                ],
                "confidence": 0.9
            },
            "state": {
                "patterns": [
                    r"^state$", r".*state.*", r"^province.*",
                    r"^region.*", r"^st\.?$"
                ],
                "confidence": 0.9
            },
            "zip_code": {
                "patterns": [
                    r".*zip.*", r".*postal.*code.*", r".*postcode.*",
                    r"^zip$", r"^code$"
                ],
                "confidence": 0.95
            },
            "country": {
                "patterns": [
                    r"^country$", r".*country.*", r"^nation.*",
                    r"^ctry$"
                ],
                "confidence": 0.9
            },
            "date": {
                "patterns": [
                    r".*date$", r".*_dt$", r".*datetime.*",
                    r".*timestamp.*", r".*created.*", r".*updated.*"
                ],
                "confidence": 0.8
            },
            "id": {
                "patterns": [
                    r"^id$", r".*_id$", r"^identifier$",
                    r"^key$", r".*number$", r"^no\.?$"
                ],
                "confidence": 0.85
            },
            "amount": {
                "patterns": [
                    r".*amount.*", r".*price.*", r".*cost.*",
                    r".*total.*", r".*sum.*", r".*value.*"
                ],
                "confidence": 0.85
            },
            "currency": {
                "patterns": [
                    r".*currency.*", r"^curr$", r"^ccy$",
                    r".*monetary.*unit.*"
                ],
                "confidence": 0.95
            },
            "company": {
                "patterns": [
                    r".*company.*", r".*organization.*", r".*org.*",
                    r".*business.*", r".*employer.*", r".*corp.*"
                ],
                "confidence": 0.85
            },
            "description": {
                "patterns": [
                    r".*description.*", r".*desc.*", r".*details.*",
                    r".*notes.*", r".*comments.*", r".*remarks.*"
                ],
                "confidence": 0.8
            },
            "status": {
                "patterns": [
                    r"^status$", r".*status.*", r"^state$",
                    r".*condition.*", r".*stage.*"
                ],
                "confidence": 0.85
            },
            "category": {
                "patterns": [
                    r".*category.*", r".*type.*", r".*class.*",
                    r".*group.*", r".*classification.*"
                ],
                "confidence": 0.8
            }
        }
    
    def match_columns(
        self,
        headers: List[str],
        target_schema: Dict[str, str]
    ) -> Dict[str, Dict[str, Any]]:
        mappings = {}
        
        for header in headers:
            best_match = self._find_best_match(header, target_schema)
            mappings[header] = best_match
        
        return mappings
    
    def _find_best_match(
        self,
        header: str,
        target_schema: Dict[str, str]
    ) -> Dict[str, Any]:
        header_lower = header.lower().strip()
        best_match = {
            "target_field": None,
            "confidence": 0.0,
            "reasoning": "No pattern match found"
        }
        
        # First, try exact match
        for target_field in target_schema.keys():
            if header_lower == target_field.lower():
                return {
                    "target_field": target_field,
                    "confidence": 1.0,
                    "reasoning": "Exact match"
                }
        
        # Then, try pattern matching
        for field_type, pattern_info in self.patterns.items():
            for pattern in pattern_info["patterns"]:
                if re.match(pattern, header_lower):
                    # Find target field that matches this type
                    for target_field in target_schema.keys():
                        if field_type in target_field.lower() or target_field.lower() in field_type:
                            confidence = pattern_info["confidence"]
                            
                            if confidence > best_match["confidence"]:
                                best_match = {
                                    "target_field": target_field,
                                    "confidence": confidence,
                                    "reasoning": f"Pattern match for {field_type}"
                                }
        
        # Finally, try fuzzy matching
        if best_match["confidence"] < 0.7:
            for target_field in target_schema.keys():
                similarity = self._calculate_similarity(header_lower, target_field.lower())
                
                if similarity > 0.7 and similarity > best_match["confidence"]:
                    best_match = {
                        "target_field": target_field,
                        "confidence": similarity * 0.8,  # Reduce confidence for fuzzy matches
                        "reasoning": f"Fuzzy match (similarity: {similarity:.2f})"
                    }
        
        return best_match
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        # Use SequenceMatcher for fuzzy string matching
        return SequenceMatcher(None, str1, str2).ratio()
    
    def add_custom_pattern(
        self,
        field_type: str,
        patterns: List[str],
        confidence: float = 0.8
    ):
        if field_type not in self.patterns:
            self.patterns[field_type] = {
                "patterns": patterns,
                "confidence": confidence
            }
        else:
            self.patterns[field_type]["patterns"].extend(patterns)