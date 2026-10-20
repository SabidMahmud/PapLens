"""Consistent HTTP error responses for API and application exceptions."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.errors import (
    HeatmapGenerationError,
    ImageDimensionsExceeded,
    InferenceExecutionError,
    InvalidImageError,
    ModelNotReadyError,
    PatchExtractionError,
    UnsupportedUploadFormatError,
    UploadReadError,
    UploadTooLargeError,
)
from app.inference_gate import InferenceCapacityError


logger = logging.getLogger(__name__)


def error_response(
    status_code: int,
    error: str,
    detail: str,
    *,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Build the error payload advertised by the OpenAPI schema."""
    return JSONResponse(
        status_code=status_code,
        content={"error": error, "detail": detail},
        headers=headers,
    )


async def application_error_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Translate known application failures without exposing internals."""
    if isinstance(exc, UploadTooLargeError):
        return error_response(
            status.HTTP_413_CONTENT_TOO_LARGE,
            "upload_too_large",
            str(exc),
        )
    if isinstance(exc, UnsupportedUploadFormatError):
        return error_response(
            status.HTTP_400_BAD_REQUEST,
            "unsupported_image_format",
            str(exc),
        )
    if isinstance(exc, UploadReadError):
        return error_response(
            status.HTTP_400_BAD_REQUEST,
            "upload_read_failed",
            str(exc),
        )
    if isinstance(exc, ImageDimensionsExceeded):
        return error_response(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "image_dimensions_exceeded",
            str(exc),
        )
    if isinstance(exc, InvalidImageError):
        return error_response(status.HTTP_400_BAD_REQUEST, "invalid_image", str(exc))
    if isinstance(exc, InferenceCapacityError):
        return error_response(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "inference_capacity_full",
            str(exc),
            headers={"Retry-After": "5"},
        )
    if isinstance(exc, ModelNotReadyError):
        return error_response(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "models_not_ready",
            "Inference models are not ready.",
            headers={"Retry-After": "5"},
        )

    logger.error(
        "Internal prediction failure on %s",
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    if isinstance(exc, PatchExtractionError):
        detail = "Image patch extraction failed."
    elif isinstance(exc, HeatmapGenerationError):
        detail = "Attention visualization generation failed."
    else:
        detail = "Inference could not be completed."
    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_inference_error",
        detail,
    )


async def request_validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Keep framework validation failures consistent with ErrorResponse."""
    return error_response(
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "request_validation_error",
        "The request parameters or body are invalid.",
    )


async def http_error_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Normalize explicit FastAPI and Starlette HTTP errors."""
    detail = (
        exc.detail
        if isinstance(exc.detail, str)
        else "The request could not be completed."
    )
    return error_response(
        exc.status_code,
        f"http_{exc.status_code}",
        detail,
        headers=exc.headers,
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unexpected failures and return a non-sensitive response."""
    logger.error(
        "Unhandled API failure on %s",
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "internal_server_error",
        "An unexpected server error occurred.",
    )


def register_error_handlers(app: FastAPI) -> None:
    """Install all exception-to-response adapters on an application."""
    application_errors = (
        UploadTooLargeError,
        UnsupportedUploadFormatError,
        UploadReadError,
        ImageDimensionsExceeded,
        InvalidImageError,
        InferenceCapacityError,
        ModelNotReadyError,
        PatchExtractionError,
        InferenceExecutionError,
        HeatmapGenerationError,
    )
    for exception_type in application_errors:
        app.add_exception_handler(exception_type, application_error_handler)
    app.add_exception_handler(RequestValidationError, request_validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
