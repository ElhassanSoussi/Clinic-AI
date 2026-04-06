from fastapi import status


class AppError(Exception):
    def __init__(
        self,
        detail: str,
        *,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        log_level: str = "error",
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code
        self.log_level = log_level


class ValidationAppError(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(
            detail,
            status_code=status.HTTP_400_BAD_REQUEST,
            log_level="warning",
        )


class ExternalServiceAppError(AppError):
    def __init__(self, detail: str) -> None:
        super().__init__(
            detail,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            log_level="error",
        )
