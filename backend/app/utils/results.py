from typing import Any, Optional
from http import HTTPStatus

class Result:
    """
    A generic class to handle service operation results
    """
    def __init__(
        self,
        success: bool,
        data: Any = None,
        error: Optional[str] = None,
        status_code: int = HTTPStatus.OK
    ):
        self.success = success
        self.data = data
        self.error = error
        self.status_code = status_code

    @classmethod
    def ok(cls, data: Any = None, status_code: int = HTTPStatus.OK) -> 'Result':
        """
        Creates a successful result
        """
        return cls(success=True, data=data, status_code=status_code)

    @classmethod
    def fail(cls, error: str, status_code: int = HTTPStatus.BAD_REQUEST) -> 'Result':
        """
        Creates a failed result
        """
        return cls(success=False, error=error, status_code=status_code)

    def to_dict(self) -> dict:
        """
        Converts the result to a dictionary format
        """
        result = {
            "success": self.success,
            "status_code": self.status_code
        }
        
        if self.data is not None:
            result["data"] = self.data
        if self.error is not None:
            result["error"] = self.error
            
        return result