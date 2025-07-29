from enum import Enum


class ParseStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    MAPPING = "mapping"
    VALIDATING = "validating"
    CLEANING = "cleaning"
    COMPLETED = "completed"
    FAILED = "failed"


class DataType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    CURRENCY = "currency"
    PERCENTAGE = "percentage"
    URL = "url"
    JSON = "json"


class ValidationRuleType(str, Enum):
    REQUIRED = "required"
    PATTERN = "pattern"
    RANGE = "range"
    LENGTH = "length"
    FORMAT = "format"
    UNIQUE = "unique"
    CUSTOM = "custom"
    REFERENCE = "reference"


class ValidationSeverity(str, Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class CleaningActionType(str, Enum):
    TRIM = "trim"
    UPPERCASE = "uppercase"
    LOWERCASE = "lowercase"
    TITLE_CASE = "title_case"
    REMOVE_SPECIAL = "remove_special"
    STANDARDIZE = "standardize"
    FIX_TYPOS = "fix_typos"
    FORMAT = "format"
    CUSTOM = "custom"