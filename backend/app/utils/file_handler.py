import io
from pathlib import Path
from typing import Union, Optional
import pandas as pd
import chardet
import structlog

logger = structlog.get_logger()


class FileHandler:
    def __init__(self):
        self.encodings_to_try = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
    
    async def read_file(self, file_path: Union[str, Path]) -> pd.DataFrame:
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_extension = file_path.suffix.lower()
        
        if file_extension == ".csv":
            return await self._read_csv(file_path)
        elif file_extension in [".xlsx", ".xls"]:
            return await self._read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    
    async def read_file_contents(
        self,
        contents: bytes,
        filename: str
    ) -> pd.DataFrame:
        file_extension = Path(filename).suffix.lower()
        
        if file_extension == ".csv":
            return await self._read_csv_contents(contents)
        elif file_extension in [".xlsx", ".xls"]:
            return await self._read_excel_contents(contents)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    
    async def _read_csv(self, file_path: Path) -> pd.DataFrame:
        # Detect encoding
        encoding = self._detect_encoding(file_path)
        
        # Try to read with detected encoding
        for enc in [encoding] + self.encodings_to_try:
            try:
                df = pd.read_csv(file_path, encoding=enc)
                logger.info(f"Successfully read CSV with encoding: {enc}")
                return self._clean_dataframe(df)
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error reading CSV: {e}")
                raise
        
        raise ValueError("Could not decode CSV file with any supported encoding")
    
    async def _read_csv_contents(self, contents: bytes) -> pd.DataFrame:
        # Detect encoding from contents
        detection = chardet.detect(contents)
        encoding = detection.get("encoding", "utf-8")
        
        for enc in [encoding] + self.encodings_to_try:
            try:
                df = pd.read_csv(io.BytesIO(contents), encoding=enc)
                return self._clean_dataframe(df)
            except UnicodeDecodeError:
                continue
            except Exception as e:
                logger.error(f"Error reading CSV contents: {e}")
                raise
        
        raise ValueError("Could not decode CSV contents with any supported encoding")
    
    async def _read_excel(self, file_path: Path) -> pd.DataFrame:
        try:
            # Read the first sheet by default
            df = pd.read_excel(file_path, engine="openpyxl")
            return self._clean_dataframe(df)
        except Exception as e:
            logger.error(f"Error reading Excel file: {e}")
            raise
    
    async def _read_excel_contents(self, contents: bytes) -> pd.DataFrame:
        try:
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
            return self._clean_dataframe(df)
        except Exception as e:
            logger.error(f"Error reading Excel contents: {e}")
            raise
    
    def _detect_encoding(self, file_path: Path) -> str:
        try:
            with open(file_path, "rb") as f:
                raw_data = f.read(10000)  # Read first 10KB
                result = chardet.detect(raw_data)
                return result.get("encoding", "utf-8")
        except Exception:
            return "utf-8"
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        # Remove completely empty rows and columns
        df = df.dropna(how="all", axis=0)
        df = df.dropna(how="all", axis=1)
        
        # Strip column names
        df.columns = [str(col).strip() for col in df.columns]
        
        # Remove unnamed columns (often index columns from Excel)
        unnamed_cols = [col for col in df.columns if col.startswith("Unnamed:")]
        if unnamed_cols:
            df = df.drop(columns=unnamed_cols)
        
        return df
    
    async def save_dataframe(
        self,
        df: pd.DataFrame,
        file_path: Union[str, Path],
        format: str = "csv"
    ):
        file_path = Path(file_path)
        
        if format == "csv":
            df.to_csv(file_path, index=False, encoding="utf-8")
        elif format == "xlsx":
            df.to_excel(file_path, index=False, engine="openpyxl")
        elif format == "json":
            df.to_json(file_path, orient="records", indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        logger.info(f"Saved dataframe to {file_path} as {format}")